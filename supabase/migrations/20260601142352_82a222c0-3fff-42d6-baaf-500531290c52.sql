-- Add verificado column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT false;

-- Create payment_history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  receipt_url TEXT,
  method TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_history TO authenticated;
GRANT ALL ON public.payment_history TO service_role;

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history"
ON public.payment_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment history"
ON public.payment_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payment history"
ON public.payment_history FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
