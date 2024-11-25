-- First, enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_unsubscribe_token(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, auth, public
AS $$
DECLARE
  v_token text;
  v_user_id uuid;
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Generate a secure token using pgcrypto
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Store the token (removed incorrect schema reference in column names)
  UPDATE auth.users
  SET 
    unsubscribe_token = v_token,
    updated_at = now()
  WHERE id = v_user_id;
  
  RETURN v_token;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_unsubscribe_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_unsubscribe_token(text) TO service_role; 