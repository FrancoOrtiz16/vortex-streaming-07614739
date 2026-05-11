-- Fix RLS policies for subscriptions table to allow users to create subscriptions
-- Ensure INSERT is allowed for authenticated users with matching user_id
-- Admins have full access

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_authenticated" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_modify_admin" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_users" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_users" ON public.subscriptions;

-- SELECT: Users see own subscriptions, Admins see all (including null user_id)
CREATE POLICY "subscriptions_select"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- INSERT: Users can insert their own subscriptions, Admins can insert any
CREATE POLICY "subscriptions_insert"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- UPDATE: Users can update their own, Admins can update any
CREATE POLICY "subscriptions_update"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- DELETE: Users can delete their own, Admins can delete any
CREATE POLICY "subscriptions_delete"
  ON public.subscriptions FOR DELETE TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Force PostgREST cache refresh
NOTIFY pgrst, 'reload schema';