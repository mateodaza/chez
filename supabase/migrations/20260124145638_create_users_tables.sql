-- Users table (synced with Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,  -- Nullable to handle edge cases; UNIQUE allows multiple NULLs
  display_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  imports_this_month INTEGER DEFAULT 0,
  imports_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  cooking_skill_level TEXT DEFAULT 'home_cook',
  mixology_skill_level TEXT DEFAULT 'beginner',
  pastry_skill_level TEXT DEFAULT 'beginner',
  dietary_restrictions JSONB DEFAULT '[]'::jsonb,
  preferred_units TEXT DEFAULT 'imperial',
  voice_enabled BOOLEAN DEFAULT true,
  tts_speed NUMERIC DEFAULT 1.0,
  pantry_staples JSONB DEFAULT '[]'::jsonb,
  total_cooks INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
