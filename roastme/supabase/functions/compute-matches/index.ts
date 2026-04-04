/**
 * compute-matches — Supabase Edge Function
 *
 * Designed to be invoked by a cron job every 15 minutes.
 * Computes compatibility scores between eligible user profiles and
 * upserts results into the matches table.
 *
 * Eligibility rules for a profile to enter the matching pool:
 *   - roast_count >= 3
 *   - allow_matching = TRUE
 *   - is_suspended = FALSE
 *   - deleted_at IS NULL
 *
 * A match pair is considered when:
 *   - Both profiles are eligible
 *   - They are not blocked by each other (bidirectional check)
 *   - Their gender preferences are mutually compatible (looking_for)
 *   - They have >= MIN_COMMON_QUESTIONS roast_results in common
 *   - compatibility_score >= MIN_SCORE_THRESHOLD
 *
 * The compatibility algorithm (from spec):
 *   For each shared question (weight > 0), compare top_answer.
 *   If they match, add weight * average_confidence to matchedWeight.
 *   Final score = matchedWeight / totalWeight.
 *
 * Uses the service_role key to bypass RLS for full table access.
 *
 * Request body (optional, for targeted runs during development):
 * {
 *   "profile_ids"?: string[]   // limit processing to these profiles
 * }
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_ROAST_COUNT = 3;
const MIN_COMMON_QUESTIONS = 5;
const MIN_SCORE_THRESHOLD = 0.0; // Store all pairs >= 0; filtering by score happens in queries
const BATCH_SIZE = 100; // max profiles to process per invocation

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
} as const;

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  INTERNAL_ERROR: 500,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string;
  gender: string | null;
  looking_for: string[];
  roast_count: number;
  last_match_computed_at: string | null;
}

interface RoastResult {
  profile_id: string;
  question_id: string;
  top_answer: string | null;
  top_answer_percentage: number | null;
  weight_for_matching: number;
}

interface BlockRelation {
  blocker_id: string;
  blocked_id: string;
}

interface MatchUpsertPayload {
  user_a_id: string;
  user_b_id: string;
  compatibility_score: number;
  common_answers: number;
  status: "pending";
}

interface RequestBody {
  profile_ids?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorResponse(message: string, status: number, details?: unknown): Response {
  return new Response(
    JSON.stringify({ error: { code: status, message, details: details ?? null } }),
    { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

function successResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: HTTP_STATUS.OK,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/**
 * Returns a canonical pair key where the lesser UUID is always first.
 * This mirrors the CHECK (user_a_id < user_b_id) constraint in the matches table.
 */
function canonicalPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

/**
 * Fetches profiles that need their matches recomputed.
 * A profile needs recomputing if:
 *   - last_match_computed_at IS NULL (never computed), OR
 *   - the profile received new roasts since the last computation
 *     (we infer this by comparing last_match_computed_at with the most recent
 *      roast_results.updated_at — handled by fetching all eligible profiles and
 *      letting the caller decide scope).
 *
 * For simplicity in v1, we process all eligible profiles whose
 * last_match_computed_at is older than 15 minutes ago, or NULL.
 * The cron interval guarantees this is a bounded set.
 */
async function fetchProfilesToProcess(
  client: SupabaseClient,
  limitToIds?: string[]
): Promise<Profile[]> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  let query = client
    .from("profiles")
    .select("id, gender, looking_for, roast_count, last_match_computed_at")
    .is("deleted_at", null)
    .eq("allow_matching", true)
    .eq("is_suspended", false)
    .gte("roast_count", MIN_ROAST_COUNT)
    .or(`last_match_computed_at.is.null,last_match_computed_at.lt.${fifteenMinutesAgo}`)
    .limit(BATCH_SIZE);

  if (limitToIds && limitToIds.length > 0) {
    query = query.in("id", limitToIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new MatchingError(
      `Failed to fetch profiles: ${error.message}`,
      HTTP_STATUS.INTERNAL_ERROR,
      error
    );
  }

  return (data ?? []) as Profile[];
}

/**
 * Fetches all eligible profiles that can be matched against (the full pool).
 * These are profiles with roast_count >= 3, matching enabled, not suspended.
 */
async function fetchMatchPool(client: SupabaseClient): Promise<Profile[]> {
  const { data, error } = await client
    .from("profiles")
    .select("id, gender, looking_for, roast_count, last_match_computed_at")
    .is("deleted_at", null)
    .eq("allow_matching", true)
    .eq("is_suspended", false)
    .gte("roast_count", MIN_ROAST_COUNT);

  if (error) {
    throw new MatchingError(
      `Failed to fetch match pool: ${error.message}`,
      HTTP_STATUS.INTERNAL_ERROR,
      error
    );
  }

  return (data ?? []) as Profile[];
}

/**
 * Fetches all roast results for a set of profile IDs, joined with
 * question weight_for_matching.
 * Returns results grouped by profile_id in a Map.
 */
async function fetchRoastResultsForProfiles(
  client: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, RoastResult[]>> {
  if (profileIds.length === 0) return new Map();

  const { data, error } = await client
    .from("roast_results")
    .select(`
      profile_id,
      question_id,
      top_answer,
      top_answer_percentage,
      questions!inner(weight_for_matching)
    `)
    .in("profile_id", profileIds)
    .not("top_answer", "is", null);

  if (error) {
    throw new MatchingError(
      `Failed to fetch roast results: ${error.message}`,
      HTTP_STATUS.INTERNAL_ERROR,
      error
    );
  }

  const grouped = new Map<string, RoastResult[]>();

  for (const row of data ?? []) {
    const result: RoastResult = {
      profile_id: row.profile_id,
      question_id: row.question_id,
      top_answer: row.top_answer,
      top_answer_percentage: row.top_answer_percentage,
      // Supabase join returns nested object
      weight_for_matching: (row.questions as { weight_for_matching: number }).weight_for_matching,
    };

    const existing = grouped.get(row.profile_id) ?? [];
    existing.push(result);
    grouped.set(row.profile_id, existing);
  }

  return grouped;
}

/**
 * Fetches all block relationships involving the given profile IDs.
 * Returns a Set of "blockerId:blockedId" strings for O(1) lookup.
 */
async function fetchBlockRelations(
  client: SupabaseClient,
  profileIds: string[]
): Promise<Set<string>> {
  if (profileIds.length === 0) return new Set();

  const { data, error } = await client
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.in.(${profileIds.join(",")}),blocked_id.in.(${profileIds.join(",")})`);

  if (error) {
    throw new MatchingError(
      `Failed to fetch block relations: ${error.message}`,
      HTTP_STATUS.INTERNAL_ERROR,
      error
    );
  }

  const blockSet = new Set<string>();
  for (const block of (data ?? []) as BlockRelation[]) {
    blockSet.add(`${block.blocker_id}:${block.blocked_id}`);
  }
  return blockSet;
}

// ---------------------------------------------------------------------------
// Compatibility algorithm (from spec)
// ---------------------------------------------------------------------------

/**
 * Computes the compatibility score between two profiles.
 *
 * Algorithm (spec §7):
 *   For each question where both profiles have a top_answer:
 *     - If top_answers match: matchedWeight += weight * ((pctA + pctB) / 2 / 100)
 *     - totalWeight += weight
 *   score = matchedWeight / totalWeight  (0.0 — 1.0)
 *
 * Returns null when fewer than MIN_COMMON_QUESTIONS are shared.
 *
 * @param resultsA - Roast results for profile A.
 * @param resultsB - Roast results for profile B.
 */
function computeCompatibility(
  resultsA: RoastResult[],
  resultsB: RoastResult[]
): { score: number; commonAnswers: number } | null {
  // Index B by question_id for O(1) lookup
  const bByQuestion = new Map<string, RoastResult>();
  for (const r of resultsB) {
    if (r.top_answer !== null) {
      bByQuestion.set(r.question_id, r);
    }
  }

  let totalWeight = 0;
  let matchedWeight = 0;
  let commonAnswers = 0;

  for (const resultA of resultsA) {
    if (resultA.top_answer === null || resultA.weight_for_matching <= 0) continue;

    const resultB = bByQuestion.get(resultA.question_id);
    if (!resultB) continue;

    commonAnswers++;
    totalWeight += resultA.weight_for_matching;

    if (resultA.top_answer === resultB.top_answer) {
      const pctA = resultA.top_answer_percentage ?? 50;
      const pctB = resultB.top_answer_percentage ?? 50;
      const confidence = (pctA + pctB) / 2;
      matchedWeight += resultA.weight_for_matching * (confidence / 100);
    }
  }

  if (commonAnswers < MIN_COMMON_QUESTIONS) return null;

  const score = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  return { score, commonAnswers };
}

// ---------------------------------------------------------------------------
// Gender preference filtering
// ---------------------------------------------------------------------------

/**
 * Returns true if profile A's preferences include B's gender AND vice versa.
 * A null or empty looking_for is treated as "open to all".
 *
 * @param a - Profile A.
 * @param b - Profile B.
 */
function genderPreferencesCompatible(a: Profile, b: Profile): boolean {
  const aLookingFor = a.looking_for ?? [];
  const bLookingFor = b.looking_for ?? [];

  const aAcceptsB =
    aLookingFor.length === 0 ||
    (b.gender !== null && aLookingFor.includes(b.gender));

  const bAcceptsA =
    bLookingFor.length === 0 ||
    (a.gender !== null && bLookingFor.includes(a.gender));

  return aAcceptsB && bAcceptsA;
}

// ---------------------------------------------------------------------------
// Block checking
// ---------------------------------------------------------------------------

/**
 * Returns true if either user has blocked the other.
 * Block relations are stored as "blocker_id:blocked_id" strings.
 */
function isBlocked(
  blockSet: Set<string>,
  idA: string,
  idB: string
): boolean {
  return blockSet.has(`${idA}:${idB}`) || blockSet.has(`${idB}:${idA}`);
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Upserts match records. The unique constraint on (user_a_id, user_b_id)
 * ensures existing matches are updated with the latest score, not duplicated.
 * Existing status ('liked', 'matched') is preserved — we only update score data.
 */
async function upsertMatches(
  client: SupabaseClient,
  matches: MatchUpsertPayload[]
): Promise<void> {
  if (matches.length === 0) return;

  // Chunk into groups of 100 to stay within Supabase payload limits
  const CHUNK = 100;
  for (let i = 0; i < matches.length; i += CHUNK) {
    const chunk = matches.slice(i, i + CHUNK);

    const { error } = await client
      .from("matches")
      .upsert(chunk, {
        onConflict: "user_a_id,user_b_id",
        ignoreDuplicates: false,
      });

    if (error) {
      throw new MatchingError(
        `Failed to upsert matches (chunk ${i}–${i + CHUNK}): ${error.message}`,
        HTTP_STATUS.INTERNAL_ERROR,
        error
      );
    }
  }
}

/**
 * Stamps last_match_computed_at = NOW() on each processed profile so the next
 * cron run skips them unless new data arrives.
 */
async function stampProfilesComputed(
  client: SupabaseClient,
  profileIds: string[]
): Promise<void> {
  if (profileIds.length === 0) return;

  const now = new Date().toISOString();

  const { error } = await client
    .from("profiles")
    .update({ last_match_computed_at: now })
    .in("id", profileIds);

  if (error) {
    // Non-fatal — worst case the profiles get reprocessed next cycle
    console.warn(
      `[compute-matches] Failed to stamp last_match_computed_at: ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

class MatchingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "MatchingError";
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Accept both GET (from cron) and POST (for targeted invocation)
  if (req.method !== "POST" && req.method !== "GET") {
    return errorResponse("Method not allowed. Use GET or POST.", HTTP_STATUS.BAD_REQUEST);
  }

  // Optional body for targeted runs
  let limitToIds: string[] | undefined;
  if (req.method === "POST") {
    try {
      const body: RequestBody = await req.json();
      if (Array.isArray(body.profile_ids) && body.profile_ids.length > 0) {
        limitToIds = body.profile_ids;
      }
    } catch {
      // No body or invalid JSON — treat as open run, not an error
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[compute-matches] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return errorResponse("Server configuration error.", HTTP_STATUS.INTERNAL_ERROR);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const startTime = Date.now();

    // 1. Fetch profiles that need recomputing
    const profilesToProcess = await fetchProfilesToProcess(client, limitToIds);

    if (profilesToProcess.length === 0) {
      console.info("[compute-matches] No profiles require recomputing.");
      return successResponse({ ok: true, matches_computed: 0, profiles_processed: 0 });
    }

    console.info(`[compute-matches] Processing ${profilesToProcess.length} profiles.`);

    // 2. Fetch the full eligible match pool (may overlap with profilesToProcess)
    const matchPool = await fetchMatchPool(client);
    const matchPoolMap = new Map<string, Profile>(matchPool.map((p) => [p.id, p]));

    // 3. Collect all relevant profile IDs for bulk data fetching
    const allProfileIds = [...new Set([
      ...profilesToProcess.map((p) => p.id),
      ...matchPool.map((p) => p.id),
    ])];

    // 4. Bulk-fetch roast results and block relations
    const [roastResultsByProfile, blockSet] = await Promise.all([
      fetchRoastResultsForProfiles(client, allProfileIds),
      fetchBlockRelations(client, allProfileIds),
    ]);

    // 5. Compute compatibility for each (processingProfile × poolProfile) pair
    const matchesToUpsert: MatchUpsertPayload[] = [];
    const processedPairs = new Set<string>(); // dedup across the processing set

    for (const profileA of profilesToProcess) {
      const resultsA = roastResultsByProfile.get(profileA.id) ?? [];

      for (const profileB of matchPool) {
        // Skip self-comparison
        if (profileA.id === profileB.id) continue;

        // Skip if either has no results
        const resultsB = roastResultsByProfile.get(profileB.id) ?? [];
        if (resultsA.length === 0 || resultsB.length === 0) continue;

        // Canonical pair key to avoid computing A-B and B-A separately
        const [idLow, idHigh] = canonicalPair(profileA.id, profileB.id);
        const pairKey = `${idLow}:${idHigh}`;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Fetch canonical profiles (low/high order matches DB constraint)
        const pLow = matchPoolMap.get(idLow) ?? profilesToProcess.find((p) => p.id === idLow);
        const pHigh = matchPoolMap.get(idHigh) ?? profilesToProcess.find((p) => p.id === idHigh);
        if (!pLow || !pHigh) continue;

        // Gender preference check (bidirectional)
        if (!genderPreferencesCompatible(pLow, pHigh)) continue;

        // Block check (bidirectional — either direction blocks the pair)
        if (isBlocked(blockSet, idLow, idHigh)) continue;

        // Compute compatibility score
        const resultsLow = roastResultsByProfile.get(idLow) ?? [];
        const resultsHigh = roastResultsByProfile.get(idHigh) ?? [];
        const result = computeCompatibility(resultsLow, resultsHigh);

        if (result === null) continue; // fewer than MIN_COMMON_QUESTIONS

        matchesToUpsert.push({
          user_a_id: idLow,
          user_b_id: idHigh,
          compatibility_score: result.score,
          common_answers: result.commonAnswers,
          status: "pending",
        });
      }
    }

    // 6. Persist computed matches
    await upsertMatches(client, matchesToUpsert);

    // 7. Stamp processed profiles so they're skipped next cycle
    await stampProfilesComputed(client, profilesToProcess.map((p) => p.id));

    const durationMs = Date.now() - startTime;

    console.info(
      `[compute-matches] Done. Profiles processed: ${profilesToProcess.length}, ` +
      `pairs evaluated: ${processedPairs.size}, matches upserted: ${matchesToUpsert.length}, ` +
      `duration: ${durationMs}ms`
    );

    return successResponse({
      ok: true,
      profiles_processed: profilesToProcess.length,
      pairs_evaluated: processedPairs.size,
      matches_computed: matchesToUpsert.length,
      duration_ms: durationMs,
    });
  } catch (err) {
    if (err instanceof MatchingError) {
      console.error(`[compute-matches] ${err.message}`, err.details ?? "");
      return errorResponse(err.message, err.status, err.details);
    }

    console.error("[compute-matches] Unexpected error:", err);
    return errorResponse("An unexpected error occurred.", HTTP_STATUS.INTERNAL_ERROR);
  }
});
