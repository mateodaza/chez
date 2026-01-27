-- Cook sessions table
CREATE TABLE cook_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  master_recipe_id UUID,  -- FK added after master_recipes table created
  version_id UUID,        -- FK added after master_recipe_versions table created
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  skill_level_used TEXT,
  scale_factor NUMERIC DEFAULT 1.0,
  current_step INTEGER DEFAULT 1,
  is_complete BOOLEAN DEFAULT false,
  outcome_rating INTEGER,
  outcome_notes TEXT,
  changes_made TEXT,
  voice_commands_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_steps JSONB DEFAULT '[]'::jsonb,
  outcome_tags JSONB DEFAULT '[]'::jsonb
);

-- Cook session messages table
CREATE TABLE cook_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES cook_sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  voice_response TEXT,
  current_step INTEGER,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  feedback TEXT CHECK (feedback IN ('helpful', 'not_helpful'))
);
