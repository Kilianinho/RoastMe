-- =============================================================================
-- Migration 008: Fix RLS policies to explicitly allow anon role
-- =============================================================================
-- The existing INSERT policies use WITH CHECK (true) but don't specify TO,
-- which should apply to PUBLIC. However, Supabase may require explicit
-- policies for the anon role. Re-create them targeting both anon and authenticated.

-- Drop and recreate roast_sessions INSERT policy
DROP POLICY IF EXISTS "Anyone can create roast session" ON roast_sessions;
CREATE POLICY "Anyone can create roast session"
  ON roast_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also allow anon to UPDATE roast_sessions (mark as completed)
CREATE POLICY "Anyone can update roast session"
  ON roast_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Drop and recreate roast_answers INSERT policy
DROP POLICY IF EXISTS "Anyone can submit answers" ON roast_answers;
CREATE POLICY "Anyone can submit answers"
  ON roast_answers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure profiles SELECT works for anon
DROP POLICY IF EXISTS "Public profiles viewable" ON profiles;
CREATE POLICY "Public profiles viewable"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

-- Ensure questions SELECT works for anon
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active questions"
  ON questions FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
