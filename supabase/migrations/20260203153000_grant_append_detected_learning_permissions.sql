-- Explicit permissions for append_detected_learning RPC
-- Grants are not tracked by schema diff, so this must be versioned

-- Revoke access from anon/authenticated roles
revoke execute on function public.append_detected_learning(uuid, jsonb) from anon, authenticated;
revoke execute on function public.append_detected_learning(uuid, uuid, jsonb) from anon, authenticated;

-- Grant access to service role only
grant execute on function public.append_detected_learning(uuid, uuid, jsonb) to service_role;
