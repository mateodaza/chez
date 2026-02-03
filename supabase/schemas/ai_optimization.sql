-- AI Cost Optimization Schema
-- Declarative schema for cost tracking, rate limiting, and AI routing

-- Cost tracking per request (service-role only)
CREATE TABLE IF NOT EXISTS public.ai_cost_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.cook_sessions(id) ON DELETE SET NULL,
  operation TEXT NOT NULL CHECK (operation IN ('cook_chat', 'recipe_import', 'embedding')),
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  intent TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost_usd NUMERIC(10, 6) NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.ai_cost_logs IS 'Tracks AI API usage and costs per request for analytics and billing';
COMMENT ON COLUMN public.ai_cost_logs.operation IS 'Type of AI operation: cook_chat, recipe_import, or embedding';
COMMENT ON COLUMN public.ai_cost_logs.cost_usd IS 'Cost in USD (up to 6 decimal places for micro-transactions)';

-- Rate limiting (service-role only)
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'chef')),
  daily_chat_messages INTEGER DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.user_rate_limits IS 'Rate limiting state per user, auto-resets daily';
COMMENT ON COLUMN public.user_rate_limits.daily_chat_messages IS 'Count of chat messages today, enforced atomically in check_rate_limit()';
COMMENT ON COLUMN public.user_rate_limits.reset_date IS 'Date of last reset, used to detect day rollover';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_user_date ON public.ai_cost_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_session ON public.ai_cost_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_operation ON public.ai_cost_logs(operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_reset ON public.user_rate_limits(reset_date);

-- Enable RLS (service-role only access, no policies = service role bypass)
ALTER TABLE public.ai_cost_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies = service-role only (Edge Functions use service key)

-- Atomic rate limit check with row locking (single atomic operation)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_tier TEXT DEFAULT 'free'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_limit INTEGER;
  v_current INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Set limits based on tier
  v_limit := CASE
    WHEN p_tier = 'chef' THEN 500
    ELSE 20
  END;

  -- Atomic upsert with row lock
  INSERT INTO public.user_rate_limits (user_id, tier, daily_chat_messages, reset_date)
  VALUES (p_user_id, p_tier, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    -- Reset counter if new day
    daily_chat_messages = CASE
      WHEN public.user_rate_limits.reset_date < CURRENT_DATE THEN 0
      ELSE public.user_rate_limits.daily_chat_messages
    END,
    reset_date = GREATEST(public.user_rate_limits.reset_date, CURRENT_DATE),
    tier = p_tier,
    updated_at = now();

  -- Atomic increment with conditional update (prevents race condition)
  UPDATE public.user_rate_limits
  SET daily_chat_messages = daily_chat_messages + 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND daily_chat_messages < v_limit
  RETURNING daily_chat_messages INTO v_current;

  -- Check if update succeeded
  v_allowed := (v_current IS NOT NULL);

  -- If denied, get current count
  IF NOT v_allowed THEN
    SELECT daily_chat_messages INTO v_current
    FROM public.user_rate_limits
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current', v_current,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_current)
  );
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit IS 'Atomically checks and increments rate limit. Returns allowed=true if under limit, false if exceeded. Single atomic UPDATE prevents race conditions.';

-- Note: Function permissions are set in migration (not tracked by db diff)
-- No cleanup needed: rate limits auto-reset daily, cost logs can grow indefinitely
