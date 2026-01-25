-- Add outcome_tags column for storing completion feedback tags
-- Note: Column now included in base table (20260124145701_create_cook_sessions_tables.sql)
-- This migration kept for history compatibility with existing deployments
ALTER TABLE cook_sessions
ADD COLUMN IF NOT EXISTS outcome_tags JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN cook_sessions.outcome_tags IS 'Quick feedback tags selected at session completion (e.g., "Perfect", "Made adjustments")';
