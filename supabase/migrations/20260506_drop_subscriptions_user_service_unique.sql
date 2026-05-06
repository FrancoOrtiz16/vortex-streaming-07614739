-- Drop unique constraint preventing multiple subscriptions of the same service for a single user
-- This migration is required to allow unlimited duplicate service purchases per user.

ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_service_unique;

-- In case the constraint was backed by a unique index with the same name
DROP INDEX IF EXISTS subscriptions_user_service_unique;
