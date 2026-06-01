-- Allow authenticated users to insert/update their own subscriptions
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Remove any unique constraint that prevents repeated purchases of the same service
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_service_unique;
DROP INDEX IF EXISTS public.subscriptions_user_service_unique;

-- Ensure grants exist
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;