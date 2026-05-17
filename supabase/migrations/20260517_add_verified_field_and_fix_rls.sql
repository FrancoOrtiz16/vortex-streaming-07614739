-- Migration: Add 'verificado' field to profiles and fix RLS policies
-- Purpose: Enable admin approval workflow for customer verification

-- ============================================================================
-- Step 1: Add 'verificado' field to profiles table
-- ============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verificado boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.verificado IS 'Admin-controlled flag indicating customer has been verified/approved for payment processing';

-- ============================================================================
-- Step 2: Fix RLS Policies for subscriptions table
-- ============================================================================

-- Drop existing problematic policies (if they exist)
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;

-- ============================================================================
-- New RLS Policies for subscriptions
-- ============================================================================

-- 1. INSERT Policy: Allow authenticated users to insert their own subscriptions
-- This enables checkout flow without RLS blocking
CREATE POLICY "Authenticated users can insert own subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- 2. UPDATE Policy: Allow users to update their own subscriptions (for renewals)
-- This enables renewal process without RLS restriction errors
CREATE POLICY "Users can update own subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- 3. SELECT Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  user_id IS NOT NULL AND auth.uid() = user_id
);

-- 4. Admin Policy: Admins can perform any operation on all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- ============================================================================
-- Step 3: Create or enhance RLS for payment_history (if needed)
-- ============================================================================

-- Payment history: Users can view their own, admins can view all
DROP POLICY IF EXISTS "Users can view own payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Users can insert own payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Admins can view all payment history" ON public.payment_history;

CREATE POLICY "Users can view own payment history"
ON public.payment_history
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY "Users can insert own payment history"
ON public.payment_history
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Admins can manage all payment history"
ON public.payment_history
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- ============================================================================
-- Step 4: Add index on 'verificado' for admin dashboard queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_verificado ON public.profiles(verificado);

-- ============================================================================
-- Summary
-- ============================================================================
-- ✅ New 'verificado' field in profiles for admin approval workflow
-- ✅ Relaxed INSERT RLS: auth.uid() = user_id (allows checkout without rejection)
-- ✅ Relaxed UPDATE RLS: auth.uid() = user_id (allows renewal without rejection)
-- ✅ Fixed SELECT RLS: auth.uid() = user_id (read own only)
-- ✅ Admin bypass: has_role() check for all operations
-- ✅ Index added for efficient admin queries
