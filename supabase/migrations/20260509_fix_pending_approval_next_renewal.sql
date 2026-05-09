-- Migration: 20260509 - Fix next_renewal for pending_approval subscriptions
-- Objective: Ensure that subscriptions in 'pending_approval' status have NULL next_renewal
-- This is the second part of the 60-day error fix
-- Only when admin approves (status='active') should next_renewal be set

BEGIN;

-- Clean all pending_approval subscriptions: set next_renewal to NULL
-- These subscriptions are awaiting admin approval, so they should NOT have an expiry date
UPDATE public.subscriptions
SET next_renewal = NULL
WHERE status = 'pending_approval'
  AND next_renewal IS NOT NULL;

-- Log the update for audit
-- This ensures that the service time only starts counting when admin confirms payment
COMMIT;

-- Documentation:
-- Phase 1 (New Sale): next_renewal = NULL, status = 'pending_approval'
-- Phase 2 (Admin Approval): admin clicks approve → next_renewal = now() + 30 days, status = 'active'
-- Phase 3 (UI): Traffic light and expiry counter only show when status='active' AND next_renewal IS NOT NULL
