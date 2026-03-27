
-- Add credential fields to subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS credential_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS credential_password text DEFAULT NULL;

-- Create app_settings table for exchange rate and other configs
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view settings"
  ON public.app_settings FOR SELECT
  TO public
  USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default exchange rate
INSERT INTO public.app_settings (key, value)
VALUES ('usd_ves_rate', '95.00')
ON CONFLICT (key) DO NOTHING;
