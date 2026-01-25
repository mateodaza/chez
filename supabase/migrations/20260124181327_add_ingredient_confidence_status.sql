-- Add confidence status tracking for recipe ingredients
-- Note: Columns now included in base table (20260124145652_create_recipes_tables.sql)
-- This migration kept for history compatibility with existing deployments

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS confidence_status TEXT DEFAULT 'confirmed';

-- Add check constraint separately (Postgres requires this for ADD COLUMN)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipe_ingredients_confidence_status_check'
  ) THEN
    ALTER TABLE recipe_ingredients
      ADD CONSTRAINT recipe_ingredients_confidence_status_check
      CHECK (confidence_status IN ('confirmed', 'needs_review', 'inferred'));
  END IF;
END $$;

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS suggested_correction TEXT;

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS user_verified BOOLEAN DEFAULT false;
