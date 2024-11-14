-- Function to get debates with engagement count
CREATE OR REPLACE FUNCTION get_debates_with_engagement(
  p_debate_ids uuid[],
  p_limit integer,
  p_cursor date
)
RETURNS TABLE (
  id uuid,
  title text,
  date date,
  type text,
  house text,
  location text,
  ai_title text,
  ai_summary text,
  ai_tone text,
  ai_topics jsonb,
  ai_tags jsonb,
  ai_key_points jsonb,
  ai_question_1 text,
  ai_question_1_topic text,
  ai_question_1_ayes integer,
  ai_question_1_noes integer,
  ai_question_2 text,
  ai_question_2_topic text,
  ai_question_2_ayes integer,
  ai_question_2_noes integer,
  ai_question_3 text,
  ai_question_3_topic text,
  ai_question_3_ayes integer,
  ai_question_3_noes integer,
  speaker_count integer,
  contribution_count integer,
  party_count jsonb,
  interest_score double precision,
  interest_factors jsonb,
  engagement_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.date,
    d.type,
    d.house,
    d.location,
    d.ai_title,
    d.ai_summary,
    d.ai_tone,
    d.ai_topics,
    d.ai_tags,
    d.ai_key_points,
    d.ai_question_1,
    d.ai_question_1_topic,
    d.ai_question_1_ayes,
    d.ai_question_1_noes,
    d.ai_question_2,
    d.ai_question_2_topic,
    d.ai_question_2_ayes,
    d.ai_question_2_noes,
    d.ai_question_3,
    d.ai_question_3_topic,
    d.ai_question_3_ayes,
    d.ai_question_3_noes,
    d.speaker_count,
    d.contribution_count,
    d.party_count,
    d.interest_score,
    d.interest_factors,
    (SELECT COUNT(*) FROM debate_votes WHERE debate_id = d.id) as engagement_count
  FROM debates d
  WHERE d.id = ANY(p_debate_ids)
    AND (p_cursor IS NULL OR d.date < p_cursor)
  ORDER BY d.date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get unvoted debates with engagement count
CREATE OR REPLACE FUNCTION get_unvoted_debates_with_engagement(
  p_user_id uuid,
  p_limit integer,
  p_cursor date
)
RETURNS TABLE (
  -- Same columns as above
  id uuid,
  title text,
  date date,
  type text,
  house text,
  location text,
  ai_title text,
  ai_summary text,
  ai_tone text,
  ai_topics jsonb,
  ai_tags jsonb,
  ai_key_points jsonb,
  ai_question_1 text,
  ai_question_1_topic text,
  ai_question_1_ayes integer,
  ai_question_1_noes integer,
  ai_question_2 text,
  ai_question_2_topic text,
  ai_question_2_ayes integer,
  ai_question_2_noes integer,
  ai_question_3 text,
  ai_question_3_topic text,
  ai_question_3_ayes integer,
  ai_question_3_noes integer,
  speaker_count integer,
  contribution_count integer,
  party_count jsonb,
  interest_score double precision,
  interest_factors jsonb,
  engagement_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.date,
    d.type,
    d.house,
    d.location,
    d.ai_title,
    d.ai_summary,
    d.ai_tone,
    d.ai_topics,
    d.ai_tags,
    d.ai_key_points,
    d.ai_question_1,
    d.ai_question_1_topic,
    d.ai_question_1_ayes,
    d.ai_question_1_noes,
    d.ai_question_2,
    d.ai_question_2_topic,
    d.ai_question_2_ayes,
    d.ai_question_2_noes,
    d.ai_question_3,
    d.ai_question_3_topic,
    d.ai_question_3_ayes,
    d.ai_question_3_noes,
    d.speaker_count,
    d.contribution_count,
    d.party_count,
    d.interest_score,
    d.interest_factors,
    (SELECT COUNT(*) FROM debate_votes WHERE debate_id = d.id) as engagement_count
  FROM debates d
  WHERE NOT EXISTS (
    SELECT 1 FROM debate_votes
    WHERE debate_id = d.id AND user_id = p_user_id
  )
    AND (p_cursor IS NULL OR d.date < p_cursor)
  ORDER BY d.date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;