/**
 * aggregate-roast — Supabase Edge Function
 *
 * Triggered after a roast session is completed.
 * Aggregates all answers for the roasted user across all completed sessions,
 * updates roast_results (answer_distribution, total_responses, top_answer,
 * top_answer_percentage), and increments the roast_count on profiles.
 *
 * Uses the service_role key so it can bypass RLS when writing aggregated data
 * (roast_answers are never readable by the profile owner via RLS, but the
 * service role can read them for aggregation purposes).
 *
 * Expected request body:
 * {
 *   "roast_session_id": "<uuid>"
 * }
 *
 * Expected response (200 OK):
 * {
 *   "ok": true,
 *   "roasted_user_id": "<uuid>",
 *   "questions_aggregated": 10
 * }
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestBody {
  roast_session_id: string;
}

interface RoastAnswer {
  question_id: string;
  answer_value: string;
  answer_label: string;
}

interface RoastSession {
  id: string;
  roasted_user_id: string;
  is_completed: boolean;
}

interface AnswerDistribution {
  [value: string]: number;
}

interface AggregationResult {
  profile_id: string;
  question_id: string;
  answer_distribution: AnswerDistribution;
  total_responses: number;
  top_answer: string;
  top_answer_percentage: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
} as const;

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds an error JSON response with a consistent shape.
 * @param message - Human-readable error message.
 * @param status - HTTP status code.
 * @param details - Optional additional context.
 */
function errorResponse(
  message: string,
  status: number,
  details?: unknown
): Response {
  const body = JSON.stringify({
    error: { code: status, message, details: details ?? null },
  });
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/**
 * Builds a success JSON response.
 * @param data - Payload to serialise.
 */
function successResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: HTTP_STATUS.OK,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Core aggregation logic
// ---------------------------------------------------------------------------

/**
 * Fetches the session record and validates it exists and is completed.
 * @param client - Supabase service-role client.
 * @param sessionId - The roast_session_id from the request.
 * @throws When the session is not found or not completed.
 */
async function fetchCompletedSession(
  client: SupabaseClient,
  sessionId: string
): Promise<RoastSession> {
  const { data, error } = await client
    .from("roast_sessions")
    .select("id, roasted_user_id, is_completed")
    .eq("id", sessionId)
    .single();

  if (error || !data) {
    throw new AggregationError(
      `Session not found: ${sessionId}`,
      HTTP_STATUS.NOT_FOUND
    );
  }

  if (!data.is_completed) {
    throw new AggregationError(
      `Session ${sessionId} is not completed yet`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  return data as RoastSession;
}

/**
 * Fetches all answers for a specific roast session.
 * @param client - Supabase service-role client.
 * @param sessionId - The session whose answers to fetch.
 */
async function fetchSessionAnswers(
  client: SupabaseClient,
  sessionId: string
): Promise<RoastAnswer[]> {
  const { data, error } = await client
    .from("roast_answers")
    .select("question_id, answer_value, answer_label")
    .eq("session_id", sessionId);

  if (error) {
    throw new AggregationError(
      `Failed to fetch answers for session ${sessionId}: ${error.message}`,
      HTTP_STATUS.INTERNAL_ERROR,
      error
    );
  }

  return (data ?? []) as RoastAnswer[];
}

/**
 * Fetches all existing aggregated results for the given profile.
 * Returns a map of question_id -> current result record.
 * @param client - Supabase service-role client.
 * @param profileId - The roasted user's profile id.
 */
async function fetchExistingResults(
  client: SupabaseClient,
  profileId: string
): Promise<Map<string, AggregationResult>> {
  const { data, error } = await client
    .from("roast_results")
    .select("profile_id, question_id, answer_distribution, total_responses, top_answer, top_answer_percentage")
    .eq("profile_id", profileId);

  if (error) {
    throw new AggregationError(
      `Failed to fetch existing results for profile ${profileId}: ${error.message}`,
      HTTP_STATUS.INTERNAL_ERROR,
      error
    );
  }

  const resultMap = new Map<string, AggregationResult>();
  for (const row of data ?? []) {
    resultMap.set(row.question_id, row as AggregationResult);
  }
  return resultMap;
}

/**
 * Merges new answers from a session into the existing distribution map and
 * computes updated aggregation statistics.
 *
 * @param profileId - The roasted user's id.
 * @param newAnswers - Answers from the just-completed session.
 * @param existingResults - Current state from roast_results table.
 * @returns Updated upsert payloads for the roast_results table.
 */
function computeUpdatedResults(
  profileId: string,
  newAnswers: RoastAnswer[],
  existingResults: Map<string, AggregationResult>
): AggregationResult[] {
  const updatedResults: AggregationResult[] = [];

  for (const answer of newAnswers) {
    const existing = existingResults.get(answer.question_id);

    // Start from the existing distribution or an empty one
    const distribution: AnswerDistribution = existing
      ? { ...existing.answer_distribution }
      : {};

    // Increment (or initialise) the count for this answer value
    distribution[answer.answer_value] = (distribution[answer.answer_value] ?? 0) + 1;

    const totalResponses = Object.values(distribution).reduce((sum, count) => sum + count, 0);

    // Determine the dominant answer
    const topEntry = Object.entries(distribution).reduce<[string, number]>(
      (best, [value, count]) => (count > best[1] ? [value, count] : best),
      ["", 0]
    );

    const topAnswer = topEntry[0];
    const topAnswerPercentage = totalResponses > 0
      ? (topEntry[1] / totalResponses) * 100
      : 0;

    updatedResults.push({
      profile_id: profileId,
      question_id: answer.question_id,
      answer_distribution: distribution,
      total_responses: totalResponses,
      top_answer: topAnswer,
      top_answer_percentage: topAnswerPercentage,
    });
  }

  return updatedResults;
}

/**
 * Persists the updated aggregation results via upsert.
 * @param client - Supabase service-role client.
 * @param results - Array of upsert payloads.
 */
async function persistResults(
  client: SupabaseClient,
  results: AggregationResult[]
): Promise<void> {
  if (results.length === 0) return;

  const { error } = await client
    .from("roast_results")
    .upsert(
      results.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
      { onConflict: "profile_id,question_id" }
    );

  if (error) {
    throw new AggregationError(
      `Failed to upsert roast_results: ${error.message}`,
      HTTP_STATUS.INTERNAL_ERROR,
      error
    );
  }
}

/**
 * Increments roast_count on the profiles table using a raw RPC to avoid
 * read-modify-write races. Falls back to a select+update if the RPC is not
 * available.
 * @param client - Supabase service-role client.
 * @param profileId - The profile to increment.
 */
async function incrementRoastCount(
  client: SupabaseClient,
  profileId: string
): Promise<void> {
  // Use a raw SQL expression via rpc for atomic increment
  const { error } = await client.rpc("increment_roast_count", {
    p_profile_id: profileId,
  });

  if (error) {
    // Fallback: non-atomic increment (acceptable for v1 — low concurrency)
    console.warn(
      `[aggregate-roast] increment_roast_count RPC unavailable, using fallback: ${error.message}`
    );

    const { data: profile, error: fetchError } = await client
      .from("profiles")
      .select("roast_count")
      .eq("id", profileId)
      .single();

    if (fetchError || !profile) {
      throw new AggregationError(
        `Failed to fetch profile for roast_count increment: ${fetchError?.message ?? "not found"}`,
        HTTP_STATUS.INTERNAL_ERROR,
        fetchError
      );
    }

    const { error: updateError } = await client
      .from("profiles")
      .update({ roast_count: (profile.roast_count ?? 0) + 1 })
      .eq("id", profileId);

    if (updateError) {
      throw new AggregationError(
        `Failed to increment roast_count: ${updateError.message}`,
        HTTP_STATUS.INTERNAL_ERROR,
        updateError
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

class AggregationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AggregationError";
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", HTTP_STATUS.BAD_REQUEST);
  }

  // Parse and validate request body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body.", HTTP_STATUS.BAD_REQUEST);
  }

  const { roast_session_id } = body;

  if (!roast_session_id || typeof roast_session_id !== "string") {
    return errorResponse(
      "Missing required field: roast_session_id",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Validate UUID format
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(roast_session_id)) {
    return errorResponse(
      "Invalid roast_session_id format. Must be a UUID.",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Build service-role client — bypasses RLS
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[aggregate-roast] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    return errorResponse(
      "Server configuration error.",
      HTTP_STATUS.INTERNAL_ERROR
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // 1. Validate the session
    const session = await fetchCompletedSession(client, roast_session_id);
    const { roasted_user_id: profileId } = session;

    // 2. Fetch what was answered in this session
    const newAnswers = await fetchSessionAnswers(client, roast_session_id);

    if (newAnswers.length === 0) {
      console.warn(`[aggregate-roast] Session ${roast_session_id} has no answers.`);
      return successResponse({
        ok: true,
        roasted_user_id: profileId,
        questions_aggregated: 0,
      });
    }

    // 3. Load current aggregated results for this profile
    const existingResults = await fetchExistingResults(client, profileId);

    // 4. Compute the updated distributions in memory
    const updatedResults = computeUpdatedResults(profileId, newAnswers, existingResults);

    // 5. Persist the updated aggregations
    await persistResults(client, updatedResults);

    // 6. Increment the profile's roast counter
    await incrementRoastCount(client, profileId);

    console.info(
      `[aggregate-roast] Session ${roast_session_id}: aggregated ${updatedResults.length} questions for profile ${profileId}`
    );

    return successResponse({
      ok: true,
      roasted_user_id: profileId,
      questions_aggregated: updatedResults.length,
    });
  } catch (err) {
    if (err instanceof AggregationError) {
      console.error(`[aggregate-roast] ${err.message}`, err.details ?? "");
      return errorResponse(err.message, err.status, err.details);
    }

    // Unexpected error — log full details server-side, return generic message
    console.error("[aggregate-roast] Unexpected error:", err);
    return errorResponse(
      "An unexpected error occurred.",
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
});
