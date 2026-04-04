-- =============================================================================
-- Migration 001: Create all tables
-- RoastMe — Initial schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- Extends auth.users. One row per registered user.
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username              TEXT        UNIQUE NOT NULL,
  display_name          TEXT        NOT NULL,
  avatar_url            TEXT,
  bio                   TEXT,
  gender                TEXT        CHECK (gender IN ('male', 'female', 'other', 'prefer_not')),
  looking_for           TEXT[]      DEFAULT '{}',
  is_premium            BOOLEAN     DEFAULT FALSE,
  is_suspended          BOOLEAN     DEFAULT FALSE,
  roast_count           INTEGER     DEFAULT 0,
  share_link            TEXT        UNIQUE,
  allow_matching        BOOLEAN     DEFAULT TRUE,
  last_match_computed_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- questions
-- Pre-authored question bank (multiple locales).
-- ---------------------------------------------------------------------------
CREATE TABLE questions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text               TEXT        NOT NULL,
  category           TEXT        NOT NULL
                       CHECK (category IN ('personality', 'survival', 'chaos', 'dating', 'intelligence')),
  type               TEXT        NOT NULL
                       CHECK (type IN ('multiple_choice', 'scale', 'binary')),
  options            JSONB,
  locale             TEXT        DEFAULT 'fr',
  is_active          BOOLEAN     DEFAULT TRUE,
  weight_for_matching FLOAT      DEFAULT 1.0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- roast_sessions
-- One session = one person answering all questions about a roasted user.
-- roaster_session_id is an anonymous client-side UUID (AsyncStorage).
-- ---------------------------------------------------------------------------
CREATE TABLE roast_sessions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  roasted_user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  roaster_session_id UUID        NOT NULL,
  roaster_user_id    UUID        REFERENCES profiles(id),
  roaster_gender     TEXT,
  is_completed       BOOLEAN     DEFAULT FALSE,
  started_at         TIMESTAMPTZ DEFAULT NOW(),
  completed_at       TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- roast_answers
-- Individual question answers inside a session.
-- Never exposed directly to the roasted user — only aggregations are visible.
-- ---------------------------------------------------------------------------
CREATE TABLE roast_answers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES roast_sessions(id) ON DELETE CASCADE,
  question_id   UUID        NOT NULL REFERENCES questions(id),
  answer_value  TEXT        NOT NULL,
  answer_label  TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

-- ---------------------------------------------------------------------------
-- roast_results
-- Aggregated answer distributions per (profile, question).
-- Computed by the aggregate-roast Edge Function after each completed session.
-- ---------------------------------------------------------------------------
CREATE TABLE roast_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id           UUID        NOT NULL REFERENCES questions(id),
  answer_distribution   JSONB       NOT NULL,
  total_responses       INTEGER     NOT NULL,
  top_answer            TEXT,
  top_answer_percentage FLOAT,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, question_id)
);

-- ---------------------------------------------------------------------------
-- matches
-- Compatibility pairs computed by the compute-matches Edge Function.
-- Constraint user_a_id < user_b_id enforces canonical ordering and prevents
-- duplicate pairs in both directions.
-- ---------------------------------------------------------------------------
CREATE TABLE matches (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  compatibility_score FLOAT       NOT NULL CHECK (compatibility_score >= 0.0 AND compatibility_score <= 1.0),
  common_answers      INTEGER     NOT NULL,
  status              TEXT        DEFAULT 'pending'
                        CHECK (status IN ('pending', 'liked', 'matched', 'passed')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);

-- ---------------------------------------------------------------------------
-- match_actions
-- Individual like/pass decisions by a user on another user.
-- A mutual like triggers status='matched' on the corresponding matches row.
-- ---------------------------------------------------------------------------
CREATE TABLE match_actions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action     TEXT        NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (actor_id, target_id)
);

-- ---------------------------------------------------------------------------
-- messages
-- Chat messages between two matched users.
-- Only accessible when a confirmed match exists.
-- ---------------------------------------------------------------------------
CREATE TABLE messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  is_read    BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- notifications
-- In-app notification records (push delivery handled separately via Expo).
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL
               CHECK (type IN ('new_roast', 'new_match', 'new_message')),
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  data       JSONB       DEFAULT '{}',
  is_read    BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- reports
-- User-submitted moderation reports.
-- reported_message_id is nullable — a report can target a profile or a message.
-- ---------------------------------------------------------------------------
CREATE TABLE reports (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id    UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  reported_message_id UUID        REFERENCES messages(id) ON DELETE SET NULL,
  reason              TEXT        NOT NULL
                        CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'fake_profile', 'other')),
  description         TEXT,
  status              TEXT        DEFAULT 'pending'
                        CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- blocks
-- Unidirectional user blocks. A blocked user is silently excluded from
-- roasting, matching, and messaging the blocker.
-- ---------------------------------------------------------------------------
CREATE TABLE blocks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

-- ---------------------------------------------------------------------------
-- user_consents
-- GDPR/CNIL consent records. One row per (user, consent_type).
-- ip_address stored for compliance audit trail (retained 7 days per policy).
-- ---------------------------------------------------------------------------
CREATE TABLE user_consents (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type TEXT        NOT NULL
                 CHECK (consent_type IN ('terms', 'privacy', 'marketing', 'analytics')),
  granted      BOOLEAN     NOT NULL DEFAULT FALSE,
  ip_address   INET,
  granted_at   TIMESTAMPTZ DEFAULT NOW(),
  revoked_at   TIMESTAMPTZ,
  UNIQUE (user_id, consent_type)
);
