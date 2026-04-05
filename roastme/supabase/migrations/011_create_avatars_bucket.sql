-- Migration 011: Create avatars storage bucket and RLS policies
-- Run: supabase db push  (or apply via the Supabase dashboard)

-- Create the public avatars bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload to their own folder: avatars/{user_id}/...
CREATE POLICY "Avatar upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to replace (update) their own avatar
CREATE POLICY "Avatar update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone (including unauthenticated visitors) to read avatars
CREATE POLICY "Avatar public read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
