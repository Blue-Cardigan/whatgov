create or replace function match_chunks(
  query_embedding text,
  match_threshold float,
  match_count int
)
returns table (
  debate_id text,
  chunk_index int,
  similarity float,
  chunk_text text
)
language plpgsql
as $$
begin
  return query
  select
    dfc.debate_id,
    dfc.chunk_index,
    1 - (dfc.embedding <=> (query_embedding::vector)) as similarity,
    dfc.chunk_text
  from debate_file_chunks dfc
  where 1 - (dfc.embedding <=> (query_embedding::vector)) > match_threshold
  order by 1 - (dfc.embedding <=> (query_embedding::vector)) desc
  limit match_count;
end;
$$; 