CREATE OR REPLACE FUNCTION create_user_with_profile(
  user_email text,
  user_password text,
  user_name text,
  user_gender text,
  user_postcode text,
  user_constituency text,
  user_mp text,
  user_mp_id integer,
  user_selected_topics text[],
  user_newsletter boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, auth, public
AS $$
#variable_conflict use_column
DECLARE
  new_user_id uuid;
  existing_user_id uuid;
  confirmation_token text;
  result json;
BEGIN
  -- Check for existing unverified user
  SELECT u.id INTO existing_user_id
  FROM auth.users u
  JOIN public.user_profiles p ON p.id = u.id
  WHERE u.email = user_email 
    AND (u.email_confirmed_at IS NULL OR p.email_verified = false);

  -- If we found an unverified user, delete them
  IF existing_user_id IS NOT NULL THEN
    -- Delete from user_profiles first (child table)
    DELETE FROM public.user_profiles WHERE id = existing_user_id;
    -- Then delete from auth.users (parent table)
    DELETE FROM auth.users WHERE id = existing_user_id;
  -- If we found a verified user, return error
  ELSIF EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already exists'
    );
  END IF;

  -- Generate a URL-safe token
  confirmation_token := encode(extensions.gen_random_bytes(24), 'base64');
  -- Remove any non-URL safe characters
  confirmation_token := regexp_replace(
    regexp_replace(
      regexp_replace(confirmation_token, '\+', '-'),
      '/', '_'
    ),
    '=+$', ''
  );

  -- Create auth user with explicit schema references
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    extensions.crypt(user_password, extensions.gen_salt('bf')),
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', user_name),
    now(),
    now(),
    confirmation_token
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  INSERT INTO public.user_profiles (
    id,
    email,
    name,
    gender,
    postcode,
    constituency,
    mp,
    mp_id,
    selected_topics,
    email_verified,
    newsletter,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    user_email,
    user_name,
    user_gender,
    user_postcode,
    user_constituency,
    user_mp,
    user_mp_id,
    user_selected_topics,
    false,
    user_newsletter,
    now(),
    now()
  );

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'confirmation_token', confirmation_token
  );

  RETURN result;
EXCEPTION
  WHEN others THEN
    -- Clean up auth user if profile creation fails
    IF new_user_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = new_user_id;
    END IF;
    
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION create_user_with_profile TO service_role;