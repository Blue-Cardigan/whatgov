create or replace function get_user_voting_stats(
  p_user_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_interval text -- 'hour' or 'day'
) returns json as $$
declare
  result json;
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
begin
  -- Ensure valid date range
  v_start_date := greatest(
    date_trunc('hour', p_start_date),
    '2000-01-01 00:00:00Z'::timestamp with time zone  -- Set a reasonable minimum date
  );
  v_end_date := least(
    date_trunc('hour', p_end_date),
    current_timestamp
  );

  -- Rest of the query using v_start_date and v_end_date instead of p_start_date and p_end_date
  with vote_counts as (
    select
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end) as aye_votes,
      sum(case when not vote then 1 else 0 end) as no_votes
    from debate_votes
    where user_id = p_user_id
    and created_at between v_start_date and v_end_date
  ),
  topic_votes as (
    select
      topic->>'name' as topic_name,
      jsonb_agg(distinct s.subtopic) as subtopics,
      count(*) as total,
      sum(case when dv.vote then 1 else 0 end) as ayes,
      sum(case when not dv.vote then 1 else 0 end) as noes,
      jsonb_agg(distinct jsonb_build_object(
        'tags', d.ai_tags,
        'question_1', jsonb_build_object(
          'text', d.ai_question_1,
          'topic', d.ai_question_1_topic,
          'ayes', d.ai_question_1_ayes,
          'noes', d.ai_question_1_noes
        ),
        'question_2', jsonb_build_object(
          'text', d.ai_question_2,
          'topic', d.ai_question_2_topic,
          'ayes', d.ai_question_2_ayes,
          'noes', d.ai_question_2_noes
        ),
        'question_3', jsonb_build_object(
          'text', d.ai_question_3,
          'topic', d.ai_question_3_topic,
          'ayes', d.ai_question_3_ayes,
          'noes', d.ai_question_3_noes
        ),
        'speakers', (
          select jsonb_agg(distinct speaker)
          from jsonb_array_elements_text(topic->'speakers') as speaker
        )
      )) as topic_details,
      jsonb_agg(distinct topic->'frequency') as frequency
    from debate_votes dv
    join debates d on d.id = dv.debate_id,
    jsonb_array_elements(d.ai_topics) as topic
    left join lateral jsonb_array_elements_text(topic->'subtopics') as s(subtopic) on true
    where dv.user_id = p_user_id
    and dv.created_at between v_start_date and v_end_date
    group by topic->>'name'
  ),
  topic_stats as (
    select
      jsonb_object_agg(
        topic_name,
        json_build_object(
          'total', total,
          'ayes', ayes,
          'noes', noes,
          'subtopics', subtopics,
          'details', topic_details,
          'frequency', frequency
        )
      ) as stats
    from topic_votes
  ),
  time_series as (
    select generate_series(
      date_trunc(p_interval, v_start_date),
      date_trunc(p_interval, v_end_date),
      case 
        when p_interval = 'hour' then '1 hour'::interval
        else '1 day'::interval
      end
    ) as timestamp
  ),
  vote_stats as (
    select
      ts.timestamp,
      coalesce(sum(case when dv.vote then 1 else 0 end), 0) as ayes,
      coalesce(sum(case when not dv.vote then 1 else 0 end), 0) as noes
    from time_series ts
    left join debate_votes dv on 
      date_trunc(p_interval, dv.created_at) = ts.timestamp
      and dv.user_id = p_user_id
    group by ts.timestamp
    order by ts.timestamp
  ),
  vote_stats_json as (
    select json_agg(
      json_build_object(
        'timestamp', timestamp,
        'ayes', ayes,
        'noes', noes
      )
      order by timestamp
    ) as stats
    from vote_stats
  )
  select json_build_object(
    'total_votes', COALESCE(vc.total_votes, 0),
    'aye_votes', COALESCE(vc.aye_votes, 0),
    'no_votes', COALESCE(vc.no_votes, 0),
    'topic_stats', coalesce(ts.stats, '{}'::jsonb),
    'vote_stats', coalesce(vs.stats, '[]'::json)
  ) into result
  from vote_counts vc
  left join topic_stats ts on true
  left join vote_stats_json vs on true;

  return result;
end;
$$ language plpgsql security definer;