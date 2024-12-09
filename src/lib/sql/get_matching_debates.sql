create or replace function get_matching_debates(
  p_members int[],
  p_members_filter_type text,
  p_parties text[],
  p_parties_filter_type text,
  p_subtopics text[],
  p_subtopics_filter_type text,
  p_house text,
  p_debate_types text[],
  p_days_of_week text[],
  p_date_from date default (current_date - interval '1 day'),
  p_date_to date default (current_date - interval '1 day')
) returns table (file_id text) as $$
declare
  query text;
begin
  -- Start building the query
  query := 'SELECT DISTINCT d.file_id FROM debates d 
           LEFT JOIN mp_key_points kp ON d.id = kp.debate_id
           WHERE d.file_id IS NOT NULL';
  
  -- House filter
  if p_house != 'Both' then
    query := query || format(' AND d.house = %L', p_house);
  end if;

  -- Debate type filters (always inclusive)
  if array_length(p_debate_types, 1) > 0 then
    query := query || format(' AND d.type = ANY(%L)', p_debate_types);
  end if;
  
  -- Date range filters
  if p_date_from is not null then
    query := query || format(' AND d.date >= %L', p_date_from);
  end if;
  
  if p_date_to is not null then
    query := query || format(' AND d.date <= %L', p_date_to);
  end if;
  
  -- Days of week filter
  if array_length(p_days_of_week, 1) > 0 then
    query := query || format(' AND d.day_of_week = ANY(%L)', p_days_of_week);
  end if;

  -- Member filters
  -- Both inclusive and exclusive: "at least one of"
  if array_length(p_members, 1) > 0 then
    if p_members_filter_type = 'inclusive' then
      -- Add all debates which include at least one
      query := query || ' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(d.speakers) s
        WHERE s->''memberId''::text = ANY(ARRAY[' || 
        array_to_string(p_members, ',') || ']::text[])
      )';
    else
      -- Include only debates which include at least one
      query := query || ' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(d.speakers) s
        WHERE s->''memberId''::text = ANY(ARRAY[' || 
        array_to_string(p_members, ',') || ']::text[])
      )';
    end if;
  end if;

  -- Party filters
  if array_length(p_parties, 1) > 0 then
    if p_parties_filter_type = 'inclusive' then
      query := query || ' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(d.speakers) s
        WHERE (s->>''party'') = ANY(' || quote_literal(p_parties) || ')
      )';
    else
      query := query || ' AND NOT EXISTS (
        SELECT 1 FROM unnest(' || quote_literal(p_parties) || '::text[]) p
        WHERE NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(d.speakers) s
          WHERE (s->>''party'') = p
        )
      )';
    end if;
  end if;

  -- Subtopic filters using mp_key_points
  if array_length(p_subtopics, 1) > 0 then
    if p_subtopics_filter_type = 'inclusive' then
      query := query || ' AND EXISTS (
        SELECT 1 FROM mp_key_points kp2
        WHERE kp2.debate_id = d.id
        AND kp2.speaker_subtopics ?| ' || quote_literal(p_subtopics) || '
      )';
    else
      query := query || ' AND NOT EXISTS (
        SELECT 1 FROM unnest(' || quote_literal(p_subtopics) || '::text[]) st
        WHERE NOT EXISTS (
          SELECT 1 FROM mp_key_points kp2
          WHERE kp2.debate_id = d.id
          AND kp2.speaker_subtopics ? st
        )
      )';
    end if;
  end if;

  return query execute query;
end;
$$ language plpgsql security definer;