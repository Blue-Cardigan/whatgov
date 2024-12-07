create or replace function get_topic_vote_stats(p_mp_name text default null) returns json as $$
begin
  return (
    with topic_votes as (
      select
        t.value->>'name' as topic,
        count(distinct dv.id) as user_votes,
        sum(case when dv.vote then 1 else 0 end) as user_ayes,
        sum(case when not dv.vote then 1 else 0 end) as user_noes,
        sum(coalesce(d.ai_question_ayes, 0)) as anon_ayes,
        sum(coalesce(d.ai_question_noes, 0)) as anon_noes,
        jsonb_agg(distinct t.value->'speakers') as speakers,
        jsonb_agg(distinct t.value->'subtopics') as subtopics,
        count(distinct dv.id)::float / 
          (select count(distinct id) from debate_votes 
           where created_at >= date_trunc('month', current_date)) as frequency,
        jsonb_agg(
          json_build_object(
            'vote', dv.vote,
            'title', d.title,
            'topic', t.value->>'name',
            'question', coalesce(
              nullif(d.ai_question, ''),
              d.title
            ),
            'debate_id', d.id,
            'created_at', dv.created_at
          ) order by dv.created_at desc
        ) as vote_history
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
        topics.topic,
        (
          select jsonb_agg(q)::json
          from (
            select json_build_object(
              'question', coalesce(
                nullif(d2.ai_question, ''),
                d2.title
              ),
              'ayes', coalesce(
                nullif(d2.ai_question_ayes, 0),
                (select count(*) from debate_votes dv where dv.debate_id = d2.id and dv.vote = true)
              ),
              'noes', coalesce(
                nullif(d2.ai_question_noes, 0),
                (select count(*) from debate_votes dv where dv.debate_id = d2.id and dv.vote = false)
              )
            ) as q
            from debates d2
            cross join lateral jsonb_array_elements(d2.ai_topics::jsonb) as t2
            where t2.value->>'name' = topics.topic
            and exists (
              select 1 from debate_votes dv
              where dv.debate_id = d2.id
              and dv.created_at >= date_trunc('month', current_date)
            )
            order by (
              coalesce(
                nullif(d2.ai_question_ayes, 0) + nullif(d2.ai_question_noes, 0),
                (select count(*) from debate_votes dv where dv.debate_id = d2.id)
              )
            ) desc
            limit 3
          ) as subq
        ) as top_questions
      from (
        select distinct t.value->>'name' as topic
        from debates d
        cross join lateral jsonb_array_elements(d.ai_topics::jsonb) as t
        where exists (
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
      ) topics
    )
    select json_build_object(
      'topics', (
        select jsonb_object_agg(
          tv.topic,
          jsonb_build_object(
            'total_votes', tv.user_votes + (tv.anon_ayes + tv.anon_noes),
            'aye_votes', tv.user_ayes + tv.anon_ayes,
            'no_votes', tv.user_noes + tv.anon_noes,
            'top_questions', COALESCE(tq.top_questions, '[]'::json),
            'speakers', tv.speakers[1],
            'subtopics', tv.subtopics[1],
            'frequency', tv.frequency,
            'vote_history', tv.vote_history
          )
        )
        from topic_votes tv
        left join top_questions tq on tq.topic = tv.topic
      )
    )
  );
end;
$$ language plpgsql security definer; 