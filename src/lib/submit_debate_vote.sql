CREATE OR REPLACE FUNCTION public.submit_debate_vote(
  p_debate_id UUID,
  p_question_number INTEGER,
  p_vote BOOLEAN
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_previous_vote BOOLEAN;
  v_column_ayes TEXT;
  v_column_noes TEXT;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if user exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be logged in';
  END IF;

  -- Construct column names
  v_column_ayes := 'ai_question_' || p_question_number || '_ayes';
  v_column_noes := 'ai_question_' || p_question_number || '_noes';

  -- Get previous vote if exists
  SELECT vote INTO v_previous_vote
  FROM debate_votes
  WHERE user_id = v_user_id 
    AND debate_id = p_debate_id 
    AND question_number = p_question_number;

  -- Begin transaction
  BEGIN
    -- If previous vote exists, remove it first
    IF v_previous_vote IS NOT NULL THEN
      -- Decrement previous vote count
      IF v_previous_vote THEN
        EXECUTE format('UPDATE debates SET %I = %I - 1 WHERE id = $1', v_column_ayes, v_column_ayes)
        USING p_debate_id;
      ELSE
        EXECUTE format('UPDATE debates SET %I = %I - 1 WHERE id = $1', v_column_noes, v_column_noes)
        USING p_debate_id;
      END IF;
      
      -- Delete previous vote
      DELETE FROM debate_votes
      WHERE user_id = v_user_id 
        AND debate_id = p_debate_id 
        AND question_number = p_question_number;
    END IF;

    -- Insert new vote
    INSERT INTO debate_votes (user_id, debate_id, question_number, vote)
    VALUES (v_user_id, p_debate_id, p_question_number, p_vote);

    -- Increment new vote count
    IF p_vote THEN
      EXECUTE format('UPDATE debates SET %I = %I + 1 WHERE id = $1', v_column_ayes, v_column_ayes)
      USING p_debate_id;
    ELSE
      EXECUTE format('UPDATE debates SET %I = %I + 1 WHERE id = $1', v_column_noes, v_column_noes)
      USING p_debate_id;
    END IF;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
