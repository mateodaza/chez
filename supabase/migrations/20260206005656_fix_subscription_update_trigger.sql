-- Fix: The trigger was blocking service_role updates too
-- Triggers fire regardless of RLS bypass, so we need to check the role

CREATE OR REPLACE FUNCTION prevent_subscription_self_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role can update anything (webhooks, admin operations)
  -- We check if auth.uid() is null (service role doesn't have a user context)
  -- or if the JWT role is 'service_role'
  IF auth.uid() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Regular authenticated users cannot change subscription fields
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
    NEW.subscription_tier := OLD.subscription_tier;
  END IF;
  IF OLD.subscription_expires_at IS DISTINCT FROM NEW.subscription_expires_at THEN
    NEW.subscription_expires_at := OLD.subscription_expires_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
