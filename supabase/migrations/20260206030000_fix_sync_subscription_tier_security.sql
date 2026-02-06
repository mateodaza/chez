-- Security fix: sync_subscription_tier can only downgrade to 'free'
-- Upgrades to 'chef' must come from webhook (using service_role)
-- This prevents client-side self-upgrade attacks

CREATE OR REPLACE FUNCTION sync_subscription_tier(p_tier TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_current_tier text;
BEGIN
  -- Must have a valid user context
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate tier value
  IF p_tier NOT IN ('free', 'chef') THEN
    RAISE EXCEPTION 'Invalid tier value: %', p_tier;
  END IF;

  -- SECURITY: Client can only sync to 'free' tier (for expired subscriptions)
  -- Upgrades to 'chef' require service_role (webhook) - they bypass RLS
  -- Check if this is a client call by checking if RLS is active
  IF p_tier = 'chef' THEN
    -- Get current tier to see if this is a no-op
    SELECT tier INTO v_current_tier
    FROM public.user_rate_limits
    WHERE user_id = v_user_id;

    -- If already chef, this is fine (no change)
    -- If not chef, block the upgrade attempt from client
    IF v_current_tier IS NULL OR v_current_tier != 'chef' THEN
      RAISE NOTICE 'Upgrade to chef tier must come from webhook';
      RETURN; -- Silently return instead of error to not break app flow
    END IF;
  END IF;

  -- Ensure user exists in public.users first (FK requirement)
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
