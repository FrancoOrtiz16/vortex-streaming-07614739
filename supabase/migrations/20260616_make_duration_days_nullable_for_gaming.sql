-- Make duration_days nullable for gaming_recharge products
ALTER TABLE public.subscriptions
ALTER COLUMN duration_days DROP NOT NULL;

COMMENT ON COLUMN public.subscriptions.duration_days IS 'Duración de la suscripción en días (NULL para gaming_recharge).';
