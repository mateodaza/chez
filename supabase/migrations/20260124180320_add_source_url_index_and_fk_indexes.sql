-- Add index for source_url lookups (duplicate checking)
CREATE INDEX IF NOT EXISTS idx_recipes_source_url ON recipes(source_url);

-- Add indexes for foreign key columns that were missing indexes
CREATE INDEX IF NOT EXISTS idx_user_cooking_memory_source_recipe_id ON user_cooking_memory(source_recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_cooking_memory_source_session_id ON user_cooking_memory(source_session_id);
