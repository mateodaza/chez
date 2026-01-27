-- Recipe knowledge base for RAG (global cooking knowledge)
CREATE TABLE recipe_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  doc_type TEXT CHECK (doc_type IN ('technique', 'substitution', 'tip', 'ingredient_info')),
  mode TEXT,
  skill_level TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User cooking memory for personalized RAG
CREATE TABLE user_cooking_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  memory_type TEXT CHECK (memory_type IN ('recipe_summary', 'qa_exchange', 'preference', 'cooking_note')),
  source_session_id UUID REFERENCES cook_sessions(id),
  source_message_id UUID REFERENCES cook_session_messages(id),
  label TEXT CHECK (label IN (
    'substitution_used',
    'technique_learned',
    'problem_solved',
    'preference_expressed',
    'modification_made',
    'doneness_preference',
    'ingredient_discovery'
  )),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Extraction logs for debugging and analytics
CREATE TABLE extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  source_url TEXT NOT NULL,
  extraction_method TEXT,
  extraction_layer INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  duration_ms INTEGER,
  cost_usd NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
