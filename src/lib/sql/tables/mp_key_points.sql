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
    kp.value ->> 'point'::text AS point,
    kp.value ->> 'context'::text AS context,
    (kp.value -> 'speaker'::text) ->> 'memberId'::text AS member_id,
    m.display_as AS speaker_name,
    m.party AS speaker_party,
    m.constituency AS speaker_constituency,
    m.house AS speaker_house,
    m.full_title AS speaker_full_title,
    kp.value -> 'support'::text AS support,
    kp.value -> 'opposition'::text AS opposition,
    kp.value -> 'keywords'::text AS keywords,
    d.ai_topics,
    (
        SELECT DISTINCT jsonb_agg(DISTINCT subtopic)
        FROM jsonb_array_elements(d.ai_topics) t(topic),
             jsonb_array_elements(topic -> 'speakers') s(speaker),
             jsonb_array_elements_text(s.speaker -> 'subtopics') subtopic
        WHERE (s.speaker ->> 'memberId') = ((kp.value -> 'speaker'::text) ->> 'memberId'::text)
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
        WHEN ((kp.value -> 'speaker'::text) ->> 'memberId'::text) ~ '^[0-9]+$'::text 
        THEN ((kp.value -> 'speaker'::text) ->> 'memberId'::text)::integer
        ELSE NULL::integer
    END = m.member_id
WHERE ((kp.value -> 'speaker'::text) ->> 'memberId'::text) IS NOT NULL 
  AND ((kp.value -> 'speaker'::text) ->> 'memberId'::text) <> 'N/A'::text
ORDER BY d.id, d.date DESC;