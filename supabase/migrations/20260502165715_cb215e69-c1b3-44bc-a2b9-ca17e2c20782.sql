
-- Remove direct column SELECT access on sensitive credential columns from regular users.
-- Admins retain access through the "Admins can manage all subscriptions" ALL policy.
REVOKE SELECT (credential_email, credential_password, profile_name, profile_pin)
  ON public.subscriptions FROM authenticated, anon, PUBLIC;

-- Lock down execute on SECURITY DEFINER helpers to authenticated users only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
