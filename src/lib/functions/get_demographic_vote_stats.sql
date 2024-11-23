create or replace function get_demographic_vote_stats(
  p_debate_id uuid default null,
  p_topic text default null,
  p_days integer default 14
) returns json as $$
declare
  result json;
begin
  with filtered_votes as (
    select 
      dv.vote,
      up.gender,
      up.age,
      up.constituency,
      d.ai_topics,
      d.id as debate_id,
      d.title,
      coalesce(
        nullif(d.ai_question_1, ''),
        nullif(d.ai_question_2, ''),
        nullif(d.ai_question_3, ''),
        d.title
      ) as question,
      dv.created_at
    from debate_votes dv
    join user_profiles up on up.id = dv.user_id
    join debates d on d.id = dv.debate_id
    where (p_debate_id is null or dv.debate_id = p_debate_id)
    and dv.created_at >= now() - (p_days || ' days')::interval
    and (
      p_topic is null 
      or exists (
        select 1
        from jsonb_array_elements(d.ai_topics) as t
        where t->>'name' = p_topic
      )
    )
  ),
  debate_stats as (
    select
      debate_id,
      question,
      created_at,
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end) as aye_votes,
      sum(case when not vote then 1 else 0 end) as no_votes
    from filtered_votes
    group by debate_id, question, created_at
    order by total_votes desc
    limit 10
  ),
  gender_stats as (
    select 
      gender,
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end)::float / nullif(count(*), 0)::float as aye_percentage,
      (
        select jsonb_agg(q)
        from (
          select distinct jsonb_build_object(
            'question', question,
            'total_votes', q_total_votes,
            'aye_votes', q_aye_votes,
            'no_votes', q_no_votes,
            'debate_id', debate_id,
            'created_at', q_created_at
          ) as q
          from (
            select 
              ds.question,
              ds.total_votes as q_total_votes,
              ds.aye_votes as q_aye_votes,
              ds.no_votes as q_no_votes,
              ds.debate_id,
              ds.created_at as q_created_at
            from debate_stats ds
            where ds.total_votes > 0
            order by ds.total_votes desc
          ) sorted_stats
        ) distinct_questions
      ) as questions
    from filtered_votes fv
    where gender is not null
    group by gender
  ),
  age_stats as (
    select 
      age,
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end)::float / count(*)::float as aye_percentage,
      jsonb_agg(
        distinct jsonb_build_object(
          'question', ds.question,
          'total_votes', ds.total_votes,
          'aye_votes', ds.aye_votes,
          'no_votes', ds.no_votes,
          'debate_id', ds.debate_id,
          'created_at', ds.created_at
        )
      ) as questions
    from filtered_votes fv
    join debate_stats ds on ds.debate_id = fv.debate_id
    where age is not null
    group by age
  ),
  constituency_stats as (
    select 
      constituency,
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end) as aye_votes,
      sum(case when not vote then 1 else 0 end) as no_votes,
      jsonb_agg(
        distinct jsonb_build_object(
          'question', ds.question,
          'total_votes', ds.total_votes,
          'aye_votes', ds.aye_votes,
          'no_votes', ds.no_votes,
          'debate_id', ds.debate_id,
          'created_at', ds.created_at
        )
      ) as questions
    from filtered_votes fv
    join debate_stats ds on ds.debate_id = fv.debate_id
    where constituency is not null
    group by constituency
  )
  select json_build_object(
    'user_demographics', (
      select json_build_object(
        'constituency', mode() within group (order by constituency),
        'gender', mode() within group (order by gender),
        'age_group', mode() within group (order by age)
      )
      from filtered_votes
    ),
    'gender_breakdown', (
      select json_object_agg(
        gender,
        json_build_object(
          'total_votes', total_votes,
          'aye_percentage', aye_percentage,
          'questions', questions
        )
      )
      from gender_stats
    ),
    'age_breakdown', (
      select json_object_agg(
        age,
        json_build_object(
          'total_votes', total_votes,
          'aye_percentage', aye_percentage,
          'questions', questions
        )
      )
      from age_stats
    ),
    'constituency_breakdown', (
      select json_object_agg(
        constituency,
        json_build_object(
          'total_votes', total_votes,
          'aye_votes', aye_votes,
          'no_votes', no_votes,
          'questions', questions
        )
      )
      from constituency_stats
    )
  ) into result;

  return result;
end;
$$ language plpgsql security definer; 