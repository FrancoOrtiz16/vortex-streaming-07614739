-- Add product_type column to services table
-- product_type: 'subscription' (monthly recurring) | 'gaming_recharge' (one-time consumable)
ALTER TABLE public.services
ADD COLUMN product_type text NOT NULL DEFAULT 'subscription';

COMMENT ON COLUMN public.services.product_type IS 'Tipo de producto: ''subscription'' para suscripciones mensuales recurrentes; ''gaming_recharge'' para recargas de juegos (one-time consumable).';

-- Add product_type column to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN product_type text NOT NULL DEFAULT 'subscription';

COMMENT ON COLUMN public.subscriptions.product_type IS 'Tipo de producto asociado: ''subscription'' para suscripciones recurrentes; ''gaming_recharge'' para recargas de un solo uso.';
