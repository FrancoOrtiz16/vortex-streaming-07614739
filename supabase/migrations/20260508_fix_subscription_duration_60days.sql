-- Fix subscription durations: ensure all subscriptions have 30 days exactly
-- This migration corrects suscriptions that were created with 60-day cycles

-- Step 1: Update all subscriptions to have exactly 30 days duration
UPDATE public.subscriptions
SET duration_days = 30
WHERE duration_days != 30;

-- Step 2: Pendings no deben recibir next_renewal automático.
-- El tiempo de servicio solo comienza cuando el admin aprueba manualmente.
-- UPDATE public.subscriptions
-- SET next_renewal = created_at + interval '30 days'
-- WHERE status IN ('pending_approval', 'procesando_credenciales')
--   AND next_renewal IS NOT NULL;

-- Step 3: For active and confirmed subscriptions, keep their renewal dates but ensure they're reasonable
-- (within 30-60 days from their last_renewal date)
UPDATE public.subscriptions
SET next_renewal = last_renewal + interval '30 days'
WHERE status IN ('active', 'confirmed')
  AND (next_renewal < (last_renewal + interval '25 days') 
    OR next_renewal > (last_renewal + interval '60 days'))
  AND last_renewal IS NOT NULL;

-- Confirmation log
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.subscriptions
  WHERE duration_days = 30;
  
  RAISE NOTICE 'Fixed subscription durations: % subscriptions are now set to 30 days', updated_count;
END $$;

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
