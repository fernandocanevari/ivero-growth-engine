CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old job if it exists (idempotent re-run)
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'monitor-llms-txt-daily';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'monitor-llms-txt-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://klscginkmflwanzjxtqy.supabase.co/functions/v1/monitor-llms-txt',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsc2NnaW5rbWZsd2Fuemp4dHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Mjg1NjQsImV4cCI6MjA4NzIwNDU2NH0.87uyNai3ajVct2TfVpHy9o1hEP5dhHmLeRaidOfKRXY"}'::jsonb,
    body := concat('{"scheduled_at":"', now(), '"}')::jsonb
  );
  $$
);