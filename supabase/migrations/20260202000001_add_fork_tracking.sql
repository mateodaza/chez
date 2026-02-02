-- Migration: Add fork tracking and version constraints
-- This migration adds support for forked recipes and ensures version number uniqueness

-- 1. Add fork tracking column
ALTER TABLE master_recipes
ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES master_recipes(id) ON DELETE SET NULL;

-- 2. Index for fork queries
CREATE INDEX IF NOT EXISTS idx_master_recipes_forked_from
ON master_recipes(forked_from_id)
WHERE forked_from_id IS NOT NULL;

-- 3. Ensure unique version numbers per recipe (prevents duplicate v2)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_recipe_version_number'
  ) THEN
    ALTER TABLE master_recipe_versions
    ADD CONSTRAINT unique_recipe_version_number
    UNIQUE (master_recipe_id, version_number);
  END IF;
END $$;

-- 4. Add 'fork' to allowed created_from_mode values
ALTER TABLE master_recipe_versions
DROP CONSTRAINT IF EXISTS master_recipe_versions_created_from_mode_check;

ALTER TABLE master_recipe_versions
ADD CONSTRAINT master_recipe_versions_created_from_mode_check
CHECK (created_from_mode = ANY (ARRAY['import'::text, 'edit'::text, 'cook_session'::text, 'source_apply'::text, 'fork'::text]));
