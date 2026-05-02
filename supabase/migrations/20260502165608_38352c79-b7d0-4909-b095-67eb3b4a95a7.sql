
-- Re-create get_subscription_credentials with explicit guard, tracked in migrations
CREATE OR REPLACE FUNCTION public.get_subscription_credentials(_subscription_id uuid)
 RETURNS TABLE(credential_email text, credential_password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _enc_key text;
  _sub record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT s.user_id, s.credential_email AS enc_email, s.credential_password AS enc_pass
  INTO _sub
  FROM subscriptions s
  WHERE s.id = _subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  IF _sub.user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _enc_key := current_setting('app.settings.credentials_key', true);
  IF _enc_key IS NULL OR _enc_key = '' THEN
    _enc_key := 'vortex_default_enc_key_change_me';
  END IF;

  BEGIN
    RETURN QUERY SELECT
      CASE WHEN _sub.enc_email IS NOT NULL
        THEN pgp_sym_decrypt(decode(_sub.enc_email, 'base64'), _enc_key)
        ELSE NULL
      END,
      CASE WHEN _sub.enc_pass IS NOT NULL
        THEN pgp_sym_decrypt(decode(_sub.enc_pass, 'base64'), _enc_key)
        ELSE NULL
      END;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT _sub.enc_email, _sub.enc_pass;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_subscription_credentials(_subscription_id uuid, _credential_email text, _credential_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _enc_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _enc_key := current_setting('app.settings.credentials_key', true);
  IF _enc_key IS NULL OR _enc_key = '' THEN
    _enc_key := 'vortex_default_enc_key_change_me';
  END IF;

  UPDATE subscriptions
  SET
    credential_email = CASE
      WHEN _credential_email IS NOT NULL AND _credential_email != ''
      THEN encode(pgp_sym_encrypt(_credential_email, _enc_key), 'base64')
      ELSE credential_email
    END,
    credential_password = CASE
      WHEN _credential_password IS NOT NULL AND _credential_password != ''
      THEN encode(pgp_sym_encrypt(_credential_password, _enc_key), 'base64')
      ELSE credential_password
    END
  WHERE id = _subscription_id;
END;
$function$;

-- Revoke broad execute access; only signed-in users should call these
REVOKE EXECUTE ON FUNCTION public.get_subscription_credentials(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_subscription_credentials(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_subscription_credentials(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_subscription_credentials(uuid, text, text) TO authenticated;
