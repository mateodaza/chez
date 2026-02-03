-- Update append_detected_learning RPC to accept user_id parameter
-- This allows service-role calls without relying on auth.uid()

create or replace function public.append_detected_learning(
  p_session_id uuid,
  p_user_id uuid,
  p_learning jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if not exists (
    select 1
    from public.cook_sessions
    where id = p_session_id
      and user_id = p_user_id
  ) then
    raise exception 'session not found or access denied';
  end if;

  update public.cook_sessions
  set detected_learnings = coalesce(detected_learnings, '[]'::jsonb) || p_learning
  where id = p_session_id
    and user_id = p_user_id;
end;
$$;

comment on function public.append_detected_learning(uuid, uuid, jsonb) is
'Appends a learning object to a cook session for a specific user. Intended for service-role usage.';
