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

  -- Generate new confirmation token using UUID
  new_token := replace(gen_random_uuid()::text, '-', '');

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