-- Migration: Add profiles and payment_history to the Supabase realtime publication
-- 20260517

BEGIN;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_history;

COMMIT;
