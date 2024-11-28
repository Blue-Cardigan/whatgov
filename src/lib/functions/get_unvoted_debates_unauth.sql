CREATE OR REPLACE FUNCTION get_unvoted_debates_unauth(
  p_limit INTEGER DEFAULT 8,
  p_cursor UUID DEFAULT NULL,
  p_cursor_date DATE DEFAULT NULL,
  p_cursor_score FLOAT DEFAULT NULL
)
RETURNS TABLE (
  result_id UUID,
  ai_key_points TEXT,
  ai_question TEXT,
  ai_question_topic TEXT,
  ai_question_ayes INTEGER,
  ai_question_noes INTEGER,
  ai_summary TEXT,
  ai_title TEXT,
  ai_tone TEXT,
  ai_topics TEXT,
  contribution_count INTEGER,
  date DATE,
  ext_id TEXT,
  interest_factors TEXT,
  interest_score FLOAT,
  location TEXT,
  party_count JSONB,
  speaker_count INTEGER,
  title TEXT,
  type TEXT,
  engagement_score FLOAT,
  ai_comment_thread JSONB,
  speakers JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH base_debates AS (
    SELECT 
      d.id,
      d.ai_key_points::text,
      d.ai_question,
      d.ai_question_topic,
      d.ai_question_ayes,
      d.ai_question_noes,
      d.ai_summary,
      d.ai_title,
      d.ai_tone,
      d.ai_topics::text,
      d.contribution_count,
      d.date::date as debate_date,
      d.ext_id,
      d.interest_factors::text,
      d.interest_score,
      d.location,
      d.party_count,
      d.speaker_count,
      d.title,
      d.type,
      d.ai_comment_thread,
      CASE 
        WHEN d.speakers IS NULL THEN '[]'::jsonb
        ELSE jsonb_agg(
          jsonb_build_object(
            'party', speaker->>'party',
            'member_id', (speaker->>'member_id')::integer,
            'display_as', speaker->>'display_as'
          )
        )
      END as speakers,
      (
        COALESCE(d.ai_question_ayes, 0) + 
        COALESCE(d.ai_question_noes, 0)
      )::float AS total_votes
    FROM debates d
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
      d.date,
      d.ext_id,
      d.interest_factors,
      d.interest_score,
      d.location,
      d.party_count,
      d.speaker_count,
      d.title,
      d.type,
      d.ai_comment_thread
  ),
  scored_debates AS (
    SELECT *
    FROM base_debates
    WHERE (
      p_cursor IS NULL 
      OR (
        debate_date < p_cursor_date
        OR (debate_date = p_cursor_date AND total_votes < p_cursor_score)
        OR (debate_date = p_cursor_date AND total_votes = p_cursor_score AND id > p_cursor)
      )
    )
  )
  SELECT 
    scored_debates.id as result_id,
    scored_debates.ai_key_points,
    scored_debates.ai_question,
    scored_debates.ai_question_topic,
    scored_debates.ai_question_ayes,
    scored_debates.ai_question_noes,
    scored_debates.ai_summary,
    scored_debates.ai_title,
    scored_debates.ai_tone,
    scored_debates.ai_topics,
    scored_debates.contribution_count,
    scored_debates.debate_date as date,
    scored_debates.ext_id,
    scored_debates.interest_factors,
    scored_debates.interest_score,
    scored_debates.location,
    scored_debates.party_count,
    scored_debates.speaker_count,
    scored_debates.title,
    scored_debates.type,
    scored_debates.total_votes as engagement_score,
    COALESCE(scored_debates.ai_comment_thread, '[]'::jsonb) as ai_comment_thread,
    scored_debates.speakers
  FROM scored_debates
  ORDER BY 
    scored_debates.debate_date DESC NULLS LAST,
    scored_debates.total_votes DESC NULLS LAST,
    scored_debates.id ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;