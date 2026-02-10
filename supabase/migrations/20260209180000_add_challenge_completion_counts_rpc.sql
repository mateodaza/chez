-- RPC: get_challenge_completion_counts
-- Returns the number of distinct users who completed each challenge recipe
-- within a given week window. Uses SECURITY DEFINER to bypass RLS on
-- cook_sessions (users can only see their own rows).

create or replace function public.get_challenge_completion_counts(
  p_recipe_ids uuid[],
  p_week_start timestamptz,
  p_week_end timestamptz
)
returns table(recipe_id uuid, completion_count bigint)
language sql
security definer
stable
as $$
  select
    cs.master_recipe_id as recipe_id,
    count(distinct cs.user_id) as completion_count
  from cook_sessions cs
  where cs.master_recipe_id = any(p_recipe_ids)
    and cs.is_complete = true
    and cs.completed_at >= p_week_start
    and cs.completed_at < p_week_end
  group by cs.master_recipe_id;
$$;

-- Allow authenticated users to call this RPC
grant execute on function public.get_challenge_completion_counts(uuid[], timestamptz, timestamptz) to authenticated;
