export type Gender = 'male' | 'female' | 'other' | 'prefer_not';
export type QuestionCategory = 'personality' | 'survival' | 'chaos' | 'dating' | 'intelligence';
export type QuestionType = 'multiple_choice' | 'scale' | 'binary';
export type MatchStatus = 'pending' | 'liked' | 'matched' | 'passed';
export type MatchAction = 'like' | 'pass';
export type NotificationType = 'new_roast' | 'new_match' | 'new_message';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'fake_profile' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
export type ConsentType = 'terms' | 'privacy' | 'marketing' | 'analytics';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  gender: Gender | null;
  looking_for: Gender[];
  is_premium: boolean;
  is_suspended: boolean;
  roast_count: number;
  share_link: string | null;
  allow_matching: boolean;
  last_match_computed_at: string | null;
  /**
   * Expo push token registered for this device.
   * Written by useNotifications on first launch after permission grant.
   * Requires migration 002_add_expo_push_token.sql.
   */
  expo_push_token: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  type: QuestionType;
  options: QuestionOption[];
  locale: string;
  is_active: boolean;
  weight_for_matching: number;
  created_at: string;
}

export interface QuestionOption {
  label: string;
  value: string;
}

export interface RoastSession {
  id: string;
  roasted_user_id: string;
  roaster_session_id: string;
  roaster_user_id: string | null;
  roaster_gender: Gender | null;
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface RoastAnswer {
  id: string;
  session_id: string;
  question_id: string;
  answer_value: string;
  answer_label: string;
  created_at: string;
}

export interface RoastResult {
  id: string;
  profile_id: string;
  question_id: string;
  answer_distribution: Record<string, number>;
  total_responses: number;
  top_answer: string | null;
  top_answer_percentage: number | null;
  updated_at: string;
  question?: Question;
}

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  compatibility_score: number;
  common_answers: number;
  status: MatchStatus;
  created_at: string;
  other_user?: Profile;
}

export interface MatchActionRecord {
  id: string;
  actor_id: string;
  target_id: string;
  action: MatchAction;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_message_id: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewed_at: string | null;
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  granted: boolean;
  ip_address: string | null;
  granted_at: string;
  revoked_at: string | null;
}
