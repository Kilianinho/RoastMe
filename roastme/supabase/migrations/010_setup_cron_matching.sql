-- Migration 010: Set up pg_cron + pg_net to trigger compute-matches every 15 minutes.
--
-- Uses Supabase Vault to store the service_role key securely.
-- The key must already exist in vault with name 'service_role_key'.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Remove any pre-existing job with this name so the migration is idempotent.
SELECT cron.unschedule('compute-matches-every-15min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'compute-matches-every-15min'
);

SELECT cron.schedule(
  'compute-matches-every-15min',
  '*/15 * * * *',
  $$
  SELECT extensions.net.http_post(
    url     := 'https://hxnndjxqyyfxzxxagpoj.supabase.co/functions/v1/compute-matches',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);
