-- Explicit permissions for check_rate_limit function
-- (Separated from declarative schema per audit requirements)
-- Note: This migration may already be applied if run via MCP

-- Block public access (anon and authenticated users)
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT) FROM anon, authenticated;

-- Grant access only to service role (Edge Functions)
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT) TO service_role;
