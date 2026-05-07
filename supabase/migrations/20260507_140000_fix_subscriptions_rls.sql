-- Fix RLS policies to handle null user_id in subscriptions table
-- Issue: Policies were blocking admin reads of subscriptions with null user_id (external clients)
-- Solution: Update policies to allow admins full access regardless of user_id value

-- Drop all existing subscription policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins view all subscriptions" ON public.subscriptions;

-- SELECT: Users see own subscriptions, Admins see all
CREATE POLICY "subscriptions_select_authenticated"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- INSERT/UPDATE/DELETE: Admins can do everything
CREATE POLICY "subscriptions_modify_admin"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- INSERT/UPDATE: Users can only modify their own
CREATE POLICY "subscriptions_insert_users"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "subscriptions_update_users"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (user_id IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

-- Force PostgREST cache refresh
NOTIFY pgrst, 'reload schema';
