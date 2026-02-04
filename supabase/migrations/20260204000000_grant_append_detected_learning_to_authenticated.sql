-- Grant append_detected_learning to authenticated users
-- The function already validates that user_id matches the session owner (p_user_id check),
-- so it's safe to allow authenticated users to call it from the client.
-- This enables the manual "Remember" and learning confirmation flows.

grant execute on function public.append_detected_learning(uuid, uuid, jsonb) to authenticated;

comment on function public.append_detected_learning(uuid, uuid, jsonb) is
'Appends a learning object to a cook session. User ownership is validated via p_user_id parameter. Safe for authenticated client calls.';
