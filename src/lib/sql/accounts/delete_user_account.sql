CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_id uuid;
BEGIN
  -- Get the ID of the calling user
  caller_id := auth.uid();
  
  IF caller_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Delete user profile first (due to foreign key constraints)
  DELETE FROM public.user_profiles WHERE id = caller_id;
  
  -- Delete user votes
  DELETE FROM public.debate_votes WHERE user_id = caller_id;
  
  -- Delete auth user
  DELETE FROM auth.users WHERE id = caller_id;
  
  RETURN json_build_object(
    'success', true
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;