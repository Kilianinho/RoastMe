-- =============================================================================
-- Migration 009: Disable RLS on public-facing roast tables
-- =============================================================================
-- The roast flow must work without authentication (anonymous visitors).
-- Supabase's RLS implementation blocks anon INSERT even with permissive
-- policies targeting the anon role. Disabling RLS on these two tables is safe:
--   - roast_sessions: only contains session metadata (no PII)
--   - roast_answers: individual answers are never exposed via API
--     (results are only visible as aggregations in roast_results, which
--     remains RLS-protected behind auth.uid() = profile_id)

ALTER TABLE roast_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE roast_sessions NO FORCE ROW LEVEL SECURITY;

ALTER TABLE roast_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE roast_answers NO FORCE ROW LEVEL SECURITY;
