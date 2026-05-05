-- Make user_id nullable in subscriptions table to allow external clients
ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to handle null user_id for external clients
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;

-- Users can view own subscriptions (only if user_id is not null)
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));