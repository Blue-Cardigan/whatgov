CREATE OR REPLACE FUNCTION verify_user_email(token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  usr record;
  usr_profile record;
  result json;
BEGIN
  -- Find user with matching confirmation token
  SELECT * INTO usr
  FROM auth.users
  WHERE confirmation_token = token
  AND email_confirmed_at IS NULL;

  IF usr IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;

  -- Get user profile
  SELECT * INTO usr_profile
  FROM public.user_profiles
  WHERE id = usr.id;

  -- Update user email confirmation
  UPDATE auth.users
  SET 
    email_confirmed_at = now(),
    confirmation_token = '',
    email_change = '',
    recovery_token = '',
    email_change_token_new = '',
    updated_at = now()
  WHERE id = usr.id;

  -- Update profile email verification status
  UPDATE public.user_profiles
  SET 
    email_verified = true,
    updated_at = now()
  WHERE id = usr.id;

  RETURN json_build_object(
    'success', true,
    'user_id', usr.id,
    'email', usr.email,
    'name', usr_profile.name
  );
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION verify_user_email TO service_role;