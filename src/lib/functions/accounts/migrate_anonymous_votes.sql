CREATE OR REPLACE FUNCTION migrate_anonymous_votes(
  p_votes jsonb[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_vote jsonb;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Validate user exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Process each vote
  FOREACH v_vote IN ARRAY p_votes
  LOOP
    -- Insert vote if it doesn't exist
    INSERT INTO debate_votes (
      user_id,
      debate_id,
      vote,
      created_at
    )
    VALUES (
      v_user_id,
      (v_vote->>'debate_id')::text,
      (v_vote->>'vote')::boolean,
      COALESCE(
        (v_vote->>'created_at')::timestamp with time zone,
        NOW()
      )
    )
    ON CONFLICT (user_id, debate_id) DO NOTHING;
  END LOOP;
END;
$$;