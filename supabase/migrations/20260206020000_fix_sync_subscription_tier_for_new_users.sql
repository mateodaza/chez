-- Fix: sync_subscription_tier must create user row first if it doesn't exist
-- This handles the case where a new user logs in and syncs before onboarding completes
-- Uses SECURITY DEFINER to access auth.users, but validates auth.uid() for security

CREATE OR REPLACE FUNCTION sync_subscription_tier(p_tier TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
BEGIN
  -- Must have a valid user context
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate tier value
  IF p_tier NOT IN ('free', 'chef') THEN
    RAISE EXCEPTION 'Invalid tier value: %', p_tier;
  END IF;

  -- Ensure user exists in public.users first (FK requirement)
  -- Get email from auth.users if we need to create
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

    INSERT INTO public.users (id, email, subscription_tier, created_at, updated_at)
    VALUES (v_user_id, COALESCE(v_email, 'unknown@temp.local'), p_tier, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Update user_rate_limits (upsert)
  INSERT INTO public.user_rate_limits (user_id, tier, updated_at)
  VALUES (v_user_id, p_tier, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    tier = p_tier,
    updated_at = NOW();

  -- Update users table subscription fields
  UPDATE public.users
  SET subscription_tier = p_tier, updated_at = NOW()
  WHERE id = v_user_id;
END;
$$;
