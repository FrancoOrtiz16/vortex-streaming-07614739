-- ============================================================================
-- MANTENIMIENTO PREVENTIVO Y CORRECTIVO - SINCRONIZACIÓN TOTAL
-- ============================================================================
-- Fecha: 2026-05-07
-- Acción: Sincronizar schema, RLS policies y caché PostgREST
-- 
-- INSTRUCCIONES:
-- 1. Copia TODO el contenido de este archivo
-- 2. Accede a tu proyecto en Supabase.com
-- 3. Ve a: SQL Editor → New query
-- 4. Pega el contenido completo
-- 5. Haz clic en "Run" (arriba a la derecha)
-- 6. Espera a que se complete
-- 7. Recarga la aplicación web en tu navegador
--
-- ============================================================================

-- 1. LIMPIEZA DE POLÍTICAS RLS ANTIGUAS/CONFLICTIVAS
-- ============================================================================
-- 1) Ensure table exists BEFORE dropping policies
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending_approval',
  last_renewal timestamp with time zone DEFAULT NULL,
  next_renewal timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS credential_email text,
  ADD COLUMN IF NOT EXISTS credential_password text,
  ADD COLUMN IF NOT EXISTS profile_name text,
  ADD COLUMN IF NOT EXISTS profile_pin text,
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30;

-- 2) Now it’s safe to drop policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_authenticated" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_modify_admin" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_users" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_users" ON public.subscriptions;

-- 3. CREAR NUEVAS POLÍTICAS RLS OPTIMIZADAS
-- ============================================================================
-- SELECT: Usuarios ven sus propias suscripciones, admins ven todas
CREATE POLICY "subscriptions_read"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- INSERT: permitir que usuarios autenticados creen sus propias filas (auth.uid() = user_id)
CREATE POLICY "subscriptions_insert_users"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: solo admins pueden modificar (mantener control administrativo)
CREATE POLICY "subscriptions_update_admin"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- DELETE: solo admins pueden eliminar
CREATE POLICY "subscriptions_delete_admin"
  ON public.subscriptions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. ASEGURAR QUE RLS ESTÉ HABILITADO
-- ============================================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. INVALIDAR CACHÉ DE POSTGREST
-- ============================================================================
-- Notificar a PostgREST que el schema ha cambiado
NOTIFY pgrst, 'reload schema';

-- 6. CONFIRMACIÓN (mejor para debugging)
-- ============================================================================
SELECT 
  'PostgreREST Cache Sync Complete' as status,
  now() as timestamp,
  current_database() as database,
  current_user as user;
