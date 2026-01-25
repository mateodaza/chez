# Chef AI - Implementation Plan

**Based on:** CHEF-AI-SPEC.md + Hive-Mind RAG patterns
**Goal:** Win the Shipyard Hackathon (Eitan Track)

---

## Progress Tracking

### Phase 1: Foundation ✅ COMPLETE

| Task                           | Status  | Notes                                            |
| ------------------------------ | ------- | ------------------------------------------------ |
| Create Expo project            | ✅ Done | SDK 54, TypeScript, New Architecture             |
| Install core dependencies      | ✅ Done | expo-router, supabase, zustand, react-query      |
| Set up project structure       | ✅ Done | app/, components/, lib/, hooks/, stores/, types/ |
| Configure ESLint 9 flat config | ✅ Done | typescript-eslint, eslint-config-expo            |
| Configure Prettier             | ✅ Done | .prettierrc with standard settings               |
| Set up Husky + lint-staged     | ✅ Done | Pre-commit hooks for linting/formatting          |
| Configure EAS Build            | ✅ Done | eas.json with dev/production profiles            |
| Create Apple App Store Connect | ✅ Done | Apple Developer approved, app ID: 6758271813     |
| Build and submit to TestFlight | ✅ Done | Build submitted via EAS, awaiting review         |

### Phase 2: Import Pipeline ✅ COMPLETE

| Task                     | Status  | Notes                                                        |
| ------------------------ | ------- | ------------------------------------------------------------ |
| Set up Supabase project  | ✅ Done | 12 tables, RLS, vector indexes, RPC functions                |
| Platform detection       | ✅ Done | lib/extraction/platform-detector.ts                          |
| YouTube extraction       | ✅ Done | Supadata API + free Innertube fallback for transcripts       |
| TikTok extraction        | ✅ Done | Supadata API for transcripts + metadata                      |
| Instagram extraction     | ✅ Done | Supadata API for transcripts + metadata                      |
| Claude recipe extraction | ✅ Done | Strict prompt to prevent ingredient substitution             |
| Import UI                | ✅ Done | URL validation, platform feedback, error handling            |
| Deploy Edge Function     | ✅ Done | Deployed with ANTHROPIC_API_KEY and SUPADATA_API_KEY secrets |
| Recipe library UI        | ✅ Done | Fetch and display user's saved recipes with pull-to-refresh  |
| Recipe detail screen     | ✅ Done | Ingredients, steps, source info, "Start Cooking" button      |
| Transcript reuse         | ✅ Done | Cross-user URL check to save API credits                     |
| Manual entry fallback    | ✅ Done | /manual-entry route for failed extractions                   |

### Phase 3: Core Features ✅ COMPLETE

| Task                       | Status      | Notes                                                |
| -------------------------- | ----------- | ---------------------------------------------------- |
| Recipe library UI          | ✅ Done     | Cards with mode emoji, platform badge, time          |
| Recipe detail screen       | ✅ Done     | Ingredients, steps, source, Start Cooking            |
| Ingredient confidence UI   | ✅ Done     | Yellow badges, tap-to-verify, original text          |
| Clipboard detection        | ✅ Done     | Auto-detect video URLs, paste button                 |
| Cook mode UI               | ✅ Done     | Chat-first experience with OpenAI TTS, spoken intro  |
| TTS integration            | ✅ Done     | OpenAI TTS via Edge Function, natural voice (nova)   |
| Step timers                | ✅ Done     | Quick timer buttons, voice alerts, concurrent timers |
| Voice input (STT)          | ✅ Done     | Toggle mic, Whisper API, auto-send on stop           |
| Session persistence        | ✅ Done     | Messages saved to DB, restored on resume             |
| Step progress persistence  | ✅ Done     | current_step saved, completed steps restored         |
| Grocery list consolidation | 🔲 Deferred | Moving to Phase 5 (nice-to-have for demo)            |

### Deferred Items (Post-Hackathon)

| Item                       | Reason                                           |
| -------------------------- | ------------------------------------------------ |
| Web recipe URL support     | Schema.org JSON-LD parsing - video import is MVP |
| AuthContext refactor       | Direct Supabase session checks work fine for now |
| Grocery list consolidation | Nice-to-have, not critical for hackathon demo    |

### TODO: Optional Native Dev Client

For faster on-device voice transcription, build a native dev client:

```bash
npx expo run:ios --device
```

This enables `expo-speech-recognition` (faster than Whisper API). Currently using `expo-audio` + Whisper API which works well.

### Phase 4: AI Chat + RAG ✅ COMPLETE

| Task                      | Status  | Notes                                                   |
| ------------------------- | ------- | ------------------------------------------------------- |
| TTS Edge Function         | ✅ Done | OpenAI TTS deployed, expo-audio for playback            |
| Chat UI in cook mode      | ✅ Done | Chat-first design with message bubbles                  |
| Whisper Edge Function     | ✅ Done | Voice-to-text via OpenAI Whisper API                    |
| Session message storage   | ✅ Done | cook_session_messages table populated during cooking    |
| Intent classification     | ✅ Done | 12 intents: technique, substitution, troubleshooting... |
| RAG pipeline              | ✅ Done | pgvector search, OpenAI embeddings, dual vector store   |
| Cook chat Edge Function   | ✅ Done | Claude responses with RAG context, skill-level adaption |
| Knowledge base seeding    | ✅ Done | 55 entries with embeddings, backfill script created     |
| User memory embeddings    | ✅ Done | embed-memory Edge Function with JWT auth + ownership    |
| Session → Memory pipeline | ✅ Done | Feedback intents create memories, embeddings generated  |

### Phase 5: Monetization 🔲 NOT STARTED

| Task             | Status | Notes                     |
| ---------------- | ------ | ------------------------- |
| RevenueCat setup | 🔲     | iOS + Android products    |
| Webhook sync     | 🔲     | subscription_tier updates |
| Paywall UI       | 🔲     | Monthly/annual options    |

### Phase 6: Polish + Demo 🔲 NOT STARTED

| Task           | Status | Notes                        |
| -------------- | ------ | ---------------------------- |
| Testing        | 🔲     | 20+ real video imports       |
| Demo prep      | 🔲     | Pre-loaded data, tested URLs |
| Demo recording | 🔲     | Backup video                 |

---

## Phase Overview

| Phase | Duration   | Focus           | Deliverable                                                  |
| ----- | ---------- | --------------- | ------------------------------------------------------------ |
| 1     | Days 1-3   | Foundation      | Project setup, Supabase, Auth, DB schema                     |
| 2     | Days 4-7   | Import Pipeline | YouTube + TikTok + Instagram\* import with Claude extraction |
| 3     | Days 8-12  | Core Features   | Recipe library, Grocery lists, Cook mode                     |
| 4     | Days 13-16 | AI Chat + RAG   | Cooking assistant with RAG-enhanced responses                |
| 5     | Days 17-19 | Monetization    | RevenueCat paywall integration                               |
| 6     | Days 20-21 | Polish + Demo   | Testing, polish, demo prep                                   |

> **Note:** Paywall moved earlier (Days 17-19) to ensure demo readiness by Week 3.
>
> \*Instagram is a **stretch goal** - only if YouTube + TikTok are solid. Fallback: caption-only extraction.

---

## Phase 1: Foundation (Days 1-3)

### 1.1 Project Setup

```bash
# Initialize Expo project
npx create-expo-app chef-ai --template expo-template-blank-typescript

# Key dependencies
expo install expo-router expo-secure-store expo-speech expo-haptics expo-keep-awake
npm install @supabase/supabase-js zustand @tanstack/react-query
npm install react-native-reanimated react-native-gesture-handler

# AI Services (Edge Functions)
# - Claude: Recipe extraction, cooking chat
# - OpenAI: Embeddings for RAG ($0.00002/1K tokens)
# - Groq: Grocery consolidation (llama-3.1-8b-instant, ~free)

# Voice: TTS for ALL users, STT for Pro in v1.1
# - expo-speech: Text-to-speech for reading steps/responses aloud (FREE for everyone)
# - NO speech-to-text (STT) in MVP - user types questions
# - STT will be Pro-only in v1.1 with expo-speech-recognition or whisper
```

### 1.2 Project Structure (Inspired by Hive-Mind)

```
chef-ai/
├── app/                      # Expo Router screens
│   ├── (auth)/               # Auth screens
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/               # Main tab screens
│   │   ├── index.tsx         # Home
│   │   ├── recipes.tsx       # Recipe library
│   │   ├── import.tsx        # Import screen
│   │   ├── lists.tsx         # Grocery lists
│   │   ├── profile.tsx       # Profile/settings
│   │   └── _layout.tsx
│   ├── recipe/
│   │   └── [id].tsx          # Recipe detail
│   ├── cook/
│   │   └── [id].tsx          # Cook mode
│   ├── onboarding/
│   │   ├── index.tsx
│   │   ├── modes.tsx
│   │   ├── skills.tsx
│   │   └── dietary.tsx
│   └── _layout.tsx
├── components/
│   ├── ui/                   # Reusable UI (buttons, cards, inputs)
│   ├── recipe/               # Recipe components
│   ├── cook/                 # Cook mode components
│   ├── grocery/              # Grocery list components
│   └── chat/                 # AI chat components
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── api/                  # API functions
│   │   ├── recipes.ts
│   │   ├── import.ts
│   │   ├── cook.ts
│   │   └── grocery.ts
│   ├── rag/                  # RAG system (inspired by hive-mind)
│   │   ├── vector-store.ts
│   │   ├── intent-classifier.ts
│   │   ├── rag-pipeline.ts
│   │   └── prompts.ts
│   └── extraction/           # Video extraction
│       ├── platform-detector.ts
│       ├── tiktok.ts
│       ├── youtube.ts
│       ├── instagram.ts
│       ├── whisper.ts
│       └── fallback-layers.ts  # Orchestrates Layer 1-5 fallbacks
├── hooks/                    # Custom React hooks
│   ├── use-auth.ts
│   ├── use-recipes.ts
│   ├── use-cook-session.ts
│   └── use-message-streaming.ts
├── stores/                   # Zustand stores
│   ├── auth-store.ts
│   ├── recipe-store.ts
│   └── cook-store.ts
├── types/                    # TypeScript types
│   ├── recipe.ts
│   ├── chat.ts
│   ├── rag.ts
│   └── database.ts
├── constants/
│   ├── modes.ts              # Cooking, Mixology, Pastry
│   ├── skills.ts             # Beginner, Home Cook, Chef
│   └── prompts.ts            # AI prompt templates
└── supabase/
    ├── migrations/           # SQL migrations
    └── functions/            # Edge functions
        ├── import-recipe/
        ├── cook-chat/
        ├── transcribe/
        └── _shared/
```

### 1.3 Supabase Setup

**Database Schema** (from spec + enhanced for RAG):

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  imports_this_month INTEGER DEFAULT 0,
  imports_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  cooking_skill_level TEXT DEFAULT 'home_cook',
  mixology_skill_level TEXT DEFAULT 'beginner',
  pastry_skill_level TEXT DEFAULT 'beginner',
  dietary_restrictions JSONB DEFAULT '[]',
  preferred_units TEXT DEFAULT 'imperial',

  -- Voice settings (TTS only for MVP, no wake word)
  voice_enabled BOOLEAN DEFAULT true,
  tts_speed DECIMAL DEFAULT 1.0,
  -- wake_word_enabled: deferred to v1.1 with STT

  pantry_staples JSONB DEFAULT '[]',

  -- Cooking stats
  total_cooks INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
  tags JSONB DEFAULT '[]',
  difficulty_score INTEGER CHECK (difficulty_score BETWEEN 1 AND 10),
  original_skill_level TEXT, -- detected skill level of original recipe

  -- Extraction metadata (per spec)
  extraction_confidence DECIMAL, -- 0.0 to 1.0
  extraction_method TEXT, -- scrapecreators, rapidapi, apify, whisper, manual
  extraction_layer INTEGER, -- 1-5 (which fallback layer succeeded)
  raw_transcript TEXT,
  raw_caption TEXT,

  -- Organization
  is_favorite BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'planned', 'cooked')),
  planned_for DATE,
  variation_group_id UUID, -- groups recipe variations together (v1.1)
  parent_recipe_id UUID REFERENCES recipes(id), -- if this is a variation (v1.1)
  user_notes TEXT,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  times_cooked INTEGER DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: recipe_versions and version_insights tables for iteration tracking
-- will be added in v1.1. See CHEF-AI-SPEC.md sections 4.2.10 and 4.2.11.

-- Recipe ingredients
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  quantity DECIMAL,
  unit TEXT,
  preparation TEXT,
  original_text TEXT,
  grocery_category TEXT,
  is_optional BOOLEAN DEFAULT false,
  substitution_notes TEXT, -- e.g., "can use vegetable broth instead"
  allergens JSONB DEFAULT '[]',
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe steps
CREATE TABLE recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  duration_minutes INTEGER,
  timer_label TEXT,
  temperature_value INTEGER,
  temperature_unit TEXT,
  equipment JSONB DEFAULT '[]',
  techniques JSONB DEFAULT '[]',
  skill_adaptations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cook sessions
CREATE TABLE cook_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  skill_level_used TEXT,
  scale_factor DECIMAL DEFAULT 1.0,
  current_step INTEGER DEFAULT 1,
  is_complete BOOLEAN DEFAULT false,
  outcome_rating INTEGER,
  outcome_notes TEXT,
  changes_made TEXT,
  voice_commands_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cook session messages (chat during cooking)
CREATE TABLE cook_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES cook_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  voice_response TEXT,
  current_step INTEGER,
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grocery lists
CREATE TABLE grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  recipe_ids JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grocery items
CREATE TABLE grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grocery_list_id UUID REFERENCES grocery_lists(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  quantity DECIMAL,
  unit TEXT,
  category TEXT,
  source_recipe_ids JSONB DEFAULT '[]',
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  is_manual BOOLEAN DEFAULT false,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG: Global cooking knowledge (techniques, substitutions, tips)
-- This is PUBLIC - no user_id, pre-seeded with cooking knowledge
CREATE TABLE recipe_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  doc_type TEXT CHECK (doc_type IN ('technique', 'substitution', 'tip', 'ingredient_info')),
  mode TEXT, -- cooking, mixology, pastry
  skill_level TEXT, -- beginner, home_cook, chef
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG: Per-user cooking memory (their recipes, Q&A history, preferences)
-- This is PRIVATE - has user_id, built from user's activity
CREATE TABLE user_cooking_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  memory_type TEXT CHECK (memory_type IN ('recipe_summary', 'qa_exchange', 'preference', 'cooking_note')),
  source_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  source_session_id UUID REFERENCES cook_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extraction logs
CREATE TABLE extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  source_url TEXT NOT NULL,
  extraction_method TEXT,
  extraction_layer INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  duration_ms INTEGER,
  cost_usd DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_mode ON recipes(mode);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
CREATE INDEX idx_cook_sessions_user_id ON cook_sessions(user_id);
CREATE INDEX idx_grocery_lists_user_id ON grocery_lists(user_id);
CREATE INDEX idx_recipe_knowledge_embedding ON recipe_knowledge
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_user_cooking_memory_embedding ON user_cooking_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_user_cooking_memory_user_id ON user_cooking_memory(user_id);
CREATE INDEX idx_extraction_logs_platform_created ON extraction_logs(platform, created_at);

-- RPC: Match global cooking knowledge (with doc_type filter)
CREATE OR REPLACE FUNCTION match_recipe_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_mode text DEFAULT NULL,
  filter_skill text DEFAULT NULL,
  filter_doc_types text[] DEFAULT NULL  -- NEW: filter by doc_type array
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  doc_type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rk.id,
    rk.content,
    rk.metadata,
    rk.doc_type,
    1 - (rk.embedding <=> query_embedding) AS similarity
  FROM recipe_knowledge rk
  WHERE
    1 - (rk.embedding <=> query_embedding) > match_threshold
    AND (filter_mode IS NULL OR rk.mode = filter_mode)
    AND (filter_skill IS NULL OR rk.skill_level = filter_skill)
    AND (filter_doc_types IS NULL OR rk.doc_type = ANY(filter_doc_types))
  ORDER BY rk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RPC: Match user-specific cooking memory
CREATE OR REPLACE FUNCTION match_user_memory(
  p_user_id uuid,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  memory_type text,
  similarity float
)
LANGUAGE plpgsql
SECURITY INVOKER  -- Uses caller's RLS permissions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.id,
    um.content,
    um.metadata,
    um.memory_type,
    1 - (um.embedding <=> query_embedding) AS similarity
  FROM user_cooking_memory um
  WHERE
    um.user_id = p_user_id
    AND 1 - (um.embedding <=> query_embedding) > match_threshold
  ORDER BY um.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recipes" ON recipes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recipe ingredients" ON recipe_ingredients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own recipe steps" ON recipe_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own cook sessions" ON cook_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own session messages" ON cook_session_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM cook_sessions WHERE cook_sessions.id = session_id AND cook_sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own grocery lists" ON grocery_lists
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own grocery items" ON grocery_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM grocery_lists WHERE grocery_lists.id = grocery_list_id AND grocery_lists.user_id = auth.uid())
  );

-- Public read for global recipe knowledge (pre-seeded, no user data)
CREATE POLICY "Anyone can read recipe knowledge" ON recipe_knowledge
  FOR SELECT USING (true);

-- User cooking memory is private (per-user RAG)
ALTER TABLE user_cooking_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cooking memory" ON user_cooking_memory
  FOR ALL USING (auth.uid() = user_id);
```

---

## Phase 2: Import Pipeline (Days 4-7)

### 2.1 Video Extraction Architecture

```
User pastes URL
       │
       ▼
┌─────────────────────┐
│ Platform Detection  │ → detectPlatform(url)
└──────────┬──────────┘
           │
     ┌─────┴─────┬─────────────┐
     ▼           ▼             ▼
  TikTok     YouTube      Instagram
     │           │             │
     ▼           ▼             ▼
┌─────────────────────────────────────────────────────┐
│ FALLBACK EXTRACTION LAYERS (per spec)               │
│                                                     │
│ LAYER 1: Native API (YouTube Data API)             │
│    ↓ Failed?                                       │
│ LAYER 2: Primary Scraper                           │
│    - TikTok: ScrapeCreators                        │
│    - Instagram: Apify Reel Scraper                 │
│    - YouTube: youtube-transcript-api               │
│    ↓ Failed?                                       │
│ LAYER 3: Backup Scraper (RapidAPI alternatives)    │
│    ↓ Failed?                                       │
│ LAYER 4: Audio Extraction + Whisper Transcription  │
│    ↓ Failed?                                       │
│ LAYER 5: Manual Entry (user types/pastes recipe)   │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Claude API          │
│ Recipe Extraction   │
│ + Mode Detection    │
│ + Confidence Score  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Save to Database    │
│ + Generate Embedding│
└─────────────────────┘
```

### 2.2 Platform-Specific Extraction Strategies

| Platform  | Layer 1 (Native)    | Layer 2 (Primary Scraper) | Layer 3 (Backup)         | Success Rate |
| --------- | ------------------- | ------------------------- | ------------------------ | ------------ |
| TikTok    | -                   | ScrapeCreators API        | RapidAPI TikTok Scraper7 | 85-92%       |
| Instagram | -                   | Apify Reel Scraper        | ScrapeCreators           | 80-90%       |
| YouTube   | YouTube Data API v3 | youtube-transcript-api    | -                        | 98%+         |

> **REQUIRED:** Test import with 20+ real cooking videos before demo (per spec)

### 2.3 Claude Recipe Extraction Prompt

```typescript
// lib/prompts/extraction.ts
export const RECIPE_EXTRACTION_PROMPT = `
You are a culinary AI assistant that extracts structured recipes from video
transcripts and captions. Analyze the provided content and extract a complete,
actionable recipe.

INPUT:
- Video transcript (spoken words from the video)
- Caption text (text overlay or description)
- Video title
- Creator name

OUTPUT: Return a JSON object with this exact structure:
{
  "title": "Recipe name",
  "description": "Brief description of the dish",
  "mode": "cooking" | "mixology" | "pastry",
  "category": "main_dish" | "appetizer" | "dessert" | "cocktail" | "bread" | ...,
  "cuisine": "italian" | "mexican" | "american" | ...,
  "prep_time_minutes": number | null,
  "cook_time_minutes": number | null,
  "servings": number,
  "servings_unit": "servings" | "drinks" | "cookies" | ...,
  "difficulty_score": 1-10,
  "ingredients": [
    {
      "item": "ingredient name",
      "quantity": number | null,
      "unit": "cups" | "oz" | "g" | "to taste" | null,
      "preparation": "diced" | "melted" | null,
      "original_text": "exact text from source",
      "grocery_category": "produce" | "dairy" | "meat" | "pantry" | "spices" | "bar",
      "allergens": ["dairy", "gluten", "nuts", ...]
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "instruction": "Clear instruction text",
      "duration_minutes": number | null,
      "temperature_value": number | null,
      "temperature_unit": "F" | "C" | null,
      "equipment": ["skillet", "whisk"],
      "techniques": ["sauté", "deglaze"]
    }
  ],
  "confidence": 0.0-1.0, // Overall extraction confidence score
  "confidence_notes": "Any uncertainties about the extraction"
}

MODE DETECTION RULES:
- MIXOLOGY: Contains spirits, oz measurements, cocktail terminology (shake, stir, muddle)
- PASTRY: Contains flour/sugar/butter as base, baking terminology (fold, cream, proof)
- COOKING: Default for savory dishes, proteins, vegetables

IMPORTANT:
- If quantities are not explicitly stated, make reasonable estimates
- If steps are implied but not stated, infer logical cooking steps
- Convert casual language to clear instructions
- Detect allergens: dairy, gluten, nuts, eggs, soy, shellfish, fish
- Flag low confidence in confidence_notes
`;
```

### 2.4 Edge Function: import-recipe

```typescript
// supabase/functions/import-recipe/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
});

serve(async (req) => {
  const { url, force_mode } = await req.json();
  const authHeader = req.headers.get("Authorization");

  // Get user from JWT
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Check import limits (free tier: 3/month) with monthly reset
  const { data: userData } = await supabase
    .from("users")
    .select("subscription_tier, imports_this_month, imports_reset_at")
    .eq("id", user.id)
    .single();

  // Reset counter if we're past the reset date
  let currentImports = userData?.imports_this_month || 0;
  const resetAt = userData?.imports_reset_at
    ? new Date(userData.imports_reset_at)
    : null;
  const now = new Date();

  if (resetAt && now > resetAt) {
    // It's a new month - reset the counter
    currentImports = 0;
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await supabase
      .from("users")
      .update({
        imports_this_month: 0,
        imports_reset_at: nextReset.toISOString(),
      })
      .eq("id", user.id);
  }

  if (userData?.subscription_tier === "free" && currentImports >= 3) {
    return new Response(
      JSON.stringify({
        error: "Import limit reached",
        upgrade_required: true,
        resets_at: userData.imports_reset_at,
      }),
      { status: 402 }
    );
  }

  try {
    // Step 1: Detect platform and extract content
    const platform = detectPlatform(url);
    const extraction = await extractContent(platform, url);

    // Step 2: Transcribe audio if needed
    let transcript = extraction.transcript;
    if (!transcript && extraction.audioUrl) {
      transcript = await transcribeAudio(extraction.audioUrl);
    }

    // Step 3: Extract recipe with Claude
    const recipe = await extractRecipe({
      transcript,
      caption: extraction.caption,
      title: extraction.title,
      creator: extraction.creator,
      forceMode: force_mode,
    });

    // Step 4: Save to database (destructure to exclude nested arrays)
    const {
      ingredients, // save separately
      steps, // save separately
      confidence,
      confidence_notes,
      ...recipeFields
    } = recipe;

    const { data: savedRecipe, error: saveError } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        ...recipeFields,
        source_platform: platform,
        source_url: url,
        source_creator: extraction.creator,
        source_thumbnail_url: extraction.thumbnailUrl,
        raw_transcript: transcript,
        raw_caption: extraction.caption,
        extraction_confidence: confidence, // 0.0-1.0 from Claude
        extraction_method: extraction.method, // scrapecreators, rapidapi, etc.
        extraction_layer: extraction.layer, // 1-5 (which fallback succeeded)
      })
      .select()
      .single();

    // Save ingredients (use destructured 'ingredients' from above)
    await supabase.from("recipe_ingredients").insert(
      ingredients.map((ing, i) => ({
        recipe_id: savedRecipe.id,
        ...ing,
        sort_order: i,
      }))
    );

    // Save steps (use destructured 'steps' from above)
    await supabase.from("recipe_steps").insert(
      steps.map((step) => ({
        recipe_id: savedRecipe.id,
        ...step,
      }))
    );

    // Increment import count (use currentImports, not stale userData)
    await supabase
      .from("users")
      .update({ imports_this_month: currentImports + 1 })
      .eq("id", user.id);

    // Generate embedding for user's recipe memory (for personalized RAG)
    const recipeSummary =
      `Recipe: ${recipeFields.title}. ${recipeFields.description || ""}. ` +
      `Cuisine: ${recipeFields.cuisine || "unknown"}. Mode: ${recipeFields.mode}. ` +
      `Ingredients: ${ingredients.map((i) => i.item).join(", ")}.`;

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: recipeSummary,
    });

    await supabase.from("user_cooking_memory").insert({
      user_id: user.id,
      content: recipeSummary,
      embedding: embeddingResponse.data[0].embedding,
      metadata: {
        recipe_id: savedRecipe.id,
        title: recipeFields.title,
        mode: recipeFields.mode,
        cuisine: recipeFields.cuisine,
      },
      memory_type: "recipe_summary",
      source_recipe_id: savedRecipe.id,
    });

    // Log extraction
    await supabase.from("extraction_logs").insert({
      platform,
      source_url: url,
      extraction_method: extraction.method,
      extraction_layer: extraction.layer,
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        recipe_id: savedRecipe.id,
        recipe: savedRecipe,
        extraction: {
          method: extraction.method,
          layer: extraction.layer,
          confidence: recipe.confidence,
        },
      })
    );
  } catch (error) {
    // Log failure
    await supabase.from("extraction_logs").insert({
      platform: detectPlatform(url),
      source_url: url,
      success: false,
      error_message: error.message,
    });

    return new Response(
      JSON.stringify({
        success: false,
        fallback_mode: true,
        message: "Could not extract automatically",
        manual_fields: ["title", "creator", "recipe_text"],
      }),
      { status: 422 }
    );
  }
});
```

---

## Phase 3: Core Features (Days 8-12)

### 3.1 Recipe Library

**Recipe States Flow:**

```
SAVED → PLANNED → COOKED
  │         │         │
  │         │         └── times_cooked++, last_cooked_at, user_rating
  │         └── planned_for date set, auto-add to grocery list
  └── initial state after import
```

**Key Screens:**

- `app/(tabs)/recipes.tsx` - Recipe library with filter tabs (All, Saved, Planned, Cooked)
- `app/recipe/[id].tsx` - Recipe detail with ingredients, steps, source video link
- Filter by: mode (cooking/mixology/pastry), status, favorites, cuisine
- Search recipes by title, ingredients, cuisine

**Key Features:**

- **Confidence display**: Show extraction confidence score (color-coded: green >0.8, yellow 0.6-0.8, red <0.6)
- **Allergen warnings**: Display allergen badges on recipe cards + detail view
- **Recipe edit**: Allow user to edit extracted recipe (title, ingredients, steps)
- **"Plan This" button**: Sets status to 'planned' + auto-adds ingredients to active grocery list

**Allergen Warning System:**

```typescript
// Check user dietary restrictions against recipe allergens
const userAllergens = userPreferences.dietary_restrictions; // e.g., ["dairy", "gluten"]
const recipeAllergens = ingredients.flatMap((i) => i.allergens); // e.g., ["dairy", "eggs"]
const conflicts = userAllergens.filter((a) => recipeAllergens.includes(a));

// Display warning banner if conflicts exist
if (conflicts.length > 0) {
  showAllergenWarning(conflicts); // "⚠️ Contains: dairy"
}
```

**Components:**

```typescript
// components/recipe/RecipeCard.tsx - with allergen badges
// components/recipe/RecipeDetail.tsx - with edit mode
// components/recipe/IngredientList.tsx - allergen highlighting
// components/recipe/StepList.tsx
// components/recipe/RecipeFilters.tsx
// components/recipe/AllergenWarning.tsx - conflict banner
// components/recipe/ConfidenceBadge.tsx - extraction confidence
```

### 3.2 Grocery Lists

**Consolidation Logic (Groq-powered for MVP):**

> **Why Groq instead of rule-based?**
>
> - Rule-based struggles with: "2 cups flour" + "500g flour" (unit conversion needs ingredient context)
> - Groq's LPU gives ~200-500 tokens/second latency (near-instant)
> - Cost: llama-3.1-8b-instant is ~$0.05/M input tokens (essentially free)
> - Reliability: LLM understands "garlic cloves" vs "minced garlic" as same ingredient

```typescript
// lib/api/grocery-consolidation.ts
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface ConsolidatedItem {
  item: string;
  quantity: string; // "3 cups" or "500g + 2 cups" if can't convert
  category: string;
  source_recipes: string[];
  notes?: string; // "couldn't combine: different forms"
}

export async function consolidateGroceryList(
  ingredients: Array<{
    item: string;
    quantity: number | null;
    unit: string | null;
    recipe_title: string;
    grocery_category: string;
  }>,
  pantryStaples: string[]
): Promise<ConsolidatedItem[]> {
  const prompt = `You are a grocery list optimizer. Combine these ingredients intelligently.

INGREDIENTS TO COMBINE:
${ingredients.map((i) => `- ${i.quantity || ""} ${i.unit || ""} ${i.item} (from: ${i.recipe_title})`).join("\n")}

PANTRY STAPLES (user already has, skip unless quantity is very large):
${pantryStaples.join(", ")}

RULES:
1. Combine same ingredients across recipes (e.g., "1 onion" + "2 onions" = "3 onions")
2. Convert units when possible using common cooking knowledge:
   - 1 cup flour ≈ 125g
   - 1 cup sugar ≈ 200g
   - 1 cup butter ≈ 227g (2 sticks)
   - 1 tbsp = 3 tsp
3. If units can't be combined (e.g., "2 cloves garlic" + "1 tbsp minced garlic"), list both
4. Skip pantry staples unless the recipe needs a LOT (e.g., "2 cups flour" still include)
5. Group by grocery category

Return JSON array:
[
  {
    "item": "flour, all-purpose",
    "quantity": "3 cups",
    "category": "pantry",
    "source_recipes": ["Pasta", "Bread"],
    "notes": null
  }
]`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant", // Fast and cheap
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.1, // Low temp for consistency
    max_tokens: 2000,
  });

  return JSON.parse(response.choices[0].message.content || "[]");
}
```

**Groq Setup:**

1. Sign up at https://console.groq.com
2. Get API key (free tier: 14,400 requests/day)
3. Add `GROQ_API_KEY` to Supabase Edge Function secrets

**Key Screens:**

- `app/(tabs)/lists.tsx` - Active grocery lists
- `app/list/[id].tsx` - List detail with checkable items

**Components:**

```typescript
// components/grocery/GroceryList.tsx
// components/grocery/GroceryItem.tsx - swipe to check/delete
// components/grocery/AddRecipeToList.tsx
// components/grocery/CategoryGroup.tsx - produce, dairy, meat, etc.
```

### 3.3 Cook Mode

**Cook Mode Flow:**

```
Start Cooking
     │
     ▼
┌─────────────────────────────────────┐
│ COOK MODE SCREEN                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Step 3 of 8                     │ │
│ │                                 │ │
│ │ "Heat olive oil in a large     │ │
│ │  skillet over medium-high      │ │
│ │  heat until shimmering"        │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Timer: 2:00]  [◀ Prev] [Next ▶]   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💬 Ask Chef AI...               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
     │
     ▼
Complete → Rate → Save Notes
```

**Key Features:**

- Large text for step display (auto-sizing)
- Multiple concurrent timers
- Step navigation (prev/next, swipe)
- Chat overlay (slides up from bottom)
- TTS read-aloud (tap speaker icon) - **FREE for all users**
- Keep screen awake during cooking
- Allergen warnings during cook mode (if recipe conflicts with dietary restrictions)

**Components:**

```typescript
// components/cook/CookModeScreen.tsx
// components/cook/StepDisplay.tsx - large, readable text
// components/cook/TimerBar.tsx - multiple timers
// components/cook/ChatOverlay.tsx - AI chat during cooking
// components/cook/CookProgress.tsx - step indicator
// components/cook/CompletionModal.tsx - rating + notes
```

---

## Phase 4: AI Chat System (Inspired by Hive-Mind)

> **Why RAG with OpenAI Embeddings (not Claude-only)?**
>
> - **Cost:** OpenAI embeddings cost $0.00002/1K tokens vs Claude chat at $3-15/M tokens
> - **Memory = Feature:** Store user's cooking history, past Q&A, learned preferences
> - **Performance:** Vector search returns relevant context in <100ms
> - **Approach:** Cheap embeddings for retrieval → focused context → Claude for response

### 3.1 Intent Classification for Cooking

```typescript
// lib/rag/intent-classifier.ts
export type CookingIntent =
  | "technique_question" // "What does sauté mean?"
  | "substitution_request" // "I don't have butter"
  | "troubleshooting" // "My sauce is too thin"
  | "timing_question" // "How long do I cook this?"
  | "temperature_question" // "What temp for medium rare?"
  | "ingredient_question" // "Can I add mushrooms?"
  | "scaling_question" // "How do I double this?"
  | "step_clarification" // "Can you explain step 3?"
  | "general_question"; // Fallback

export const INTENT_CLASSIFICATION_PROMPT = `
You are classifying a user's question during a cooking session.

CONTEXT:
- Recipe: {recipe_title}
- Mode: {mode} (cooking/mixology/pastry)
- Current step: {current_step} of {total_steps}
- User skill level: {skill_level}

USER MESSAGE: {message}

Classify the intent and determine:
1. intent: One of the CookingIntent types
2. requires_rag: Does this need knowledge base search?
3. doc_types: Which document types to search ['technique', 'substitution', 'tip', 'ingredient_info']
4. response_mode: 'quick' (under 50 words) | 'focused' (100-200) | 'detailed' (300+)

Return JSON:
{
  "intent": "technique_question",
  "requires_rag": true,
  "doc_types": ["technique"],
  "response_mode": "focused",
  "confidence": 0.9
}
`;
```

### 3.2 Cooking Chat Personas (Inspired by Hive-Mind)

```typescript
// lib/prompts/personas/cooking-mentor.ts
export const COOKING_MENTOR_PROMPT = `
You are Chef AI, an expert culinary mentor helping someone cook a recipe.

YOUR PERSONALITY:
- Warm, encouraging, patient
- Adapts to skill level naturally
- Uses sensory cues ("you'll hear a sizzle", "it should smell nutty")
- Never condescending, always supportive

SKILL LEVEL ADAPTATIONS:

FOR BEGINNER:
- Explain every technique in simple terms
- Include safety warnings naturally
- Give visual/audio/smell cues for doneness
- Offer reassurance ("Don't worry if...")

FOR HOME COOK:
- Use standard culinary terms
- Share tips for better results
- Mention common mistakes to avoid
- Assume basic technique knowledge

FOR CHEF:
- Use professional terminology freely
- Focus on precision and refinement
- Share advanced techniques
- Discuss the "why" behind techniques

CONTEXT:
- Recipe: {recipe_title}
- Mode: {mode}
- Current step: {current_step}
- User skill: {skill_level}

RESPONSE GUIDELINES:
- Be concise - user has messy hands
- Always provide a shorter 'voice_response' for TTS (under 30 words)
- Reference the current step when relevant
- If asked about technique, explain with practical tips

{rag_context}

Respond in JSON:
{
  "response": "Full text response",
  "voice_response": "Shorter TTS version"
}
`;

// lib/prompts/personas/substitution-expert.ts
export const SUBSTITUTION_EXPERT_PROMPT = `
You are a substitution expert helping a cook find alternatives.

CONTEXT:
- Recipe: {recipe_title}
- Mode: {mode}
- Missing ingredient: {ingredient}
- How it's used: {usage_context}
- User skill: {skill_level}

PROVIDE substitutions in tiers:
- BEST: Closest result
- GOOD: Acceptable result
- OK: Will work but different

FOR EACH TIER:
- What to use
- Ratio adjustment
- Technique changes needed
- Expected difference

MODE-SPECIFIC RULES:
- COOKING: Consider flavor, texture, cooking behavior
- MIXOLOGY: Stay within spirit categories, note ABV differences
- PASTRY: BE CAREFUL - warn about chemistry impacts

Return JSON:
{
  "ingredient": "heavy cream",
  "context": "for pasta sauce",
  "substitutions": [
    {
      "tier": "best",
      "substitute": "crème fraîche",
      "ratio": "1:1",
      "technique_change": "Add at same point",
      "result_difference": "Slightly tangier"
    }
  ],
  "no_substitute_warning": null
}
`;
```

### 3.3 RAG Pipeline for Cooking

```typescript
// lib/rag/rag-pipeline.ts
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RAGContext {
  documents: Array<{
    content: string;
    metadata: Record<string, any>;
    similarity: number;
  }>;
  formattedContext: string;
}

export async function searchCookingKnowledge(
  query: string,
  userId: string, // Required for user memory search
  options: {
    mode?: string;
    skillLevel?: string;
    docTypes?: string[];
    limit?: number;
  } = {}
): Promise<RAGContext> {
  const { mode, skillLevel, docTypes, limit = 5 } = options;

  // Generate embedding for query
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const embedding = embeddingResponse.data[0].embedding;

  // Search BOTH global knowledge AND user memory in parallel
  const [globalResult, userResult] = await Promise.all([
    // 1. Global cooking knowledge (techniques, tips, substitutions)
    supabase.rpc("match_recipe_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
      filter_mode: mode || null,
      filter_skill: skillLevel || null,
      filter_doc_types: docTypes || null,
    }),
    // 2. User's personal cooking memory (their recipes, past Q&A, preferences)
    supabase.rpc("match_user_memory", {
      p_user_id: userId,
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3, // Fewer user docs, they're more personal
    }),
  ]);

  if (globalResult.error) {
    console.error("Global RAG search error:", globalResult.error);
  }
  if (userResult.error) {
    console.error("User memory search error:", userResult.error);
  }

  // Combine results: user memory first (more relevant), then global
  const allDocuments = [
    ...(userResult.data || []).map((d) => ({ ...d, source: "user_memory" })),
    ...(globalResult.data || []).map((d) => ({
      ...d,
      source: "global_knowledge",
    })),
  ];

  // Apply MMR for diversity across combined results
  const diverseDocuments = applyMMR(allDocuments, embedding, 0.7);

  // Format context with source attribution
  const formattedContext =
    diverseDocuments.length > 0
      ? `\n\nRELEVANT KNOWLEDGE:\n${diverseDocuments
          .map((doc, i) => {
            const sourceLabel =
              doc.source === "user_memory"
                ? "Your Cooking History"
                : doc.metadata?.source || "Chef AI Knowledge Base";
            return `[${i + 1}] ${doc.content}\n(Source: ${sourceLabel})`;
          })
          .join("\n\n")}`
      : "";

  return { documents: diverseDocuments, formattedContext };
}

// Cosine similarity helper
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function applyMMR(
  documents: any[],
  queryEmbedding: number[],
  lambda: number = 0.7
): any[] {
  // Maximal Marginal Relevance for diversity
  // Simplified: use similarity scores only (no re-embedding needed)
  // For full MMR with inter-document diversity, would need embeddings from RPC
  const selected: any[] = [];
  const remaining = [...documents];

  while (
    selected.length < Math.min(3, documents.length) &&
    remaining.length > 0
  ) {
    let bestScore = -Infinity;
    let bestIdx = 0;

    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].similarity;
      // Simplified redundancy: penalize if similarity to query is too close to already selected
      const redundancy =
        selected.length > 0
          ? Math.max(
              ...selected.map(
                (s) => 1 - Math.abs(s.similarity - remaining[i].similarity)
              )
            )
          : 0;

      const mmrScore = lambda * relevance - (1 - lambda) * redundancy;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}
```

---

## Phase 4: Cook Mode + Chat UI

### 4.1 Cook Mode Screen Components

```typescript
// components/cook/CookModeScreen.tsx
interface CookModeProps {
  session: CookSession;
  recipe: Recipe;
  steps: RecipeStep[];
}

// Key components:
// - StepDisplay: Large text, auto-sizing
// - TimerBar: Multiple concurrent timers
// - ChatOverlay: Slides up from bottom
// - VoiceButton: Tap to speak
// - ProgressIndicator: Step X of Y
```

### 4.2 Message Streaming Hook (for React Native)

```typescript
// hooks/use-message-streaming.ts
import { supabase } from "@/lib/supabase";
import { useState, useCallback } from "react";

export function useMessageStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");

  const streamMessage = useCallback(
    async (sessionId: string, message: string, currentStep: number) => {
      setIsStreaming(true);
      setStreamedContent("");

      try {
        // Use supabase.functions.invoke for React Native compatibility
        // Note: For streaming, we use a non-streaming call and handle response
        const { data, error } = await supabase.functions.invoke("cook-chat", {
          body: { sessionId, message, currentStep },
        });

        if (error) throw error;

        // Parse response (edge function returns { response, voice_response, sources })
        setStreamedContent(data.response);

        return {
          response: data.response,
          voiceResponse: data.voice_response,
          sources: data.sources,
        };
      } catch (err) {
        console.error("Chat error:", err);
        throw err;
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { isStreaming, streamedContent, streamMessage };
}

// Alternative: For true streaming on web, use EventSource or fetch with ReadableStream
// But for MVP on React Native, non-streaming is simpler and works reliably
```

---

## Phase 5: RevenueCat Integration

### 5.1 Setup

```typescript
// lib/revenue-cat.ts
import Purchases from "react-native-purchases";

export async function initializePurchases(userId: string) {
  await Purchases.configure({
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!,
  });
  await Purchases.logIn(userId);
}

export async function checkProAccess(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active["pro"] !== undefined;
}

export async function purchaseProMonthly() {
  const offerings = await Purchases.getOfferings();
  const monthly = offerings.current?.availablePackages.find(
    (p) => p.identifier === "$rc_monthly"
  );
  if (monthly) {
    await Purchases.purchasePackage(monthly);
  }
}
```

### 5.2 RevenueCat Webhook (Sync subscription_tier)

**CRITICAL:** RevenueCat must sync entitlements to `users.subscription_tier` so import limits work.

```typescript
// supabase/functions/revenuecat-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Verify webhook signature (RevenueCat sends Authorization header)
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("REVENUECAT_WEBHOOK_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const event = await req.json();
  const { app_user_id, type, expiration_at_ms } = event;

  // Map RevenueCat events to subscription_tier updates
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
      // User subscribed or renewed
      await supabase
        .from("users")
        .update({
          subscription_tier: "pro",
          subscription_expires_at: new Date(expiration_at_ms).toISOString(),
        })
        .eq("id", app_user_id);
      break;

    case "CANCELLATION":
    case "EXPIRATION":
    case "BILLING_ISSUE":
      // User cancelled or subscription expired
      await supabase
        .from("users")
        .update({
          subscription_tier: "free",
          subscription_expires_at: null,
        })
        .eq("id", app_user_id);
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

**RevenueCat Dashboard Setup:**

1. Go to RevenueCat → Project Settings → Integrations → Webhooks
2. Add webhook URL: `https://<project>.supabase.co/functions/v1/revenuecat-webhook`
3. Set Authorization header: `Bearer <REVENUECAT_WEBHOOK_SECRET>`
4. Enable events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE

### 5.3 Paywall Component

```typescript
// components/Paywall.tsx
export function Paywall({ onClose, onPurchase }) {
  return (
    <Modal>
      <View style={styles.container}>
        <Text style={styles.title}>Upgrade to Pro</Text>

        {/* TTS is FREE for all users - these are Pro-only features */}
        <View style={styles.features}>
          <Feature icon="✓" text="Unlimited recipe imports" />
          <Feature icon="✓" text="All skill level adaptations" />
          <Feature icon="✓" text="Unlimited AI chat questions" />
          <Feature icon="✓" text="Priority support" />
        </View>

        <PricingOption
          title="Monthly"
          price="$2.99/month"
          onPress={() => purchaseProMonthly()}
        />

        <PricingOption
          title="Annual"
          price="$19.99/year"
          subtitle="Save 44%"
          highlighted
          onPress={() => purchaseProAnnual()}
        />

        <Button variant="ghost" onPress={onClose}>
          Maybe Later
        </Button>
      </View>
    </Modal>
  )
}
```

---

## Phase 6: Demo Prep Checklist

### Pre-Demo Setup

- [ ] Fresh install on demo device
- [ ] Test account logged in
- [ ] 3 pre-imported recipes (variety: pasta, cocktail, dessert)
- [ ] Grocery list with sample data
- [ ] 3 tested TikTok URLs ready
- [ ] Battery 100%
- [ ] Do Not Disturb enabled
- [ ] WiFi verified + mobile hotspot backup
- [ ] Screen recording running

### Demo Flow (90 seconds)

1. **IMPORT** (15s): Paste TikTok → Show extracted recipe
2. **PLAN** (20s): Tap "Plan This Week" → Show grocery list
3. **COOK** (30s): Start cooking → Timer → Ask question → Get answer
4. **COMPLETE** (10s): Rate → Add note → See "Cooked" badge
5. **PAYWALL** (15s): Try 4th import → Hit paywall → Subscribe

### Backup Plans

- YouTube URL if TikTok fails
- Pre-imported recipe if all extraction fails
- Screenshots of payment flow
- Video recording of full demo

---

## Key Patterns from Hive-Mind Applied

| Hive-Mind Pattern            | Chef AI Adaptation                                      |
| ---------------------------- | ------------------------------------------------------- |
| Intent-based persona routing | Route to Cooking Mentor, Substitution Expert, etc.      |
| LLM-based classification     | Classify cooking questions by type                      |
| MMR diversity in RAG         | Balance relevance with variety in recipe suggestions    |
| Response mode adaptation     | Quick/Focused/Detailed based on question type           |
| Streaming with metadata      | Stream responses with sources and persona info          |
| Context building             | Combine recipe, step, skill level, dietary restrictions |
| Dual vector store            | Use Supabase pgvector in production                     |

---

## Next Steps

Ready to begin implementation? Let me know which phase to start with:

1. **Phase 1**: Set up Expo project + Supabase
2. **Phase 2**: Build import pipeline (YouTube first, then TikTok)
3. **Phase 3**: Core UI screens (home, recipe detail, cook mode)
4. **Phase 4**: AI chat with RAG integration
5. **Phase 5**: RevenueCat paywall
6. **Phase 6**: Polish and demo prep
