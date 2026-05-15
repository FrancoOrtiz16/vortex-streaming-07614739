-- Add WhatsApp/phone field to profiles for user contact details
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
