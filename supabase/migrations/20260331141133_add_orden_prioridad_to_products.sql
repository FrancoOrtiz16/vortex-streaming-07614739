-- Add orden_prioridad to products table if not exists
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS orden_prioridad integer DEFAULT 999;

-- Ensure RLS allows reading products
CREATE POLICY "Public can read products" 
ON public.products FOR SELECT 
TO public 
USING (is_available = true);

-- Authenticated can manage products
CREATE POLICY "Authenticated can manage products"
ON public.products FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

