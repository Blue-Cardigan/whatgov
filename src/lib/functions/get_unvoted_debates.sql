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
  type TEXT,
  total_score FLOAT,
  divisions JSONB
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
  debate_divisions AS (
    SELECT 
      d.debate_section_ext_id,
      jsonb_agg(
        jsonb_build_object(
          'division_id', d.division_id,
          'external_id', d.external_id,
          'date', d.date,
          'time', d.time,
          'ayes_count', d.ayes_count,
          'noes_count', d.noes_count,
          'division_number', d.division_number,
          'text_before_vote', d.text_before_vote,
          'text_after_vote', d.text_after_vote,
          'ai_question', d.ai_question,
          'ai_topic', d.ai_topic,
          'ai_context', d.ai_context,
          'ai_key_arguments', d.ai_key_arguments
        )
      ) as divisions_data
    FROM divisions d
    GROUP BY d.debate_section_ext_id
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
        WHEN DATE(d.date) = CURRENT_DATE THEN 2.0
        WHEN d.date > NOW() - INTERVAL '1 day' THEN 1.0
        WHEN d.date > NOW() - INTERVAL '2 days' THEN 0.4
        WHEN d.date > NOW() - INTERVAL '3 days' THEN 0.2
        WHEN d.date > NOW() - INTERVAL '7 days' THEN 0.1
        ELSE 0.0
      END * 0.4 +
      COALESCE(d.interest_score, 0) * 0.2 +
      CASE 
        WHEN d.ai_topics IS NULL THEN 0
        ELSE (
          SELECT COALESCE(COUNT(*), 0) * 0.1
          FROM jsonb_array_elements_text(d.ai_topics::jsonb) AS topic
          WHERE topic = ANY(COALESCE(ut.selected_topics, ARRAY[]::text[]))
        )
      END * 0.2 +
      (
        COALESCE(d.ai_question_1_ayes, 0) + 
        COALESCE(d.ai_question_1_noes, 0) +
        COALESCE(d.ai_question_2_ayes, 0) + 
        COALESCE(d.ai_question_2_noes, 0) +
        COALESCE(d.ai_question_3_ayes, 0) + 
        COALESCE(d.ai_question_3_noes, 0)
      )::float / NULLIF(100, 0) * 0.1 AS total_score
      
    FROM debates d
    CROSS JOIN user_topics ut
    WHERE (
      -- Handle case where user hasn't voted on anything
      NOT EXISTS (SELECT 1 FROM voted_debates)
      OR d.id NOT IN (SELECT debate_id FROM voted_debates)
    )
    AND d.date > NOW() - INTERVAL '7 days'
    AND (p_cursor IS NULL OR d.id > p_cursor::uuid)
  )
  SELECT 
    d.id as result_id,
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
    d.total_score,
    COALESCE(dd.divisions_data, '[]'::jsonb) as divisions
  FROM scored_debates d
  LEFT JOIN debate_divisions dd ON d.ext_id = dd.debate_section_ext_id
  ORDER BY 
    d.total_score DESC,
    d.id ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;