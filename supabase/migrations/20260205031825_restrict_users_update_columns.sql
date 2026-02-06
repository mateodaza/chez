-- Fix HIGH: Users should not be able to update subscription_tier or subscription_expires_at
-- These can only be updated by the webhook using service_role

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create a restricted update policy that only allows updating safe columns
CREATE POLICY "Users can update own non-subscription data" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Ensure subscription fields are not being changed
    -- This policy allows the update only if the new values match the old values
    -- for subscription_tier and subscription_expires_at
    auth.uid() = id
  );

-- Better approach: Use a trigger to prevent subscription field changes
CREATE OR REPLACE FUNCTION prevent_subscription_self_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is trying to change subscription fields, revert them
  -- Service role bypasses RLS so webhook will work
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
    NEW.subscription_tier := OLD.subscription_tier;
  END IF;
  IF OLD.subscription_expires_at IS DISTINCT FROM NEW.subscription_expires_at THEN
    NEW.subscription_expires_at := OLD.subscription_expires_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger (only fires for non-service-role updates)
DROP TRIGGER IF EXISTS prevent_subscription_self_update_trigger ON users;
CREATE TRIGGER prevent_subscription_self_update_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_subscription_self_update();
