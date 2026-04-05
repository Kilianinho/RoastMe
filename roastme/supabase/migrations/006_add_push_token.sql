-- Add expo_push_token column to profiles table so the server can send
-- targeted push notifications via Expo's push service.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
