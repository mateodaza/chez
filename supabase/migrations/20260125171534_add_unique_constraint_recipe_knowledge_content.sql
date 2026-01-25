-- Add unique constraint on recipe_knowledge.content for proper upsert behavior
-- Using a hash index since content can be long text

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_knowledge_content_unique
ON recipe_knowledge (md5(content));
