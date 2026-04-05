-- =============================================================================
-- Migration 007: Grant anon role access for public roast flow
-- =============================================================================
-- The public roast page must work without authentication. Supabase RLS policies
-- define row-level rules, but the anon role also needs table-level GRANT
-- permissions to access the tables at all.

-- Profiles: anon can read (resolve username on roast page)
GRANT SELECT ON profiles TO anon;

-- Questions: anon can read (fetch questions for the roast flow)
GRANT SELECT ON questions TO anon;

-- Roast sessions: anon can insert (create session) and update (mark completed)
GRANT INSERT, UPDATE ON roast_sessions TO anon;

-- Roast answers: anon can insert (submit answers)
GRANT INSERT ON roast_answers TO anon;
