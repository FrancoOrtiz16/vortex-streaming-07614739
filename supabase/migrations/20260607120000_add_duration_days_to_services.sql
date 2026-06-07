ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS duration_days integer;

COMMENT ON COLUMN public.services.duration_days IS 'Duración de la suscripción en días para servicios de streaming; usada para calcular la fecha de vencimiento.';
