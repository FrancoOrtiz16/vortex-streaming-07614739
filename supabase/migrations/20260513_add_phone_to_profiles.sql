-- Add WhatsApp/phone field to profiles for user contact details
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
 
-- Force PostgREST / Supabase to reload schema cache so PGRST204 disappears
NOTIFY pgrst, 'reload schema';
