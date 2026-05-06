ALTER TABLE public.subscriptions
  ADD COLUMN duration_days integer NOT NULL DEFAULT 30;

COMMENT ON COLUMN public.subscriptions.duration_days IS 'Duración de la suscripción en días; usada para calcular expiración y renovaciones automáticas.';
