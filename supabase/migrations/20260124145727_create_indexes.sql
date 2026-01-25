-- Performance indexes

-- Users and preferences
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_mode ON recipes(mode);
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);

-- Recipe related
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);

-- Cook sessions
CREATE INDEX IF NOT EXISTS idx_cook_sessions_user_id ON cook_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cook_sessions_recipe_id ON cook_sessions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cook_session_messages_session_id ON cook_session_messages(session_id);

-- Grocery
CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_id ON grocery_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_grocery_list_id ON grocery_items(grocery_list_id);

-- RAG indexes
CREATE INDEX IF NOT EXISTS idx_recipe_knowledge_embedding ON recipe_knowledge
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_recipe_knowledge_content_search ON recipe_knowledge
  USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_user_cooking_memory_user_id ON user_cooking_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cooking_memory_embedding ON user_cooking_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_user_cooking_memory_label ON user_cooking_memory(label) WHERE label IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cook_session_messages_feedback ON cook_session_messages(feedback) WHERE feedback IS NOT NULL;

-- Extraction logs
CREATE INDEX IF NOT EXISTS idx_extraction_logs_platform_created ON extraction_logs(platform, created_at);
