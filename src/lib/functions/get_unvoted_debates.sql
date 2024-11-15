CREATE OR REPLACE FUNCTION get_unvoted_debates(
  p_user_id UUID,
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
  created_at TIMESTAMP WITH TIME ZONE,
  date DATE,
  ext_id TEXT,
  house TEXT,
  interest_factors TEXT,
  interest_score FLOAT,
  last_updated TIMESTAMP WITH TIME ZONE,
  location TEXT,
  next_ext_id TEXT,
  parent_ext_id TEXT,
  parent_title TEXT,
  party_count TEXT,
  prev_ext_id TEXT,
  search_text TEXT,
  search_vector tsvector,
  speaker_count INTEGER,
  title TEXT,
  type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_topics AS (
    SELECT COALESCE(selected_topics, ARRAY[]::text[]) as selected_topics
    FROM user_profiles 
    WHERE id = p_user_id
  ),
  voted_debates AS (
    SELECT DISTINCT debate_id 
    FROM debate_votes 
    WHERE user_id = p_user_id
  ),
  scored_debates AS (
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
      d.created_at,
      d.date,
      d.ext_id,
      d.house,
      d.interest_factors::text,
      d.interest_score,
      d.last_updated,
      d.location,
      d.next_ext_id,
      d.parent_ext_id,
      d.parent_title,
      d.party_count::text,
      d.prev_ext_id,
      d.search_text,
      d.search_vector,
      d.speaker_count,
      d.title,
      d.type,
      -- Calculate scores but don't include them in output
      COALESCE(d.interest_score, 0) * 0.4 +
      CASE 
        WHEN d.ai_topics IS NULL THEN 0
        ELSE (
          SELECT COALESCE(COUNT(*), 0) * 0.1
          FROM jsonb_array_elements_text(d.ai_topics::jsonb) AS topic
          WHERE topic = ANY(COALESCE(ut.selected_topics, ARRAY[]::text[]))
        )
      END * 0.3 +
      (
        COALESCE(d.ai_question_1_ayes, 0) + 
        COALESCE(d.ai_question_1_noes, 0) +
        COALESCE(d.ai_question_2_ayes, 0) + 
        COALESCE(d.ai_question_2_noes, 0) +
        COALESCE(d.ai_question_3_ayes, 0) + 
        COALESCE(d.ai_question_3_noes, 0)
      )::float / NULLIF(100, 0) * 0.3 +
      CASE 
        WHEN DATE(d.date) = CURRENT_DATE THEN 2.0  -- Today's debates get highest priority
        WHEN d.date > NOW() - INTERVAL '1 day' THEN 1.0
        WHEN d.date > NOW() - INTERVAL '2 days' THEN 0.4
        WHEN d.date > NOW() - INTERVAL '3 days' THEN 0.2
        ELSE 0.1
      END * 0.4 +  -- Increased time weight to 40%
      COALESCE(d.interest_score, 0) * 0.2 +  -- Reduced base interest score to 20%
      CASE 
        WHEN d.ai_topics IS NULL THEN 0
        ELSE (
          SELECT COALESCE(COUNT(*), 0) * 0.1
          FROM jsonb_array_elements_text(d.ai_topics::jsonb) AS topic
          WHERE topic = ANY(COALESCE(ut.selected_topics, ARRAY[]::text[]))
        )
      END * 0.2 +  -- Topic matching reduced to 20%
      (
        COALESCE(d.ai_question_1_ayes, 0) + 
        COALESCE(d.ai_question_1_noes, 0) +
        COALESCE(d.ai_question_2_ayes, 0) + 
        COALESCE(d.ai_question_2_noes, 0) +
        COALESCE(d.ai_question_3_ayes, 0) + 
        COALESCE(d.ai_question_3_noes, 0)
      )::float / NULLIF(100, 0) * 0.1 AS total_score  -- Engagement reduced to 10%
      
    FROM debates d
    CROSS JOIN user_topics ut
    WHERE (
      -- Handle case where user hasn't voted on anything
      NOT EXISTS (SELECT 1 FROM voted_debates)
      OR d.id NOT IN (SELECT debate_id FROM voted_debates)
    )
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
    scored_debates.created_at,
    scored_debates.date,
    scored_debates.ext_id,
    scored_debates.house,
    scored_debates.interest_factors,
    scored_debates.interest_score,
    scored_debates.last_updated,
    scored_debates.location,
    scored_debates.next_ext_id,
    scored_debates.parent_ext_id,
    scored_debates.parent_title,
    scored_debates.party_count,
    scored_debates.prev_ext_id,
    scored_debates.search_text,
    scored_debates.search_vector,
    scored_debates.speaker_count,
    scored_debates.title,
    scored_debates.type
  FROM scored_debates
  ORDER BY 
    scored_debates.total_score DESC,
    scored_debates.id ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;