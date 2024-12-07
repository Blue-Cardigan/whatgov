CREATE OR REPLACE FUNCTION get_unvoted_debates(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 8,
  p_cursor UUID DEFAULT NULL,
  p_cursor_date DATE DEFAULT NULL,
  p_cursor_score FLOAT DEFAULT NULL,
  p_type TEXT[] DEFAULT NULL,
  p_location TEXT[] DEFAULT NULL,
  p_days TEXT[] DEFAULT NULL,
  p_topics TEXT[] DEFAULT NULL,
  p_mp_only BOOLEAN DEFAULT FALSE,
  p_divisions_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  result_id UUID,
  ai_key_points JSONB,
  ai_question TEXT,
  ai_question_topic TEXT,
  ai_question_ayes INTEGER,
  ai_question_noes INTEGER,
  ai_summary TEXT,
  ai_title TEXT,
  ai_tone TEXT,
  ai_topics JSONB,
  contribution_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  date DATE,
  ext_id TEXT,
  house TEXT,
  interest_factors JSONB,
  interest_score FLOAT,
  last_updated TIMESTAMP WITH TIME ZONE,
  location TEXT,
  next_ext_id TEXT,
  parent_ext_id TEXT,
  parent_title TEXT,
  party_count JSONB,
  prev_ext_id TEXT,
  search_text TEXT,
  search_vector tsvector,
  speaker_count INTEGER,
  title TEXT,
  type TEXT,
  divisions JSONB,
  engagement_score FLOAT,
  ai_comment_thread JSONB,
  speakers JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH user_topics AS (
    SELECT 
      COALESCE(selected_topics, ARRAY[]::text[]) as selected_topics,
      mp as user_mp
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
          'aye_members', d.aye_members,
          'noe_members', d.noe_members,
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
  filtered_debates AS (
    SELECT 
      d.*,
      COALESCE(dd.divisions_data, '[]'::jsonb) as divisions
    FROM debates d
    LEFT JOIN user_topics ut ON true
    LEFT JOIN debate_divisions dd ON d.ext_id = dd.debate_section_ext_id
    WHERE (
      NOT EXISTS (SELECT 1 FROM voted_debates)
      OR d.id NOT IN (SELECT debate_id FROM voted_debates)
    )
    AND (
      (NOT EXISTS (SELECT 1 FROM user_topics) AND dd.divisions_data IS NOT NULL AND dd.divisions_data != '[]'::jsonb)
      OR
      (
        EXISTS (SELECT 1 FROM user_topics)
        AND (
          NOT p_divisions_only 
          OR (
            dd.divisions_data IS NOT NULL 
            AND dd.divisions_data != '[]'::jsonb
            AND jsonb_array_length(dd.divisions_data) > 0
          )
        )
      )
    )
    AND (
      CASE 
        WHEN p_topics IS NOT NULL AND array_length(p_topics, 1) > 0 THEN
          EXISTS (
            SELECT 1
            FROM jsonb_array_elements(d.ai_topics) AS topic_obj
            WHERE (topic_obj->>'name')::text = ANY(p_topics)
          )
        ELSE
          EXISTS (
            SELECT 1
            FROM jsonb_array_elements(d.ai_topics) AS topic_obj
            WHERE (topic_obj->>'name')::text = ANY(ut.selected_topics)
          )
          OR d.interest_score >= 0.2
      END
    )
    AND (
      p_type IS NULL 
      OR d.type IS NULL 
      OR d.type = ANY(p_type)
    )
    AND (p_location IS NULL OR d.location = ANY(p_location))
    AND (p_days IS NULL OR d.day_of_week = ANY(p_days))
    AND (
      NOT p_mp_only
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(d.speakers) AS speaker
        WHERE (speaker->>'display_as')::text = ut.user_mp
      )
    )
  ),
  scored_debates AS (
    SELECT 
      fd.*,
      (
        COALESCE(fd.ai_question_ayes, 0) + 
        COALESCE(fd.ai_question_noes, 0)
      )::float AS engagement_score
    FROM filtered_debates fd
    WHERE (
      p_cursor IS NULL 
      OR (
        fd.date::date < p_cursor_date
        OR (fd.date::date = p_cursor_date AND (
          COALESCE(fd.ai_question_ayes, 0) + 
          COALESCE(fd.ai_question_noes, 0)
        )::float < p_cursor_score)
        OR (fd.date::date = p_cursor_date AND (
          COALESCE(fd.ai_question_ayes, 0) + 
          COALESCE(fd.ai_question_noes, 0)
        )::float = p_cursor_score AND fd.id > p_cursor)
      )
    )
  )
  SELECT 
    d.id as result_id,
    COALESCE(d.ai_key_points, '{}'::jsonb) as ai_key_points,
    d.ai_question,
    d.ai_question_topic,
    d.ai_question_ayes,
    d.ai_question_noes,
    d.ai_summary,
    d.ai_title,
    d.ai_tone,
    COALESCE(d.ai_topics, '{}'::jsonb) as ai_topics,
    d.contribution_count,
    d.created_at,
    d.date,
    d.ext_id,
    d.house,
    COALESCE(d.interest_factors, '{}'::jsonb) as interest_factors,
    d.interest_score,
    d.last_updated,
    d.location,
    d.next_ext_id,
    d.parent_ext_id,
    d.parent_title,
    COALESCE(d.party_count, '{}'::jsonb) as party_count,
    d.prev_ext_id,
    d.search_text,
    d.search_vector,
    d.speaker_count,
    d.title,
    d.type,
    d.divisions,
    d.engagement_score,
    COALESCE(d.ai_comment_thread, '[]'::jsonb) as ai_comment_thread,
    CASE 
      WHEN d.speakers IS NULL THEN '[]'::jsonb
      ELSE jsonb_agg(
        jsonb_build_object(
          'party', speaker->>'party',
          'member_id', (speaker->>'member_id')::integer,
          'display_as', speaker->>'display_as'
        )
      )
    END as speakers
  FROM scored_debates d
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE 
      WHEN d.speakers IS NULL THEN '[]'::jsonb
      ELSE d.speakers
    END
  ) as speaker ON true
  GROUP BY 
    d.id,
    d.ai_key_points,
    d.ai_question,
    d.ai_question_topic,
    d.ai_question_ayes,
    d.ai_question_noes,
    d.ai_summary,
    d.ai_title,
    d.ai_tone,
    d.ai_topics,
    d.contribution_count,
    d.created_at,
    d.date,
    d.ext_id,
    d.house,
    d.interest_factors,
    d.interest_score,
    d.last_updated,
    d.location,
    d.next_ext_id,
    d.parent_ext_id,
    d.parent_title,
    d.party_count,
    d.prev_ext_id,
    d.search_text,
    d.search_vector,
    d.speaker_count,
    d.title,
    d.type,
    d.divisions,
    d.engagement_score,
    d.ai_comment_thread,
    d.speakers
  ORDER BY 
    d.date::date DESC,
    d.engagement_score DESC,
    d.id ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;