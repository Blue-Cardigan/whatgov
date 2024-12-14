CREATE MATERIALIZED VIEW public.mp_key_points AS 
SELECT DISTINCT ON (d.id) 
    d.id AS debate_id,
    d.ext_id AS debate_ext_id,
    d.title AS debate_title,
    d.date AS debate_date,
    d.type AS debate_type,
    d.house AS debate_house,
    d.location AS debate_location,
    d.parent_ext_id,
    d.parent_title,
    d.ai_key_points AS all_key_points,
    kp.value ->> 'point' AS point,
    kp.value ->> 'context' AS context,
    (kp.value -> 'speaker') ->> 'memberId' AS member_id,
    m.display_as AS speaker_name,
    m.party AS speaker_party,
    m.constituency AS speaker_constituency,
    m.house AS speaker_house,
    m.full_title AS speaker_full_title,
    kp.value -> 'support' AS support,
    kp.value -> 'opposition' AS opposition,
    kp.value -> 'keywords' AS keywords,
    d.ai_topics,
    (
        SELECT DISTINCT jsonb_agg(DISTINCT subtopic.value) AS jsonb_agg
        FROM jsonb_array_elements(d.ai_topics) t(topic),
        LATERAL jsonb_array_elements(t.topic -> 'speakers') s(speaker),
        LATERAL jsonb_array_elements_text(s.speaker -> 'subtopics') subtopic(value)
        WHERE (s.speaker ->> 'memberId') = ((kp.value -> 'speaker') ->> 'memberId')
    ) AS speaker_subtopics,
    d.ai_summary,
    d.ai_tone,
    d.party_count,
    d.speaker_count,
    d.contribution_count
FROM debates d
CROSS JOIN LATERAL jsonb_array_elements(d.ai_key_points) kp(value)
LEFT JOIN members m ON
    CASE
        WHEN ((kp.value -> 'speaker') ->> 'memberId') ~ '^[0-9]+$' THEN ((kp.value -> 'speaker') ->> 'memberId')::integer
        ELSE NULL::integer
    END = m.member_id
WHERE ((kp.value -> 'speaker') ->> 'memberId') IS NOT NULL 
    AND ((kp.value -> 'speaker') ->> 'memberId') <> 'N/A'
ORDER BY d.id, d.date DESC;