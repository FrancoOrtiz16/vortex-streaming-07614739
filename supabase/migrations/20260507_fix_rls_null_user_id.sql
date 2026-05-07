-- Fix RLS policies to handle null user_id in subscriptions
-- This allows admins to read all subscriptions, including external clients with null user_id

-- Drop existing policies that block null user_id reads
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins view all subscriptions" ON public.subscriptions;

-- Create new policies that handle null user_id correctly for external clients
-- Users can view their own subscriptions (when user_id is not null and matches auth.uid())
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- Admins can view ALL subscriptions (including external clients with null user_id)
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can insert/update/delete all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can insert/update own subscriptions (when user_id matches)
CREATE POLICY "Users can manage own subscriptions"
ON public.subscriptions FOR INSERT, UPDATE, DELETE TO authenticated
WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
