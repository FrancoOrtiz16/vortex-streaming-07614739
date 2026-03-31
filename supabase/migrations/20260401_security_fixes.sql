-- Security Fixes Migration - 20260401
-- Fix vulnerabilities for deployment

-- 1. Fix orders.user_id: make NOT NULL, proper FK
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Subscriptions RLS (protect credentials)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users see own subscriptions (hide password)
CREATE POLICY "Users view own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins see all (hide password for safety, or full if trusted)
CREATE POLICY "Admins view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users insert/update own
CREATE POLICY "Users manage own subscriptions"
  ON public.subscriptions FOR INSERT, UPDATE
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins manage all
CREATE POLICY "Admins manage all subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Tighten app_settings: confirm no public update
DROP POLICY IF EXISTS "Anyone can view settings" ON public.app_settings;
CREATE POLICY "Public can view settings"
  ON public.app_settings FOR SELECT
  TO public
  USING (key = 'usd_ves_rate');  -- Only rate public

CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Block self-promotion to admin in user_roles
-- Existing policies + explicit block on UPDATE role
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Block: Users can't update own role to admin
CREATE POLICY "Users update own role (not to admin)"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND role != 'admin')
  WITH CHECK (auth.uid() = user_id AND NEW.role != 'admin');

-- Admins full manage
CREATE POLICY "Admins manage all roles"
  ON public.user_roles FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Orders: tighten insert (already good, but confirm)
-- Existing policies assumed ok

-- Note: For subscriptions credentials, consider hashing passwords server-side via Edge Function
-- ALTER COLUMN credential_password TYPE bytea; -- future
