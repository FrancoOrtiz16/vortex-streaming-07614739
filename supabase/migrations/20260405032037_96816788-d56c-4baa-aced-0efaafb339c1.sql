
-- Remove duplicate subscriptions keeping only the most recent per user+service
DELETE FROM public.subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, service_name) id
  FROM public.subscriptions
  ORDER BY user_id, service_name, updated_at DESC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_service_unique UNIQUE (user_id, service_name);
