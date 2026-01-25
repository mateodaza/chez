-- Add label and source_message_id columns to user_cooking_memory
-- Add feedback column to cook_session_messages
-- Note: Columns now included in base tables
-- This migration kept for history compatibility with existing deployments

ALTER TABLE user_cooking_memory
  ADD COLUMN IF NOT EXISTS label TEXT
  CHECK (label IN (
    'substitution_used',
    'technique_learned',
    'problem_solved',
    'preference_expressed',
    'modification_made',
    'doneness_preference',
    'ingredient_discovery'
  ));

ALTER TABLE user_cooking_memory
  ADD COLUMN IF NOT EXISTS source_message_id UUID REFERENCES cook_session_messages(id);

ALTER TABLE cook_session_messages
  ADD COLUMN IF NOT EXISTS feedback TEXT
  CHECK (feedback IN ('helpful', 'not_helpful'));

-- Indexes (IF NOT EXISTS not supported for indexes, so we use a safe pattern)
CREATE INDEX IF NOT EXISTS idx_user_cooking_memory_label
  ON user_cooking_memory(label) WHERE label IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cook_session_messages_feedback
  ON cook_session_messages(feedback) WHERE feedback IS NOT NULL;
