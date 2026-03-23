
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  last_renewal timestamp with time zone NOT NULL DEFAULT now(),
  next_renewal timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
