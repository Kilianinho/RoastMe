-- Atomic increment for roast_count (race-safe)
-- Called by the aggregate-roast Edge Function
CREATE OR REPLACE FUNCTION increment_roast_count(p_profile_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET roast_count = roast_count + 1
  WHERE id = p_profile_id;
$$;
