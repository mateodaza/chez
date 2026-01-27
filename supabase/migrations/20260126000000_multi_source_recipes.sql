-- Multi-Source Recipe Architecture Migration
-- Enables: global video caching, per-user master recipes, immutable versions, source linking

-- =====================================================
-- TABLE 1: video_sources (Global, shared across users)
-- Caches video transcripts to avoid re-extraction
-- =====================================================
CREATE TABLE video_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Video identity (globally unique, NORMALIZED URL)
  source_url TEXT UNIQUE NOT NULL,
  source_url_hash TEXT GENERATED ALWAYS AS (md5(source_url)) STORED,
  source_platform TEXT,
  video_id TEXT,

  -- Cached extraction (shared across users)
  source_creator TEXT,
  source_thumbnail_url TEXT,
  raw_transcript TEXT,
  raw_caption TEXT,
  extracted_title TEXT,
  extracted_description TEXT,

  -- Extraction metadata
  extraction_method TEXT,
  extraction_layer INTEGER,
  extraction_confidence NUMERIC,

  -- Timestamps
  first_imported_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for video_sources
CREATE INDEX idx_video_sources_url ON video_sources(source_url);
CREATE INDEX idx_video_sources_hash ON video_sources(source_url_hash);
CREATE INDEX idx_video_sources_platform ON video_sources(source_platform);

-- =====================================================
-- TABLE 2: master_recipes (Per-user, the user's evolving recipe)
-- The user's personal recipe that groups sources and tracks their journey
-- =====================================================
CREATE TABLE master_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Current state (editable by user)
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('cooking', 'mixology', 'pastry')),
  cuisine TEXT,
  category TEXT,

  -- Version tracking (FK added after versions table created)
  current_version_id UUID,

  -- User engagement
  times_cooked INTEGER DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'planned', 'cooked')),
  planned_for DATE,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_notes TEXT,

  -- Display (FK to video_sources for thumbnail URL access)
  cover_video_source_id UUID REFERENCES video_sources(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for master_recipes
CREATE INDEX idx_master_recipes_user ON master_recipes(user_id);
CREATE INDEX idx_master_recipes_status ON master_recipes(user_id, status);
CREATE INDEX idx_master_recipes_updated ON master_recipes(updated_at DESC);

-- =====================================================
-- TABLE 3: master_recipe_versions (Immutable snapshots)
-- Each edit creates a new version. Cook sessions link here.
-- =====================================================
CREATE TABLE master_recipe_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_recipe_id UUID NOT NULL REFERENCES master_recipes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Full snapshot (immutable once created)
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL,
  cuisine TEXT,
  category TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER,
  servings_unit TEXT,
  difficulty_score INTEGER,

  -- Structured data as JSONB (preserves confidence, status, etc.)
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',

  -- Version metadata
  change_notes TEXT,

  -- Outcome (filled after cooking)
  outcome_rating INTEGER CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
  outcome_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enforce unique version numbers per master recipe
CREATE UNIQUE INDEX idx_versions_unique ON master_recipe_versions(master_recipe_id, version_number);
CREATE INDEX idx_versions_master ON master_recipe_versions(master_recipe_id);

-- Add FK from master_recipes to current_version_id now that versions table exists
ALTER TABLE master_recipes
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES master_recipe_versions(id) ON DELETE SET NULL;

-- =====================================================
-- TABLE 4: recipe_source_links (Per-user link to video sources)
-- Connects a user's master recipe to video sources with their extracted recipe
-- =====================================================
CREATE TABLE recipe_source_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_recipe_id UUID REFERENCES master_recipes(id) ON DELETE CASCADE,
  video_source_id UUID NOT NULL REFERENCES video_sources(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- User's extracted recipe from this source (immutable)
  extracted_ingredients JSONB NOT NULL DEFAULT '[]',
  extracted_steps JSONB NOT NULL DEFAULT '[]',
  extracted_title TEXT,
  extracted_description TEXT,
  extracted_mode TEXT,
  extracted_cuisine TEXT,
  extraction_confidence NUMERIC,

  -- Link status
  link_status TEXT DEFAULT 'linked' CHECK (link_status IN ('pending', 'linked', 'rejected')),

  -- Timestamps
  imported_at TIMESTAMPTZ DEFAULT now(),
  linked_at TIMESTAMPTZ
);

-- Allow re-import after rejection: unique only for non-rejected links
CREATE UNIQUE INDEX idx_source_links_unique
  ON recipe_source_links(user_id, video_source_id)
  WHERE link_status != 'rejected';
CREATE INDEX idx_source_links_master ON recipe_source_links(master_recipe_id);
CREATE INDEX idx_source_links_pending ON recipe_source_links(user_id, link_status) WHERE link_status = 'pending';
CREATE INDEX idx_source_links_video ON recipe_source_links(video_source_id);

-- Add based_on_source_id FK to master_recipe_versions (for tracking which source a version came from)
ALTER TABLE master_recipe_versions
  ADD COLUMN based_on_source_id UUID REFERENCES recipe_source_links(id) ON DELETE SET NULL;

-- =====================================================
-- TABLE 5: Update cook_sessions
-- Add FK constraints for master_recipe_id and version_id (columns already exist in base table)
-- =====================================================
ALTER TABLE cook_sessions
  ADD CONSTRAINT cook_sessions_master_recipe_id_fkey
  FOREIGN KEY (master_recipe_id) REFERENCES master_recipes(id) ON DELETE SET NULL;

ALTER TABLE cook_sessions
  ADD CONSTRAINT cook_sessions_version_id_fkey
  FOREIGN KEY (version_id) REFERENCES master_recipe_versions(id) ON DELETE SET NULL;

CREATE INDEX idx_cook_sessions_master ON cook_sessions(master_recipe_id);
CREATE INDEX idx_cook_sessions_version ON cook_sessions(version_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- video_sources: Users can only read sources they've linked
ALTER TABLE video_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read video sources they have linked"
  ON video_sources FOR SELECT
  USING (id IN (SELECT video_source_id FROM recipe_source_links WHERE user_id = auth.uid()));

-- master_recipes: Users can manage their own
ALTER TABLE master_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own master recipes"
  ON master_recipes FOR ALL
  USING (auth.uid() = user_id);

-- master_recipe_versions: Inherit from master_recipes
ALTER TABLE master_recipe_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage versions of their master recipes"
  ON master_recipe_versions FOR ALL
  USING (master_recipe_id IN (SELECT id FROM master_recipes WHERE user_id = auth.uid()));

-- recipe_source_links: Users can manage their own
ALTER TABLE recipe_source_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own source links"
  ON recipe_source_links FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- INTEGRITY TRIGGERS
-- =====================================================

-- Ensure current_version_id belongs to this master recipe
CREATE OR REPLACE FUNCTION check_current_version_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_version_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM master_recipe_versions
      WHERE id = NEW.current_version_id AND master_recipe_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'current_version_id must belong to this master recipe';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_current_version
  BEFORE INSERT OR UPDATE ON master_recipes
  FOR EACH ROW EXECUTE FUNCTION check_current_version_integrity();

-- Ensure cover_video_source_id belongs to this master recipe's linked sources
CREATE OR REPLACE FUNCTION check_cover_source_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cover_video_source_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM recipe_source_links
      WHERE video_source_id = NEW.cover_video_source_id
        AND master_recipe_id = NEW.id
        AND link_status = 'linked'
    ) THEN
      RAISE EXCEPTION 'cover_video_source_id must be a linked source of this master recipe';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_cover_source
  BEFORE INSERT OR UPDATE ON master_recipes
  FOR EACH ROW EXECUTE FUNCTION check_cover_source_integrity();

-- Auto-null cover_video_source_id when source link is deleted or rejected
CREATE OR REPLACE FUNCTION nullify_cover_source_on_unlink()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE master_recipes
    SET cover_video_source_id = NULL
    WHERE id = OLD.master_recipe_id AND cover_video_source_id = OLD.video_source_id;
    RETURN OLD;
  END IF;
  -- Handle UPDATE (status changed to rejected)
  IF TG_OP = 'UPDATE' AND NEW.link_status = 'rejected' AND OLD.link_status != 'rejected' THEN
    UPDATE master_recipes
    SET cover_video_source_id = NULL
    WHERE id = NEW.master_recipe_id AND cover_video_source_id = NEW.video_source_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nullify_cover_on_unlink
  AFTER DELETE OR UPDATE ON recipe_source_links
  FOR EACH ROW EXECUTE FUNCTION nullify_cover_source_on_unlink();

-- Auto-update updated_at on master_recipes
CREATE OR REPLACE FUNCTION update_master_recipe_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_master_recipe_timestamp
  BEFORE UPDATE ON master_recipes
  FOR EACH ROW EXECUTE FUNCTION update_master_recipe_timestamp();

-- =====================================================
-- HELPER FUNCTION: Get next version number
-- =====================================================
CREATE OR REPLACE FUNCTION get_next_version_number(p_master_recipe_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next
  FROM master_recipe_versions
  WHERE master_recipe_id = p_master_recipe_id;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

