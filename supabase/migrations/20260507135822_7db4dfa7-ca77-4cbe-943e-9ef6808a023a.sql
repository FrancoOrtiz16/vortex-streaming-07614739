-- Add subscription_code column if missing
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS subscription_code text;

-- Add duration_days column if missing
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30;

-- Backfill existing rows with a unique code
UPDATE public.subscriptions
SET subscription_code = 'VORTEX-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12))
WHERE subscription_code IS NULL;

-- Ensure uniqueness of subscription_code
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_subscription_code_key
  ON public.subscriptions (subscription_code);

-- Drop legacy unique constraint that blocked multi-instance
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_service_unique;

DROP INDEX IF EXISTS public.subscriptions_user_service_unique;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';