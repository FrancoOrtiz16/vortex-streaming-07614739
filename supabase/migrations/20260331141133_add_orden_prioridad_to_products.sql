-- Add orden_prioridad to products (or services) table if not exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'products'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN IF NOT EXISTS orden_prioridad integer DEFAULT 999;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'services'
  ) THEN
    ALTER TABLE public.services
      ADD COLUMN IF NOT EXISTS orden_prioridad integer DEFAULT 999;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'products'
  ) THEN
    DROP POLICY IF EXISTS "Public can read products" ON public.products;
    CREATE POLICY "Public can read products"
      ON public.products FOR SELECT
      TO public
      USING (is_available = true);

    DROP POLICY IF EXISTS "Authenticated can manage products" ON public.products;
    CREATE POLICY "Authenticated can manage products"
      ON public.products FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'services'
  ) THEN
    DROP POLICY IF EXISTS "Public can read products" ON public.services;
    CREATE POLICY "Public can read products"
      ON public.services FOR SELECT
      TO public
      USING (is_available = true);

    DROP POLICY IF EXISTS "Authenticated can manage products" ON public.services;
    CREATE POLICY "Authenticated can manage products"
      ON public.services FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END
$$;

