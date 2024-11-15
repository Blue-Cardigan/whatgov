create or replace function get_user_voting_stats(
  p_user_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
) returns json as $$
declare
  result json;
begin
  with vote_counts as (
    select
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end) as aye_votes,
      sum(case when not vote then 1 else 0 end) as no_votes
    from debate_votes
    where user_id = p_user_id
    and created_at between p_start_date and p_end_date
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
    and dv.created_at between p_start_date and p_end_date
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
  weekly_votes as (
    select
      date_trunc('week', created_at)::date as week,
      sum(case when vote then 1 else 0 end) as ayes,
      sum(case when not vote then 1 else 0 end) as noes
    from debate_votes
    where user_id = p_user_id
    and created_at between p_start_date and p_end_date
    group by date_trunc('week', created_at)
  ),
  weekly_stats as (
    select
      json_agg(
        json_build_object(
          'week', week,
          'ayes', ayes,
          'noes', noes
        )
        order by week
      ) as stats
    from weekly_votes
  )
  select json_build_object(
    'total_votes', vc.total_votes,
    'aye_votes', vc.aye_votes,
    'no_votes', vc.no_votes,
    'topic_stats', coalesce(ts.stats, '{}'::jsonb),
    'weekly_stats', coalesce(ws.stats, '[]'::json)
  ) into result
  from vote_counts vc
  left join topic_stats ts on true
  left join weekly_stats ws on true;

  return result;
end;
$$ language plpgsql security definer;