-- =============================================================================
-- Migration 002: Enable Row Level Security on all tables + create all policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- Public read (needed for the roast deep-link page to resolve a username).
-- Writes restricted to the owning user.
-- No INSERT policy: profile creation is handled server-side via a trigger
-- that fires after auth.users insertion.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles viewable"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- roast_sessions
-- The roasted user can read their own sessions (to count roasts, see activity).
-- INSERT is open to everyone including anonymous users — the public roast page
-- must be able to create a session without requiring login.
-- ---------------------------------------------------------------------------
ALTER TABLE roast_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner sees own roast sessions"
  ON roast_sessions FOR SELECT
  USING (auth.uid() = roasted_user_id);

CREATE POLICY "Anyone can create roast session"
  ON roast_sessions FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- roast_answers
-- Answers are never exposed directly to the roasted user — only aggregations
-- are accessible. SELECT is permanently denied at the policy level.
-- INSERT is open to everyone (anonymous roasters included).
-- ---------------------------------------------------------------------------
ALTER TABLE roast_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to answers"
  ON roast_answers FOR SELECT
  USING (false);

CREATE POLICY "Anyone can submit answers"
  ON roast_answers FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- roast_results
-- Only the profile owner can read their aggregated results.
-- Writes are performed exclusively by the aggregate-roast Edge Function
-- using the service_role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE roast_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner sees own results"
  ON roast_results FOR SELECT
  USING (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- matches
-- Both parties of a match can read the match record.
-- Writes are handled by the compute-matches Edge Function (service_role).
-- ---------------------------------------------------------------------------
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match parties can see match"
  ON matches FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- ---------------------------------------------------------------------------
-- match_actions
-- Users can insert their own like/pass decisions.
-- Users can read their own actions (e.g., to know if they already acted).
-- ---------------------------------------------------------------------------
ALTER TABLE match_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own match actions"
  ON match_actions FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Users see own match actions"
  ON match_actions FOR SELECT
  USING (auth.uid() = actor_id);

-- ---------------------------------------------------------------------------
-- messages
-- Both participants in a match can read all messages in that match.
-- Only the sender can insert a message, and only into a match they belong to.
-- ---------------------------------------------------------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match parties can see messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
        AND (auth.uid() = matches.user_a_id OR auth.uid() = matches.user_b_id)
    )
  );

CREATE POLICY "Match parties can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
        AND (auth.uid() = matches.user_a_id OR auth.uid() = matches.user_b_id)
    )
  );

-- ---------------------------------------------------------------------------
-- notifications
-- Users can read their own notifications and mark them read.
-- Writes are performed by Edge Functions or server-side triggers (service_role).
-- ---------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reports
-- Users can file reports and read reports they submitted.
-- Updates (status, reviewed_at) are performed by admin/service_role only.
-- ---------------------------------------------------------------------------
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users see own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- blocks
-- Users manage their own block list (all operations: insert, select, delete).
-- The blocked user is never notified — this is intentionally silent.
-- ---------------------------------------------------------------------------
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks"
  ON blocks FOR ALL
  USING (auth.uid() = blocker_id);

-- ---------------------------------------------------------------------------
-- user_consents
-- Users manage their own consent records (insert, select, update for revocation).
-- ---------------------------------------------------------------------------
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own consents"
  ON user_consents FOR ALL
  USING (auth.uid() = user_id);
