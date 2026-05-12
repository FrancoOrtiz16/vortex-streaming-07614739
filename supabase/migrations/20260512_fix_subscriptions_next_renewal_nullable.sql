-- Fix subscriptions schema to allow pending approval records without next_renewal
-- Root cause: the code intentionally creates pending subscriptions with next_renewal = NULL,
-- but the database constraint was still rejecting NULL values.

BEGIN;

ALTER TABLE public.subscriptions ALTER COLUMN next_renewal DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN next_renewal DROP DEFAULT;
ALTER TABLE public.subscriptions ALTER COLUMN last_renewal DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN last_renewal DROP DEFAULT;

-- Ensure pending approval records are normalized
UPDATE public.subscriptions
SET next_renewal = NULL
WHERE status = 'pending_approval'
  AND next_renewal IS NOT NULL;

UPDATE public.subscriptions
SET last_renewal = NULL
WHERE status = 'pending_approval'
  AND last_renewal IS NOT NULL;

COMMIT;
