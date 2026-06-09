-- Add receipt_url column to subscriptions table for multi-purchase receipt linking
-- This allows each subscription in a multi-purchase transaction to reference the payment proof

BEGIN;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

COMMENT ON COLUMN public.subscriptions.receipt_url IS 
'URL of the payment receipt/proof associated with this subscription. 
For multi-purchases, all subscriptions from the same transaction reference the same receipt. 
This is a permanent historical record and should never be auto-deleted.';

-- Create index for faster lookups when displaying receipt in admin dashboard
CREATE INDEX IF NOT EXISTS idx_subscriptions_receipt_url 
ON public.subscriptions(receipt_url) 
WHERE receipt_url IS NOT NULL;

-- RLS policies remain unchanged - existing policies still apply
COMMIT;
