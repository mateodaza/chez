-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('cooking', 'mixology', 'pastry')),
  source_platform TEXT,
  source_url TEXT,
  source_creator TEXT,
  source_thumbnail_url TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,
  servings INTEGER,
  servings_unit TEXT DEFAULT 'servings',
  category TEXT,
  cuisine TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  difficulty_score INTEGER CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
  original_skill_level TEXT,
  extraction_confidence NUMERIC,
  extraction_method TEXT,
  extraction_layer INTEGER,
  raw_transcript TEXT,
  raw_caption TEXT,
  is_favorite BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'planned', 'cooked')),
  planned_for DATE,
  variation_group_id UUID,
  parent_recipe_id UUID REFERENCES recipes(id),
  user_notes TEXT,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  times_cooked INTEGER DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recipe ingredients table
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id),
  item TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  preparation TEXT,
  original_text TEXT,
  grocery_category TEXT,
  is_optional BOOLEAN DEFAULT false,
  substitution_notes TEXT,
  allergens JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  confidence_status TEXT DEFAULT 'confirmed' CHECK (confidence_status IN ('confirmed', 'needs_review', 'inferred')),
  suggested_correction TEXT,
  user_verified BOOLEAN DEFAULT false
);

-- Recipe steps table
CREATE TABLE recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id),
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  duration_minutes INTEGER,
  timer_label TEXT,
  temperature_value INTEGER,
  temperature_unit TEXT,
  equipment JSONB DEFAULT '[]'::jsonb,
  techniques JSONB DEFAULT '[]'::jsonb,
  skill_adaptations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
