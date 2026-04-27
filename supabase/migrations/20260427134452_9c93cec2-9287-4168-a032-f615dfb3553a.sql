-- Enable extensions for scheduled jobs and HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add notification tracking columns
ALTER TABLE public.cars_in_yard
  ADD COLUMN IF NOT EXISTS notification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_error TEXT;

-- Index to quickly find due pending notifications
CREATE INDEX IF NOT EXISTS idx_cars_in_yard_pending_notifications
  ON public.cars_in_yard (scheduled_notification_time)
  WHERE notification_status = 'pending' AND scheduled_notification_time IS NOT NULL;