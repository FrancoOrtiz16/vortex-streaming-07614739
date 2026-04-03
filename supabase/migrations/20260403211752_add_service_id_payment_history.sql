-- Migration: Add service_id FK + unique constraint to subscriptions, create payment_history
-- 20260403211752

BEGIN;

-- Add service_id to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS service_id uuid,
ADD CONSTRAINT fk_subscriptions_service_id 
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

-- Populate service_id from service_name (one-time migration)
UPDATE public.subscriptions s 
SET service_id = (
  SELECT id FROM public.services ser 
  WHERE LOWER(ser.name) = LOWER(s.service_name) 
  LIMIT 1
) 
WHERE s.service_id IS NULL AND s.service_name IS NOT NULL;

-- Add unique constraint (ignore existing dups for now, or handle)
ALTER TABLE public.subscriptions 
ADD CONSTRAINT unique_user_service UNIQUE (user_id, service_id);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_date timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'confirmed', 'failed', 'cancelled')),
  receipt_url text,
  method text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_history_updated_at
  BEFORE UPDATE ON public.payment_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history" 
  ON public.payment_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment history" 
  ON public.payment_history FOR INSERT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payment history"
  ON public.payment_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

COMMIT;

