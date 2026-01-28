-- Add version lineage tracking columns to master_recipe_versions
-- Enables tracking of version derivation and creation context

-- Add parent_version_id for version lineage chain
ALTER TABLE master_recipe_versions
ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES master_recipe_versions(id) ON DELETE SET NULL;

-- Add session reference for cook session traceability
ALTER TABLE master_recipe_versions
ADD COLUMN IF NOT EXISTS created_from_session_id UUID REFERENCES cook_sessions(id) ON DELETE SET NULL;

-- Add creation mode enum for analytics and debugging
-- 'import' = first version from video import
-- 'edit' = manual ingredient/step edit on recipe detail
-- 'cook_session' = created from detected learnings after cooking
-- 'source_apply' = user applied steps/ingredients from a source comparison
ALTER TABLE master_recipe_versions
ADD COLUMN IF NOT EXISTS created_from_mode TEXT CHECK (created_from_mode IN ('import', 'edit', 'cook_session', 'source_apply'));

-- Add creation title for dropdown label clarity (e.g., "From Cook Session")
ALTER TABLE master_recipe_versions
ADD COLUMN IF NOT EXISTS created_from_title TEXT;

-- Indexes for version history queries
CREATE INDEX IF NOT EXISTS idx_versions_parent ON master_recipe_versions(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_versions_recipe_number ON master_recipe_versions(master_recipe_id, version_number DESC);

-- INTEGRITY: Ensure parent_version_id belongs to the same master_recipe
CREATE OR REPLACE FUNCTION check_parent_version_integrity()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_version_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM master_recipe_versions
      WHERE id = NEW.parent_version_id AND master_recipe_id = NEW.master_recipe_id
    ) THEN
      RAISE EXCEPTION 'parent_version_id must belong to the same master_recipe';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first to make idempotent)
DROP TRIGGER IF EXISTS trg_check_parent_version ON master_recipe_versions;
CREATE TRIGGER trg_check_parent_version
  BEFORE INSERT OR UPDATE ON master_recipe_versions
  FOR EACH ROW EXECUTE FUNCTION check_parent_version_integrity();

-- Backfill existing versions with lineage data
-- v1 versions: parent=null, mode='import'
-- v2+ versions: parent=previous version, mode='edit'
DO $$
DECLARE
  recipe_record RECORD;
  version_record RECORD;
  prev_version_id UUID;
BEGIN
  FOR recipe_record IN SELECT DISTINCT master_recipe_id FROM master_recipe_versions LOOP
    prev_version_id := NULL;

    FOR version_record IN
      SELECT id, version_number
      FROM master_recipe_versions
      WHERE master_recipe_id = recipe_record.master_recipe_id
      ORDER BY version_number ASC
    LOOP
      IF version_record.version_number = 1 THEN
        -- First version: no parent, mode is import
        UPDATE master_recipe_versions
        SET
          parent_version_id = NULL,
          created_from_mode = COALESCE(created_from_mode, 'import'),
          created_from_title = COALESCE(created_from_title, 'Original Import')
        WHERE id = version_record.id
        AND (parent_version_id IS NULL OR created_from_mode IS NULL OR created_from_title IS NULL);
      ELSE
        -- Subsequent versions: parent is previous, mode is edit
        UPDATE master_recipe_versions
        SET
          parent_version_id = COALESCE(parent_version_id, prev_version_id),
          created_from_mode = COALESCE(created_from_mode, 'edit'),
          created_from_title = COALESCE(created_from_title, 'Manual Edit')
        WHERE id = version_record.id
        AND (parent_version_id IS NULL OR created_from_mode IS NULL OR created_from_title IS NULL);
      END IF;

      prev_version_id := version_record.id;
    END LOOP;
  END LOOP;
END $$;
