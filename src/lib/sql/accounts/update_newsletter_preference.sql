CREATE OR REPLACE FUNCTION update_newsletter_preference(token_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  usr record;
BEGIN
  -- Find user with matching token
  SELECT * INTO usr
  FROM auth.users
  WHERE unsubscribe_token = token_param;

  IF usr IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid unsubscribe token'
    );
  END IF;

  -- Update newsletter preference
  UPDATE public.user_profiles
  SET 
    newsletter = false,
    updated_at = now()
  WHERE id = usr.id;

  -- Clear the token
  UPDATE auth.users
  SET unsubscribe_token = NULL
  WHERE id = usr.id;

  RETURN json_build_object(
    'success', true
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_newsletter_preference(text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_newsletter_preference(text) TO service_role; 