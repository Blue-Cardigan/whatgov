CREATE OR REPLACE FUNCTION get_unvoted_debates_unauth(
  p_limit INTEGER DEFAULT 8,
  p_cursor UUID DEFAULT NULL
)
RETURNS TABLE (
  result_id UUID,
  ai_key_points TEXT,
  ai_question_1 TEXT,
  ai_question_1_ayes INTEGER,
  ai_question_1_noes INTEGER,
  ai_question_1_topic TEXT,
  ai_question_2 TEXT,
  ai_question_2_ayes INTEGER,
  ai_question_2_noes INTEGER,
  ai_question_2_topic TEXT,
  ai_question_3 TEXT,
  ai_question_3_ayes INTEGER,
  ai_question_3_noes INTEGER,
  ai_question_3_topic TEXT,
  ai_summary TEXT,
  ai_tags TEXT,
  ai_title TEXT,
  ai_tone TEXT,
  ai_topics TEXT,
  contribution_count INTEGER,
  date DATE,
  ext_id TEXT,
  interest_factors TEXT,
  interest_score FLOAT,
  location TEXT,
  party_count TEXT,
  speaker_count INTEGER,
  title TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH scored_debates AS (
    SELECT 
      d.id,
      d.ai_key_points::text,
      d.ai_question_1,
      d.ai_question_1_ayes,
      d.ai_question_1_noes,
      d.ai_question_1_topic,
      d.ai_question_2,
      d.ai_question_2_ayes,
      d.ai_question_2_noes,
      d.ai_question_2_topic,
      d.ai_question_3,
      d.ai_question_3_ayes,
      d.ai_question_3_noes,
      d.ai_question_3_topic,
      d.ai_summary,
      d.ai_tags::text,
      d.ai_title,
      d.ai_tone,
      d.ai_topics::text,
      d.contribution_count,
      d.date,
      d.ext_id,
      d.interest_factors::text,
      d.interest_score,
      d.location,
      d.party_count::text,
      d.speaker_count,
      d.title,
      -- Calculate public score
      CASE 
        WHEN DATE(d.date) = CURRENT_DATE THEN 2.0
        WHEN d.date > NOW() - INTERVAL '1 day' THEN 1.0
        WHEN d.date > NOW() - INTERVAL '2 days' THEN 0.4
        WHEN d.date > NOW() - INTERVAL '3 days' THEN 0.2
        ELSE 0.1
      END * 0.5 +  -- Time relevance (50%)
      COALESCE(d.interest_score, 0) * 0.2 +  -- Base interest score (20%)
      (
        COALESCE(d.ai_question_1_ayes, 0) + 
        COALESCE(d.ai_question_1_noes, 0) +
        COALESCE(d.ai_question_2_ayes, 0) + 
        COALESCE(d.ai_question_2_noes, 0) +
        COALESCE(d.ai_question_3_ayes, 0) + 
        COALESCE(d.ai_question_3_noes, 0)
      )::float / NULLIF(100, 0) * 0.3 AS total_score  -- Engagement (30%)
    FROM debates d
    WHERE d.date > NOW() - INTERVAL '3 days'  -- Only show debates from last 3 days
    AND (p_cursor IS NULL OR d.id > p_cursor::uuid)
  )
  SELECT 
    scored_debates.id,
    scored_debates.ai_key_points,
    scored_debates.ai_question_1,
    scored_debates.ai_question_1_ayes,
    scored_debates.ai_question_1_noes,
    scored_debates.ai_question_1_topic,
    scored_debates.ai_question_2,
    scored_debates.ai_question_2_ayes,
    scored_debates.ai_question_2_noes,
    scored_debates.ai_question_2_topic,
    scored_debates.ai_question_3,
    scored_debates.ai_question_3_ayes,
    scored_debates.ai_question_3_noes,
    scored_debates.ai_question_3_topic,
    scored_debates.ai_summary,
    scored_debates.ai_tags,
    scored_debates.ai_title,
    scored_debates.ai_tone,
    scored_debates.ai_topics,
    scored_debates.contribution_count,
    scored_debates.date,
    scored_debates.ext_id,
    scored_debates.interest_factors,
    scored_debates.interest_score,
    scored_debates.location,
    scored_debates.party_count,
    scored_debates.speaker_count,
    scored_debates.title
  FROM scored_debates
  ORDER BY 
    scored_debates.total_score DESC,
    scored_debates.id ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;