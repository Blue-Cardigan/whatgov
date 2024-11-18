CREATE OR REPLACE FUNCTION get_unvoted_debates_divisionsonly(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
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
  divisions JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH voted_debates AS (
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
          'ai_question', d.ai_question,
          'ai_topic', d.ai_topic,
          'ai_context', d.ai_context,
          'ai_key_arguments', d.ai_key_arguments,
          'aye_members', d.aye_members,
          'noe_members', d.noe_members
        )
      ) as divisions_data
    FROM divisions d
    GROUP BY d.debate_section_ext_id
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
    COALESCE(dd.divisions_data, '[]'::jsonb) as divisions
  FROM debates d
  INNER JOIN debate_divisions dd ON d.ext_id = dd.debate_section_ext_id
  WHERE (
    NOT EXISTS (SELECT 1 FROM voted_debates)
    OR d.id NOT IN (SELECT debate_id FROM voted_debates)
  )
  AND (p_cursor IS NULL OR d.id > p_cursor::uuid)
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;