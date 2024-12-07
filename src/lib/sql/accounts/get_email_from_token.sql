CREATE OR REPLACE FUNCTION get_email_from_token(verification_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  usr record;
BEGIN
  -- Find user with matching confirmation token
  SELECT * INTO usr
  FROM auth.users
  WHERE confirmation_token = verification_token
  AND email_confirmed_at IS NULL;

  IF usr IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'email', usr.email
  );
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION get_email_from_token TO service_role;

CREATE OR REPLACE FUNCTION generate_verification_token(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  usr record;
  new_token text;
BEGIN
  -- Find user by email
  SELECT * INTO usr
  FROM auth.users
  WHERE email = user_email
  AND email_confirmed_at IS NULL;

  IF usr IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found or already verified'
    );
  END IF;

  -- Generate new confirmation token (32 random chars)
  new_token := encode(gen_random_bytes(24), 'hex');

  -- Update user with new confirmation token
  UPDATE auth.users
  SET 
    confirmation_token = new_token,
    updated_at = now()
  WHERE id = usr.id;

  RETURN json_build_object(
    'success', true,
    'confirmation_token', new_token
  );
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION generate_verification_token TO service_role;