-- Analytics Events Schema
-- Declarative schema for tracking user events (service-role only)

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  properties JSONB,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.analytics_events IS 'Tracks user events for analytics and product metrics';
COMMENT ON COLUMN public.analytics_events.event_name IS 'Event type: user_signed_up, recipe_imported, cook_started, etc.';
COMMENT ON COLUMN public.analytics_events.properties IS 'Event-specific data (source, recipe_id, duration, etc.)';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name, created_at DESC);

-- Enable RLS (no policies = service-role only, same pattern as ai_cost_logs)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
-- No policies = service-role only (Edge Functions use service key)
