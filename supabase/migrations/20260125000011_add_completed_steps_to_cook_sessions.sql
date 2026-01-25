-- Add completed_steps column for non-linear step completion tracking
-- Note: Column now included in base table (20260124145701_create_cook_sessions_tables.sql)
-- This migration kept for history compatibility with existing deployments
ALTER TABLE cook_sessions
ADD COLUMN IF NOT EXISTS completed_steps JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN cook_sessions.completed_steps IS 'Array of step numbers that have been completed (supports non-linear completion)';
