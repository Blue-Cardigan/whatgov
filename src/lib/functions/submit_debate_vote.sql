CREATE OR REPLACE FUNCTION public.submit_debate_vote(
  p_debate_id UUID,
  p_vote BOOLEAN
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_previous_vote BOOLEAN;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if user exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be logged in';
  END IF;

  -- Lock the relevant debate row to prevent race conditions
  PERFORM 1 FROM debates 
  WHERE id = p_debate_id 
  FOR UPDATE;

  -- Get previous vote if exists (with FOR UPDATE to lock the row)
  SELECT vote INTO v_previous_vote
  FROM debate_votes
  WHERE user_id = v_user_id   
    AND debate_id = p_debate_id
  FOR UPDATE;

  -- If previous vote exists, remove it first
  IF v_previous_vote IS NOT NULL THEN
    -- Decrement previous vote count
    UPDATE debates SET 
      ai_question_ayes = CASE 
        WHEN v_previous_vote THEN ai_question_ayes - 1 
        ELSE ai_question_ayes 
      END,
      ai_question_noes = CASE 
        WHEN NOT v_previous_vote THEN ai_question_noes - 1 
        ELSE ai_question_noes 
      END
    WHERE id = p_debate_id;
    
    -- Delete previous vote
    DELETE FROM debate_votes
    WHERE user_id = v_user_id 
      AND debate_id = p_debate_id;
  END IF;

  -- Insert new vote
  INSERT INTO debate_votes (user_id, debate_id, vote)
  VALUES (v_user_id, p_debate_id, p_vote);

  -- Increment new vote count
  UPDATE debates SET 
    ai_question_ayes = CASE 
      WHEN p_vote THEN ai_question_ayes + 1 
      ELSE ai_question_ayes 
    END,
    ai_question_noes = CASE 
      WHEN NOT p_vote THEN ai_question_noes + 1 
      ELSE ai_question_noes 
    END
  WHERE id = p_debate_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
