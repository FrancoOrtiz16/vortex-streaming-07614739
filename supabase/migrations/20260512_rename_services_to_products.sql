-- Rename services table to products for consistency
-- This migration corrects the table name mismatch between code and database schema

-- First, drop the existing policies that reference the old table name
DROP POLICY IF EXISTS "Public can read products" ON public.services;
DROP POLICY IF EXISTS "Authenticated can manage products" ON public.services;

-- Rename the table
ALTER TABLE public.services RENAME TO products;

-- Update the RLS policies with the correct table name
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Recreate the policies (these were originally created for services table)
CREATE POLICY "Public can read products"
  ON public.products FOR SELECT
  TO public
  USING (is_available = true);

CREATE POLICY "Authenticated can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Update the realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;