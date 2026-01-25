-- Add completed_steps column for non-linear step completion tracking
ALTER TABLE cook_sessions
ADD COLUMN IF NOT EXISTS completed_steps JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN cook_sessions.completed_steps IS 'Array of step numbers that have been completed (supports non-linear completion)';
