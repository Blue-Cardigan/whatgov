create or replace function get_user_voting_stats(
  p_user_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_interval text
) returns json as $$
declare
  result json;
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
begin
  -- Ensure valid date range
  v_start_date := greatest(
    date_trunc('hour', p_start_date),
    '2000-01-01 00:00:00Z'::timestamp with time zone
  );
  v_end_date := least(
    date_trunc('hour', p_end_date),
    current_timestamp
  );

  with user_votes as (
    select
      dv.debate_id,
      dv.vote,
      dv.created_at,
      d.ai_tags,
      d.ai_topics,
      d.ai_question_1,
      d.ai_question_1_topic,
      d.ai_question_1_ayes,
      d.ai_question_1_noes,
      d.ai_question_2,
      d.ai_question_2_topic,
      d.ai_question_2_ayes,
      d.ai_question_2_noes,
      d.ai_question_3,
      d.ai_question_3_topic,
      d.ai_question_3_ayes,
      d.ai_question_3_noes,
      d.speakers
    from debate_votes dv
    join debates d on d.id = dv.debate_id
    where dv.user_id = p_user_id
    and dv.created_at between v_start_date and v_end_date
  ),
  vote_counts as (
    select
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end) as aye_votes,
      sum(case when not vote then 1 else 0 end) as no_votes
    from user_votes
  ),
  debate_topics as (
    select
      uv.debate_id,
      uv.vote,
      uv.created_at,
      topic->>'name' as topic_name,
      topic->'subtopics' as subtopics,
      topic->'frequency' as frequency,
      uv.ai_tags,
      uv.ai_question_1,
      uv.ai_question_1_topic,
      uv.ai_question_1_ayes,
      uv.ai_question_1_noes,
      uv.ai_question_2,
      uv.ai_question_2_topic,
      uv.ai_question_2_ayes,
      uv.ai_question_2_noes,
      uv.ai_question_3,
      uv.ai_question_3_topic,
      uv.ai_question_3_ayes,
      uv.ai_question_3_noes,
      uv.speakers
    from user_votes uv,
    jsonb_array_elements(uv.ai_topics) as topic
  ),
  topic_details as (
    select
      topic_name,
      jsonb_build_object(
        'tags', ai_tags,
        'question_1', jsonb_build_object(
          'text', ai_question_1,
          'topic', ai_question_1_topic,
          'ayes', ai_question_1_ayes,
          'noes', ai_question_1_noes
        ),
        'question_2', jsonb_build_object(
          'text', ai_question_2,
          'topic', ai_question_2_topic,
          'ayes', ai_question_2_ayes,
          'noes', ai_question_2_noes
        ),
        'question_3', jsonb_build_object(
          'text', ai_question_3,
          'topic', ai_question_3_topic,
          'ayes', ai_question_3_ayes,
          'noes', ai_question_3_noes
        ),
        'speakers', speakers
      ) as detail
    from debate_topics
  ),
  topic_aggregates as (
    select
      topic_name,
      count(*) as total,
      sum(case when vote then 1 else 0 end) as ayes,
      sum(case when not vote then 1 else 0 end) as noes,
      array_agg(distinct subtopics) as subtopics,
      array_agg(distinct frequency) as frequency
    from debate_topics
    group by topic_name
  ),
  topic_details_agg as (
    select 
      topic_name,
      jsonb_agg(detail) as details
    from topic_details
    group by topic_name
  ),
  topic_stats as (
    select
      ta.topic_name,
      jsonb_build_object(
        'total', ta.total,
        'ayes', ta.ayes,
        'noes', ta.noes,
        'subtopics', ta.subtopics,
        'details', COALESCE(tda.details, '[]'::jsonb),
        'frequency', ta.frequency
      ) as topic_data
    from topic_aggregates ta
    left join topic_details_agg tda on tda.topic_name = ta.topic_name
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
  period_votes as (
    select
      date_trunc(p_interval, created_at) as period,
      topic_name,
      sum(case when vote then 1 else 0 end) as period_ayes,
      sum(case when not vote then 1 else 0 end) as period_noes
    from debate_topics
    group by period, topic_name
  ),
  vote_stats as (
    select
      ts.timestamp,
      coalesce(sum(pv.period_ayes), 0) as ayes,
      coalesce(sum(pv.period_noes), 0) as noes,
      jsonb_object_agg(
        pv.topic_name,
        jsonb_build_object(
          'ayes', sum(pv.period_ayes),
          'noes', sum(pv.period_noes)
        )
      ) filter (where pv.topic_name is not null) as topic_votes
    from time_series ts
    left join period_votes pv on pv.period = ts.timestamp
    group by ts.timestamp
  ),
  final_topic_stats as (
    select jsonb_object_agg(topic_name, topic_data) as topic_stats
    from topic_stats
  ),
  final_vote_stats as (
    select json_agg(
      json_build_object(
        'timestamp', timestamp,
        'userAyes', ayes,
        'userNoes', noes,
        'topicVotes', topic_votes
      ) order by timestamp
    ) as vote_stats
    from vote_stats
  )
  select json_build_object(
    'totalVotes', COALESCE(vc.total_votes, 0),
    'userAyeVotes', COALESCE(vc.aye_votes, 0),
    'userNoVotes', COALESCE(vc.no_votes, 0),
    'topic_stats', COALESCE(fts.topic_stats, '{}'::jsonb),
    'vote_stats', COALESCE(fvs.vote_stats, '[]'::json)
  ) into result
  from vote_counts vc
  cross join final_topic_stats fts
  cross join final_vote_stats fvs;

  return result;
end;
$$ language plpgsql security definer;