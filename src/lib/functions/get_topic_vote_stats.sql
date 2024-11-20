create or replace function get_topic_vote_stats(p_mp_name text default null) returns json as $$
begin
  return (
    with topic_votes as (
      select
        t.value->>'name' as topic,
        count(distinct dv.id) as total_votes,
        sum(case when dv.vote then 1 else 0 end) as aye_votes,
        sum(case when not dv.vote then 1 else 0 end) as no_votes,
        jsonb_agg(distinct t.value->'speakers') as speakers,
        jsonb_agg(distinct t.value->'subtopics') as subtopics
      from debate_votes dv
      join debates d on d.id = dv.debate_id
      cross join lateral jsonb_array_elements(d.ai_topics::jsonb) as t
      where t.value->>'name' is not null
      and dv.created_at >= date_trunc('month', current_date)
      and (
        p_mp_name is null 
        or exists (
          select 1
          from jsonb_array_elements_text(t.value->'speakers') as speaker
          where speaker = p_mp_name
        )
      )
      group by t.value->>'name'
    ),
    top_questions as (
      select
        t.value->>'name' as topic,
        json_agg(
          json_build_object(
            'question', d.title,
            'ayes', (
              select count(*) 
              from debate_votes dv 
              where dv.debate_id = d.id 
              and dv.vote = true
            ),
            'noes', (
              select count(*) 
              from debate_votes dv 
              where dv.debate_id = d.id 
              and dv.vote = false
            )
          )
          order by (
            select count(*) 
            from debate_votes dv 
            where dv.debate_id = d.id
          ) desc
        ) filter (where d.title is not null) as top_questions
      from debates d
      cross join lateral jsonb_array_elements(d.ai_topics::jsonb) as t
      where t.value->>'name' is not null
      and exists (
        select 1 from debate_votes dv
        where dv.debate_id = d.id
        and dv.created_at >= date_trunc('month', current_date)
      )
      and (
        p_mp_name is null 
        or exists (
          select 1
          from jsonb_array_elements_text(t.value->'speakers') as speaker
          where speaker = p_mp_name
        )
      )
      group by t.value->>'name'
    )
    select json_build_object(
      'topics', (
        select jsonb_object_agg(
          tv.topic,
          jsonb_build_object(
            'total_votes', tv.total_votes,
            'aye_votes', tv.aye_votes,
            'no_votes', tv.no_votes,
            'top_questions', COALESCE(tq.top_questions, '[]'::json),
            'speakers', tv.speakers[1],
            'subtopics', tv.subtopics[1]
          )
        )
        from topic_votes tv
        left join top_questions tq on tq.topic = tv.topic
      )
    )
  );
end;
$$ language plpgsql security definer; 