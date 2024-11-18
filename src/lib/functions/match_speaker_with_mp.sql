CREATE OR REPLACE FUNCTION match_speaker_with_mp(speaker_names TEXT[])
RETURNS TABLE (
  speaker TEXT,
  member_id INTEGER,
  display_as TEXT,
  party TEXT,
  constituency TEXT,
  twfy_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.speaker,
    m.member_id,
    m.display_as,
    m.party,
    m.constituency,
    m.twfy_image_url
  FROM unnest(speaker_names) AS s(speaker)
  LEFT JOIN members m ON 
    m.house_end_date IS NULL 
    AND similarity(lower(m.display_as), lower(s.speaker)) > 0.4
  ORDER BY s.speaker, similarity(lower(m.display_as), lower(s.speaker)) DESC;
END;
$$ LANGUAGE plpgsql;