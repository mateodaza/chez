-- Migration: Fix audit issues from My Version feature
-- 1. Updates source_link_id FK to ON DELETE SET NULL
-- 2. Adds search_path to append_detected_learning RPC

-- Fix 1: Update source_link_id FK to ON DELETE SET NULL
-- This preserves session history when source links are deleted
ALTER TABLE cook_sessions
DROP CONSTRAINT IF EXISTS cook_sessions_source_link_id_fkey;

ALTER TABLE cook_sessions
ADD CONSTRAINT cook_sessions_source_link_id_fkey
FOREIGN KEY (source_link_id)
REFERENCES recipe_source_links(id)
ON DELETE SET NULL;

-- Fix 2: Recreate append_detected_learning with explicit search_path
-- This is a security best practice for SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION append_detected_learning(
  p_session_id UUID,
  p_learning JSONB
) RETURNS VOID AS $$
BEGIN
  -- Set search_path to prevent search_path hijacking
  SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-grant execute permission (preserved but explicit)
GRANT EXECUTE ON FUNCTION append_detected_learning(UUID, JSONB) TO authenticated;

-- Update comment
COMMENT ON FUNCTION append_detected_learning IS
'Atomically appends a learning object to a cook session''s detected_learnings array.
Validates session ownership before updating. Uses explicit search_path for security.';
