-- Add outcome_tags column for storing completion feedback tags
ALTER TABLE cook_sessions
ADD COLUMN IF NOT EXISTS outcome_tags JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN cook_sessions.outcome_tags IS 'Quick feedback tags selected at session completion (e.g., "Perfect", "Made adjustments")';
