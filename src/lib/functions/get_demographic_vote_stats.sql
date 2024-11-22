create or replace function get_demographic_vote_stats(
  p_debate_id uuid default null,
  p_topic text default null,
  p_days integer default 30
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
      d.id as debate_id
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
  gender_stats as (
    select 
      gender,
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end)::float / count(*)::float as aye_percentage
    from filtered_votes
    where gender is not null
    group by gender
  ),
  age_stats as (
    select 
      age,
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end)::float / count(*)::float as aye_percentage
    from filtered_votes
    where age is not null
    group by age
  ),
  constituency_stats as (
    select 
      constituency,
      count(*) as total_votes,
      sum(case when vote then 1 else 0 end) as aye_votes,
      sum(case when not vote then 1 else 0 end) as no_votes
    from filtered_votes
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
          'aye_percentage', aye_percentage
        )
      )
      from gender_stats
    ),
    'age_breakdown', (
      select json_object_agg(
        age,
        json_build_object(
          'total_votes', total_votes,
          'aye_percentage', aye_percentage
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
          'no_votes', no_votes
        )
      )
      from constituency_stats
    )
  ) into result;

  return result;
end;
$$ language plpgsql security definer; 