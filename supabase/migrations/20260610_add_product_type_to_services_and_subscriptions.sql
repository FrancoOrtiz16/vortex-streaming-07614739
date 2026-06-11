-- Add product_type column to services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'subscription';

COMMENT ON COLUMN public.services.product_type IS 
'Tipo de producto: "subscription" (suscripción recurrente) o "gaming_recharge" (recarga consumible de un solo uso)';

-- Add product_type column to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'subscription';

COMMENT ON COLUMN public.subscriptions.product_type IS 
'Tipo de producto: "subscription" (suscripción recurrente) o "gaming_recharge" (recarga consumible de un solo uso)';

-- Make start_date and end_date nullable for gaming recharges
ALTER TABLE public.subscriptions
ALTER COLUMN last_renewal DROP NOT NULL;

ALTER TABLE public.subscriptions
ALTER COLUMN next_renewal DROP NOT NULL;

-- Add index for faster filtering by product_type
CREATE INDEX IF NOT EXISTS subscriptions_product_type_idx ON public.subscriptions(product_type);
CREATE INDEX IF NOT EXISTS services_product_type_idx ON public.services(product_type);

-- Migrate existing data: products with category='gaming' should get product_type='gaming_recharge'
UPDATE public.services
SET product_type = 'gaming_recharge'
WHERE category = 'gaming';

-- Products with category='streaming' should get product_type='subscription' (already set as default)
-- No need for additional UPDATE since default is 'subscription'
