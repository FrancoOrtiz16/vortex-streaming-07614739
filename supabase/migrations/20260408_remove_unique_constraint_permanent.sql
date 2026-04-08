-- Permanently remove unique constraint to allow multiple subscriptions per user and service
-- This migration ensures users can have multiple subscriptions of the same service (e.g., multiple Netflix profiles)

-- Drop the conflicting unique constraint if it exists
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_service_unique;

-- Ensure we have credential columns for storing service account details
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS credential_email text,
ADD COLUMN IF NOT EXISTS credential_password text,
ADD COLUMN IF NOT EXISTS profile_name text,
ADD COLUMN IF NOT EXISTS profile_pin text,
ADD COLUMN IF NOT EXISTS combo_id uuid;

-- Create an index on combo_id for efficient grouping
CREATE INDEX IF NOT EXISTS idx_subscriptions_combo_id ON public.subscriptions(combo_id);

-- Verify Realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
