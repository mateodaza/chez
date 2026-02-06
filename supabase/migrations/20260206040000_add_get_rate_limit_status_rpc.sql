-- Read-only rate limit status check (does NOT increment counter)
-- Used by cook screen and profile to display remaining messages
-- SECURITY DEFINER: bypasses RLS on user_rate_limits (no client policies)
-- Ownership guard: auth.uid() must match p_user_id (null-safe via IS DISTINCT FROM)
CREATE OR REPLACE FUNCTION public.get_rate_limit_status(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_current INTEGER;
  v_reset_date DATE;
BEGIN
  -- Null-safe ownership guard: NULL != NULL is NULL in PL/pgSQL, not TRUE
  IF p_user_id IS NULL OR auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to view rate limit for another user';
  END IF;

  SELECT tier, daily_chat_messages, reset_date
  INTO v_tier, v_current, v_reset_date
  FROM public.user_rate_limits
  WHERE user_id = p_user_id;

  -- Default for users with no rate limit row yet
  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_current := 0;
  ELSIF v_reset_date < CURRENT_DATE THEN
    -- Day has rolled over, counter is effectively 0
    v_current := 0;
  END IF;

  v_limit := CASE
    WHEN v_tier = 'chef' THEN 500
    ELSE 20
  END;

  RETURN jsonb_build_object(
    'current', v_current,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_current),
    'tier', v_tier
  );
END;
$$;

COMMENT ON FUNCTION public.get_rate_limit_status IS 'Read-only rate limit status check. SECURITY DEFINER bypasses RLS, null-safe auth.uid() guard ensures users can only query their own status.';

-- Revoke from PUBLIC first, then grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.get_rate_limit_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rate_limit_status(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_rate_limit_status(UUID) FROM anon;
