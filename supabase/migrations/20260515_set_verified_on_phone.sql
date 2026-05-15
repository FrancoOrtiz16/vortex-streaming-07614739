-- Set is_verified = true when a profile gains a phone number

CREATE OR REPLACE FUNCTION public.set_profile_verified_on_phone()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF (NEW.phone IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.phone IS NULL)) THEN
      NEW.is_verified := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_verified_on_phone ON public.profiles;

CREATE TRIGGER trg_set_verified_on_phone
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.phone IS NOT NULL)
EXECUTE FUNCTION public.set_profile_verified_on_phone();
