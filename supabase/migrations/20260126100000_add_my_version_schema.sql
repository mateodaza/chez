-- Migration: Add My Version Feature Schema
-- Adds detected_learnings column and source_link_id FK to cook_sessions
-- Creates append_detected_learning RPC function for atomic JSONB array operations

-- Add detected_learnings column for storing learnings captured during cooking
ALTER TABLE cook_sessions
ADD COLUMN IF NOT EXISTS detected_learnings JSONB DEFAULT '[]'::jsonb;

-- Add source_link_id to track which source the user cooked from
ALTER TABLE cook_sessions
ADD COLUMN IF NOT EXISTS source_link_id UUID REFERENCES recipe_source_links(id);

-- Create index on source_link_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_cook_sessions_source_link_id
ON cook_sessions(source_link_id)
WHERE source_link_id IS NOT NULL;

-- RPC function for atomic append to detected_learnings array
-- Using SECURITY DEFINER so it can be called by authenticated users
-- NOTE: This initial version is superseded by 20260126200000_fix_my_version_audit_issues.sql
-- which adds explicit search_path for security hardening
CREATE OR REPLACE FUNCTION append_detected_learning(
  p_session_id UUID,
  p_learning JSONB
) RETURNS VOID AS $$
BEGIN
  -- Verify the session exists and belongs to the calling user
  IF NOT EXISTS (
    SELECT 1 FROM cook_sessions
    WHERE id = p_session_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;

  -- Atomically append the learning to the JSONB array
  UPDATE cook_sessions
  SET detected_learnings = COALESCE(detected_learnings, '[]'::jsonb) || p_learning
  WHERE id = p_session_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION append_detected_learning(UUID, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION append_detected_learning IS
'Atomically appends a learning object to a cook session''s detected_learnings array.
Validates session ownership before updating.';

-- Add based_on_source_id to master_recipe_versions if not exists
-- This tracks which source link a version was derived from
ALTER TABLE master_recipe_versions
ADD COLUMN IF NOT EXISTS based_on_source_id UUID REFERENCES recipe_source_links(id);

-- Create index for based_on_source_id lookups
CREATE INDEX IF NOT EXISTS idx_master_recipe_versions_based_on_source
ON master_recipe_versions(based_on_source_id)
WHERE based_on_source_id IS NOT NULL;

-- Add change_notes column for documenting version changes
ALTER TABLE master_recipe_versions
ADD COLUMN IF NOT EXISTS change_notes TEXT;
