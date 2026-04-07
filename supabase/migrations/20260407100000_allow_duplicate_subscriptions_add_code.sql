-- Allow multiple subscriptions per user and service, and add stable subscription codes.
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_service_unique;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS subscription_code text;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_subscription_code_key ON public.subscriptions(subscription_code);

WITH numbered AS (
  SELECT
    id,
    service_name,
    row_number() OVER (PARTITION BY user_id, service_name ORDER BY created_at) AS rn,
    left(regexp_replace(upper(service_name), '[^A-Z0-9]', '', 'g') || 'XXXX', 4) AS prefix
  FROM public.subscriptions
  WHERE subscription_code IS NULL
)
UPDATE public.subscriptions s
SET subscription_code = concat('VORTEX-', n.prefix, '-', lpad(n.rn::text, 3, '0'))
FROM numbered n
WHERE s.id = n.id;
