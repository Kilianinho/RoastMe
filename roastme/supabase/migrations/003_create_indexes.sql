-- =============================================================================
-- Migration 003: Performance indexes
-- =============================================================================

-- roast_sessions — filtering by roasted user is the hottest query path
CREATE INDEX idx_roast_sessions_roasted_user
  ON roast_sessions (roasted_user_id);

-- roast_sessions — filtering completed sessions per user (dashboard activity feed)
CREATE INDEX idx_roast_sessions_completed
  ON roast_sessions (roasted_user_id, is_completed);

-- roast_answers — joining answers to a session during aggregation
CREATE INDEX idx_roast_answers_session
  ON roast_answers (session_id);

-- roast_results — loading all results for a given profile (dashboard)
CREATE INDEX idx_roast_results_profile
  ON roast_results (profile_id);

-- matches — fetching matches where the user is party A
CREATE INDEX idx_matches_user_a
  ON matches (user_a_id);

-- matches — fetching matches where the user is party B
CREATE INDEX idx_matches_user_b
  ON matches (user_b_id);

-- match_actions — checking whether a user has already acted on a target
CREATE INDEX idx_match_actions_actor
  ON match_actions (actor_id);

-- messages — loading a conversation in chronological order
CREATE INDEX idx_messages_match
  ON messages (match_id, created_at);

-- notifications — unread notification badge count (partial index — small, fast)
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, is_read)
  WHERE is_read = FALSE;

-- blocks — checking whether the current user has blocked someone (outbound)
CREATE INDEX idx_blocks_blocker
  ON blocks (blocker_id);

-- blocks — checking whether the current user has been blocked (inbound lookup)
CREATE INDEX idx_blocks_blocked
  ON blocks (blocked_id);

-- profiles — resolving deep-link username to profile row
CREATE INDEX idx_profiles_username
  ON profiles (username);

-- profiles — filtering out soft-deleted accounts in all queries
CREATE INDEX idx_profiles_active
  ON profiles (id)
  WHERE deleted_at IS NULL;

-- profiles — batch matching: find profiles with stale or missing match computation
CREATE INDEX idx_profiles_match_computed
  ON profiles (last_match_computed_at)
  WHERE deleted_at IS NULL AND allow_matching = TRUE AND is_suspended = FALSE;

-- roast_results — matching algorithm: finding eligible profiles by question
-- (used in compute-matches to join result sets across profiles)
CREATE INDEX idx_roast_results_question
  ON roast_results (question_id);
