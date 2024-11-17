create or replace function get_mp_key_points(
  p_mp_name text,
  p_limit int default 10
)
returns table (
  debate_id text,
  debate_title text,
  debate_date timestamp with time zone,
  point text,
  point_type text,
  original_speaker text
) language plpgsql security definer as $$
begin
  return query
  with key_points as (
    select 
      d.ext_id,
      d.title,
      d.date::timestamp with time zone,
      kp.value
    from debates d,
    jsonb_array_elements(d.ai_key_points) as kp
  )
  (
    -- Points made by the MP
    select 
      kp.ext_id as debate_id,
      kp.title as debate_title,
      kp.date as debate_date,
      kp.value->>'point' as point,
      'made' as point_type,
      null as original_speaker
    from key_points kp
    where kp.value->>'speaker' = p_mp_name
  )
  union all
  (
    -- Points supported by the MP
    select 
      kp.ext_id as debate_id,
      kp.title as debate_title,
      kp.date as debate_date,
      kp.value->>'point' as point,
      'supported' as point_type,
      kp.value->>'speaker' as original_speaker
    from key_points kp,
    jsonb_array_elements_text(kp.value->'support') as supporter
    where supporter = p_mp_name
  )
  union all
  (
    -- Points opposed by the MP
    select 
      kp.ext_id as debate_id,
      kp.title as debate_title,
      kp.date as debate_date,
      kp.value->>'point' as point,
      'opposed' as point_type,
      kp.value->>'speaker' as original_speaker
    from key_points kp,
    jsonb_array_elements_text(kp.value->'opposition') as opposer
    where opposer = p_mp_name
  )
  order by debate_date desc
  limit p_limit;
end;
$$;