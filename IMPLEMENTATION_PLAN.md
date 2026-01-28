# CHEZ - Implementation Plan

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

| Task                       | Status  | Notes                                                             |
| -------------------------- | ------- | ----------------------------------------------------------------- |
| Recipe library UI          | ✅ Done | Cards with mode emoji, platform badge, time                       |
| Recipe detail screen       | ✅ Done | Ingredients, steps, source, Start Cooking                         |
| Ingredient confidence UI   | ✅ Done | Yellow badges, tap-to-verify, original text                       |
| Clipboard detection        | ✅ Done | Auto-detect video URLs, paste button                              |
| Cook mode UI               | ✅ Done | Hybrid step-checklist + chat, step cards + AI input               |
| TTS integration            | ✅ Done | OpenAI TTS via Edge Function, natural voice (nova) **[Pro only]** |
| Step timers                | ✅ Done | Quick timer buttons, voice alerts, concurrent timers              |
| Voice input (STT)          | ✅ Done | Toggle mic, Whisper API, auto-send on stop **[Pro only]**         |
| Session persistence        | ✅ Done | Messages saved to DB, restored on resume                          |
| Step progress persistence  | ✅ Done | current_step saved, completed steps restored                      |
| Grocery list display       | ✅ Done | Items grouped by category, check/uncheck, clear actions           |
| Add to Grocery from recipe | ✅ Done | Select ingredients modal, saves to active grocery list            |

### Deferred Items (Post-Hackathon)

| Item                       | Reason                                                     |
| -------------------------- | ---------------------------------------------------------- |
| Web recipe URL support     | Schema.org JSON-LD parsing - video import is MVP           |
| AuthContext refactor       | Direct Supabase session checks work fine for now           |
| Grocery list consolidation | AI-powered ingredient combining (Groq) - MVP works without |

### TODO: Optional Native Dev Client

For faster on-device voice transcription, build a native dev client:

```bash
npx expo run:ios --device
```

This enables `expo-speech-recognition` (faster than Whisper API). Currently using `expo-audio` + Whisper API which works well.

### Phase 4: AI Chat + RAG ✅ COMPLETE

| Task                      | Status  | Notes                                                       |
| ------------------------- | ------- | ----------------------------------------------------------- |
| TTS Edge Function         | ✅ Done | OpenAI TTS deployed, expo-audio for playback **[Pro only]** |
| Chat UI in cook mode      | ✅ Done | Collapsible chat panel with message bubbles                 |
| Whisper Edge Function     | ✅ Done | Voice-to-text via OpenAI Whisper API **[Pro only]**         |
| Session message storage   | ✅ Done | cook_session_messages table populated during cooking        |
| Intent classification     | ✅ Done | 12 intents: technique, substitution, troubleshooting...     |
| RAG pipeline              | ✅ Done | pgvector search, OpenAI embeddings, dual vector store       |
| Cook chat Edge Function   | ✅ Done | Claude responses with RAG context, skill-level adaption     |
| Knowledge base seeding    | ✅ Done | 55 entries with embeddings, backfill script created         |
| User memory embeddings    | ✅ Done | embed-memory Edge Function with JWT auth + ownership        |
| Session → Memory pipeline | ✅ Done | Feedback intents create memories, embeddings generated      |

### Phase 4.1: Smart "My Version" Feature ✅ COMPLETE

| Task                               | Status  | Notes                                                              |
| ---------------------------------- | ------- | ------------------------------------------------------------------ |
| Schema: detected_learnings column  | ✅ Done | JSONB column on cook_sessions + source_link_id FK                  |
| Schema: append_detected_learning() | ✅ Done | PostgreSQL RPC function for atomic JSONB array append              |
| cook-chat learning detection       | ✅ Done | Detects substitutions, preferences, timing changes during cooking  |
| Smart completion modal             | ✅ Done | Shows detected learnings with opt-in "Save as My Version" checkbox |
| create-my-version Edge Function    | ✅ Done | Applies learnings to create personalized version from session      |
| Source attribution UI              | ✅ Done | "Based on [creator]'s recipe, with your modifications" display     |

#### My Version Feature Overview

The "My Version" feature automatically captures user modifications during cooking and offers to save them as a personalized recipe version.

**How It Works:**

1. During cook mode, the AI detects memory-worthy interactions (substitutions, preferences, timing adjustments)
2. These "learnings" are stored in `cook_sessions.detected_learnings` as JSONB
3. At session completion, the modal displays detected learnings
4. User can opt-in to "Save as My Version" which creates a new `master_recipe_versions` entry
5. The new version includes `based_on_source_id` for attribution and `change_notes` with details

**Learning Types Detected:**

- `substitution` - "I used almond milk instead of regular milk"
- `preference` - "I like it spicier" / "I prefer less salt"
- `timing` - "I cooked it for 5 extra minutes"
- `technique` - "I used the air fryer instead"
- `addition` - "I added garlic to the sauce"

**Schema Changes:**

```sql
-- cook_sessions additions
ALTER TABLE cook_sessions ADD COLUMN detected_learnings JSONB DEFAULT '[]';
ALTER TABLE cook_sessions ADD COLUMN source_link_id UUID REFERENCES recipe_source_links(id);

-- RPC function for atomic append
CREATE OR REPLACE FUNCTION append_detected_learning(
  p_session_id UUID,
  p_learning JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE cook_sessions
  SET detected_learnings = COALESCE(detected_learnings, '[]'::jsonb) || p_learning
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Edge Functions:**

- `cook-chat` - Updated to detect and store learnings via RPC
- `create-my-version` - Creates personalized version from session learnings

### Phase 4.2: Version Management ✅ COMPLETE

| Task                          | Status  | Notes                                                  |
| ----------------------------- | ------- | ------------------------------------------------------ |
| Version dropdown in recipe UI | ✅ Done | Shows all versions with version number and source info |
| Version preview               | ✅ Done | Tap version to preview without making active           |
| Make version active           | ✅ Done | Confirmation to switch active version                  |
| Delete version                | ✅ Done | Trash icon, with sequential renumbering                |
| Protect original import       | ✅ Done | v1 cannot be deleted, only branched versions           |
| Version history modal         | ✅ Done | Full history with change notes and timestamps          |

### Phase 4.3: Multi-Source Recipes ✅ COMPLETE

| Task                   | Status  | Notes                                                |
| ---------------------- | ------- | ---------------------------------------------------- |
| Multiple video sources | ✅ Done | Link multiple videos to same master recipe           |
| Source browser modal   | ✅ Done | View all linked sources, open in browser             |
| Cover source selection | ✅ Done | Choose which video thumbnail to display              |
| Source attribution     | ✅ Done | "Inspired by [creator]" with clickable link          |
| Platform fallback      | ✅ Done | Show "Instagram video" when creator name unavailable |

### Phase 5: Design System & Visual Polish ✅ IN PROGRESS

> **Reference:** See [BRANDING_RESEARCH.md](BRANDING_RESEARCH.md) for full design rationale

#### 5.1 Design Tokens & Theme

| Task                      | Status  | Notes                                                |
| ------------------------- | ------- | ---------------------------------------------------- |
| Create constants/theme.ts | ✅ Done | Colors, spacing, typography, borderRadius, layout    |
| Define color palette      | ✅ Done | CHEZ Orange (#EA580C), warm cream bg, stone neutrals |
| Define typography scale   | ✅ Done | 8pt grid aligned, semantic variants (h1, body, etc.) |
| Define spacing system     | ✅ Done | 8pt grid: 4, 8, 12, 16, 24, 32, 48                   |
| Dark mode palette         | 🔲      | Warm dark tones, not pure black                      |

#### 5.2 Core Components

| Task                  | Status  | Notes                                       |
| --------------------- | ------- | ------------------------------------------- |
| Button component      | ✅ Done | Primary, secondary, ghost, outline variants |
| Card component        | ✅ Done | Default, outlined, elevated variants        |
| Input component       | 🔲      | With voice toggle, focus states             |
| Badge component       | 🔲      | Mode icons, confidence, allergens, platform |
| Typography components | ✅ Done | Text component with theme token variants    |

#### 5.3 Screen Polish

| Task                  | Status  | Notes                                                   |
| --------------------- | ------- | ------------------------------------------------------- |
| Home screen polish    | 🔲      | Welcome state, quick actions                            |
| Recipe library polish | ✅ Done | Cards with mode emoji, platform badge, time             |
| Recipe detail polish  | ✅ Done | Attribution, version dropdown, ingredient formatting    |
| Import screen polish  | ✅ Done | Platform detection, fallback mode with helpful guidance |
| Cook mode excellence  | ✅ Done | Large text, timer animations, chat overlay              |
| Grocery list screen   | ✅ Done | Items by category, check/uncheck, clear actions         |
| Profile screen polish | 🔲      | Settings, preferences UI                                |

#### 5.4 UI/UX Fixes

| Task                    | Status  | Notes                                                   |
| ----------------------- | ------- | ------------------------------------------------------- |
| Orange contrast issues  | ✅ Done | Light bg (#FFF7ED) with orange border, not primaryLight |
| "to taste" formatting   | ✅ Done | "salt to taste" instead of "to taste salt"              |
| Add to Grocery wrapping | ✅ Done | flexShrink: 0 prevents button text wrapping             |
| Version text truncation | ✅ Done | numberOfLines + flex for long source names              |
| Duplicate View Source   | ✅ Done | Single source shows "Open", 2+ shows "N Sources"        |
| Instructions cut off    | ✅ Done | Increased bottom padding for Cook button                |
| Clickable attribution   | ✅ Done | Tap entire attribution to open source                   |

#### 5.5 Microinteractions & Animations

| Task                   | Status  | Notes                                  |
| ---------------------- | ------- | -------------------------------------- |
| Button press feedback  | ✅ Done | Scale animation on press               |
| Pull to refresh        | ✅ Done | Native RefreshControl styling          |
| Timer animations       | ✅ Done | Countdown ring, completion celebration |
| Voice state indicators | ✅ Done | Pulsing mic, processing state          |
| Navigation transitions | 🔲      | Smooth, purposeful                     |

#### 5.6 Accessibility

| Task                  | Status  | Notes                                     |
| --------------------- | ------- | ----------------------------------------- |
| Contrast audit        | ✅ Done | Fixed orange-on-orange issues throughout  |
| Touch target audit    | 🔲      | Minimum 44pt for all interactive elements |
| Dynamic Type support  | 🔲      | Respect system font size                  |
| VoiceOver labels      | 🔲      | Meaningful labels for all elements        |
| Reduce Motion support | 🔲      | Disable animations when preference set    |

### Phase 6: Monetization 🔲 NOT STARTED

| Task             | Status | Notes                     |
| ---------------- | ------ | ------------------------- |
| RevenueCat setup | 🔲     | iOS + Android products    |
| Webhook sync     | 🔲     | subscription_tier updates |
| Paywall UI       | 🔲     | Monthly/annual options    |

### Phase 7: Testing & Demo 🔲 NOT STARTED

| Task              | Status | Notes                           |
| ----------------- | ------ | ------------------------------- |
| Import testing    | 🔲     | 20+ real video imports          |
| Cook mode testing | 🔲     | Full cook-through on 5+ recipes |
| Voice testing     | 🔲     | TTS + STT in real kitchen       |
| Demo prep         | 🔲     | Pre-loaded data, tested URLs    |
| Demo recording    | 🔲     | Backup video for presentation   |
| App Store assets  | 🔲     | Screenshots, preview video      |

---

## Phase Overview

| Phase | Duration   | Focus           | Deliverable                                                |
| ----- | ---------- | --------------- | ---------------------------------------------------------- |
| 1     | Days 1-3   | Foundation      | Project setup, Supabase, Auth, DB schema                   |
| 2     | Days 4-7   | Import Pipeline | YouTube + TikTok + Instagram import with Claude extraction |
| 3     | Days 8-12  | Core Features   | Recipe library, Grocery lists, Cook mode                   |
| 4     | Days 13-16 | AI Chat + RAG   | Cooking assistant with RAG-enhanced responses              |
| 5     | Days 17-19 | Design System   | Visual identity, components, polish, accessibility         |
| 6     | Days 20-21 | Monetization    | RevenueCat paywall integration                             |
| 7     | Days 22-23 | Testing + Demo  | QA, demo prep, App Store assets                            |

> **Note:** Design System phase added before monetization to ensure visual polish is complete before final demo prep.
> \*Instagram is a **stretch goal** - only if YouTube + TikTok are solid. Fallback: caption-only extraction.

---

## Phase 1: Foundation (Days 1-3)

### 1.1 Project Setup

```bash
# Initialize Expo project
npx create-expo-app chez --template expo-template-blank-typescript

# Key dependencies
expo install expo-router expo-secure-store expo-speech expo-haptics expo-keep-awake
npm install @supabase/supabase-js zustand @tanstack/react-query
npm install react-native-reanimated react-native-gesture-handler

# AI Services (Edge Functions)
# - Claude: Recipe extraction, cooking chat
# - OpenAI: Embeddings for RAG ($0.00002/1K tokens)
# - Groq: Grocery consolidation (llama-3.1-8b-instant, ~free)

# Voice: TTS + STT for Pro users
# - OpenAI TTS: Text-to-speech for reading steps/responses aloud (Pro only - $15/1M chars)
# - OpenAI Whisper: Speech-to-text for hands-free commands (Pro only - $0.006/min)
# - Free users: Manual navigation + text input only
```

### 1.2 Project Structure (Inspired by Hive-Mind)

```
chez/
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

**Database Schema** (Multi-Source Recipe Architecture):

The database uses a **multi-source architecture** where:

1. **Video sources are globally cached** - Transcripts stored once, shared across users
2. **User links to sources** - Each user has their own link to a source with their extracted recipe
3. **Master recipe is user-editable** - User's personal version that evolves through iterations
4. **Versions are immutable snapshots** - Each change creates a new version, cook sessions link to specific versions

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- TABLE 1: users
-- =====================================================
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

-- =====================================================
-- TABLE 2: user_preferences
-- =====================================================
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  cooking_skill_level TEXT DEFAULT 'home_cook',
  mixology_skill_level TEXT DEFAULT 'beginner',
  pastry_skill_level TEXT DEFAULT 'beginner',
  dietary_restrictions JSONB DEFAULT '[]',
  preferred_units TEXT DEFAULT 'imperial',

  -- Voice settings (TTS + STT implemented, Pro only, tap-to-speak)
  voice_enabled BOOLEAN DEFAULT true,
  tts_speed DECIMAL DEFAULT 1.0,

  pantry_staples JSONB DEFAULT '[]',

  -- Cooking stats
  total_cooks INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 3: video_sources (Global, shared across users)
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

-- =====================================================
-- TABLE 4: master_recipes (Per-user, the user's evolving recipe)
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

-- =====================================================
-- TABLE 5: master_recipe_versions (Immutable snapshots)
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
  based_on_source_id UUID, -- FK added after recipe_source_links created

  -- Outcome (filled after cooking)
  outcome_rating INTEGER CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
  outcome_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE 6: recipe_source_links (Per-user link to video sources)
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

-- =====================================================
-- TABLE 7: cook_sessions
-- =====================================================
CREATE TABLE cook_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  master_recipe_id UUID REFERENCES master_recipes(id) ON DELETE SET NULL,
  version_id UUID REFERENCES master_recipe_versions(id) ON DELETE SET NULL,
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

-- =====================================================
-- TABLE 8: cook_session_messages (chat during cooking)
-- =====================================================
CREATE TABLE cook_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES cook_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  voice_response TEXT,
  current_step INTEGER,
  sources JSONB DEFAULT '[]',
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 9: grocery_lists
-- =====================================================
CREATE TABLE grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  master_recipe_ids JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 10: grocery_items
-- =====================================================
CREATE TABLE grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grocery_list_id UUID REFERENCES grocery_lists(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  quantity DECIMAL,
  unit TEXT,
  category TEXT,
  source_master_recipe_ids JSONB DEFAULT '[]',
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  is_manual BOOLEAN DEFAULT false,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 11: recipe_knowledge (RAG - Global cooking knowledge)
-- =====================================================
CREATE TABLE recipe_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  doc_type TEXT CHECK (doc_type IN ('technique', 'substitution', 'tip', 'ingredient_info')),
  mode TEXT,
  skill_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 12: user_cooking_memory (RAG - Per-user memory)
-- =====================================================
CREATE TABLE user_cooking_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  memory_type TEXT CHECK (memory_type IN ('recipe_summary', 'qa_exchange', 'preference', 'cooking_note')),
  source_session_id UUID REFERENCES cook_sessions(id) ON DELETE SET NULL,
  source_message_id UUID REFERENCES cook_session_messages(id) ON DELETE SET NULL,
  label TEXT CHECK (label IN (
    'substitution_used',
    'technique_learned',
    'problem_solved',
    'preference_expressed',
    'modification_made',
    'doneness_preference',
    'ingredient_discovery'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 13: extraction_logs
-- =====================================================
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- video_sources
CREATE INDEX idx_video_sources_url ON video_sources(source_url);
CREATE INDEX idx_video_sources_hash ON video_sources(source_url_hash);
CREATE INDEX idx_video_sources_platform ON video_sources(source_platform);

-- master_recipes
CREATE INDEX idx_master_recipes_user ON master_recipes(user_id);
CREATE INDEX idx_master_recipes_status ON master_recipes(user_id, status);
CREATE INDEX idx_master_recipes_updated ON master_recipes(updated_at DESC);

-- master_recipe_versions
CREATE UNIQUE INDEX idx_versions_unique ON master_recipe_versions(master_recipe_id, version_number);
CREATE INDEX idx_versions_master ON master_recipe_versions(master_recipe_id);

-- recipe_source_links
CREATE UNIQUE INDEX idx_source_links_unique
  ON recipe_source_links(user_id, video_source_id)
  WHERE link_status != 'rejected';
CREATE INDEX idx_source_links_master ON recipe_source_links(master_recipe_id);
CREATE INDEX idx_source_links_pending ON recipe_source_links(user_id, link_status) WHERE link_status = 'pending';
CREATE INDEX idx_source_links_video ON recipe_source_links(video_source_id);

-- cook_sessions
CREATE INDEX idx_cook_sessions_user_id ON cook_sessions(user_id);
CREATE INDEX idx_cook_sessions_master ON cook_sessions(master_recipe_id);
CREATE INDEX idx_cook_sessions_version ON cook_sessions(version_id);
CREATE INDEX idx_cook_session_messages_session_id ON cook_session_messages(session_id);
CREATE INDEX idx_cook_session_messages_feedback ON cook_session_messages(feedback) WHERE feedback IS NOT NULL;

-- grocery
CREATE INDEX idx_grocery_lists_user_id ON grocery_lists(user_id);
CREATE INDEX idx_grocery_items_grocery_list_id ON grocery_items(grocery_list_id);

-- RAG indexes
CREATE INDEX idx_recipe_knowledge_embedding ON recipe_knowledge
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_recipe_knowledge_content_search ON recipe_knowledge
  USING gin(to_tsvector('english', content));
CREATE INDEX idx_user_cooking_memory_user_id ON user_cooking_memory(user_id);
CREATE INDEX idx_user_cooking_memory_embedding ON user_cooking_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_user_cooking_memory_label ON user_cooking_memory(label) WHERE label IS NOT NULL;

-- extraction_logs
CREATE INDEX idx_extraction_logs_platform_created ON extraction_logs(platform, created_at);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS (added after all tables exist)
-- =====================================================

-- Add FK from master_recipes to current_version_id
ALTER TABLE master_recipes
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES master_recipe_versions(id) ON DELETE SET NULL;

-- Add based_on_source_id FK to master_recipe_versions
ALTER TABLE master_recipe_versions
  ADD CONSTRAINT fk_based_on_source
  FOREIGN KEY (based_on_source_id) REFERENCES recipe_source_links(id) ON DELETE SET NULL;

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

-- Other tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cooking_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);
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
CREATE POLICY "Anyone can read recipe knowledge" ON recipe_knowledge
  FOR SELECT USING (true);
CREATE POLICY "Users can manage own cooking memory" ON user_cooking_memory
  FOR ALL USING (auth.uid() = user_id);

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
  IF TG_OP = 'DELETE' THEN
    UPDATE master_recipes
    SET cover_video_source_id = NULL
    WHERE id = OLD.master_recipe_id AND cover_video_source_id = OLD.video_source_id;
    RETURN OLD;
  END IF;
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

-- =====================================================
-- RPC: Match global cooking knowledge (with doc_type filter)
-- =====================================================
CREATE OR REPLACE FUNCTION match_recipe_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_mode text DEFAULT NULL,
  filter_skill text DEFAULT NULL,
  filter_doc_types text[] DEFAULT NULL
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

-- =====================================================
-- RPC: Match user-specific cooking memory
-- =====================================================
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
SECURITY INVOKER
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
```

### JSONB Structure for Ingredients/Steps

The `master_recipe_versions` and `recipe_source_links` tables store ingredients and steps as JSONB arrays:

```typescript
// ingredients JSONB structure
[
  {
    id: "uuid",
    item: "Pecorino Romano",
    quantity: 100,
    unit: "g",
    preparation: "finely grated",
    is_optional: false,
    grocery_category: "dairy",
    allergens: ["dairy"],
    confidence_status: "confirmed", // confirmed | needs_review | inferred
    original_text: "parmyo reo",
    user_verified: true,
    sort_order: 1,
  },
][
  // steps JSONB structure
  {
    id: "uuid",
    step_number: 1,
    instruction: "Bring a large pot of salted water to boil",
    duration_minutes: 10,
    temperature_value: null,
    temperature_unit: null,
    equipment: ["large pot"],
    techniques: ["boiling"],
    timer_label: "Water boiling",
  }
];
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

### 2.4 Edge Function: import-recipe (Multi-Source Architecture)

The import flow uses a multi-step process:

1. **Check video source cache** - Reuse transcript if URL was previously imported
2. **Extract recipe** - Run Claude extraction on transcript
3. **Check for similar recipes** - Fuzzy match against user's existing master recipes
4. **Create or link** - Either create new master recipe or return linking suggestions

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

// URL normalization for deduplication
function normalizeVideoUrl(url: string): string {
  const parsed = new URL(url);

  // YouTube: normalize to youtube.com/watch?v=VIDEO_ID
  if (
    parsed.hostname.includes("youtube.com") ||
    parsed.hostname === "youtu.be"
  ) {
    const videoId = extractYouTubeId(url);
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
  }

  // TikTok: normalize to tiktok.com/video/VIDEO_ID
  if (parsed.hostname.includes("tiktok.com")) {
    const videoId = extractTikTokId(url);
    return videoId ? `https://www.tiktok.com/video/${videoId}` : url;
  }

  // Instagram: normalize to instagram.com/reel/VIDEO_ID
  if (parsed.hostname.includes("instagram.com")) {
    const videoId = extractInstagramId(url);
    return videoId ? `https://www.instagram.com/reel/${videoId}` : url;
  }

  return url;
}

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

  // Check import limits (free tier: 3/month)
  const { data: userData } = await supabase
    .from("users")
    .select("subscription_tier, imports_this_month, imports_reset_at")
    .eq("id", user.id)
    .single();

  let currentImports = userData?.imports_this_month || 0;
  const resetAt = userData?.imports_reset_at
    ? new Date(userData.imports_reset_at)
    : null;
  const now = new Date();

  if (resetAt && now > resetAt) {
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
    const platform = detectPlatform(url);
    const normalizedUrl = normalizeVideoUrl(url);

    // =====================================================
    // STEP 1: Check video source cache (global, shared)
    // =====================================================
    let videoSource = await supabase
      .from("video_sources")
      .select("*")
      .eq("source_url", normalizedUrl)
      .single();

    let transcript: string;
    let extraction: any;

    if (videoSource.data) {
      // Reuse cached transcript (saves API credits!)
      transcript = videoSource.data.raw_transcript;
      extraction = {
        transcript,
        caption: videoSource.data.raw_caption,
        creator: videoSource.data.source_creator,
        thumbnailUrl: videoSource.data.source_thumbnail_url,
        method: "cached",
        layer: 0,
      };

      // Update last_accessed_at
      await supabase
        .from("video_sources")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", videoSource.data.id);
    } else {
      // Extract content from video
      extraction = await extractContent(platform, url);
      transcript = extraction.transcript;

      if (!transcript && extraction.audioUrl) {
        transcript = await transcribeAudio(extraction.audioUrl);
      }

      // Cache in video_sources (global)
      const { data: newVideoSource } = await supabase
        .from("video_sources")
        .insert({
          source_url: normalizedUrl,
          source_platform: platform,
          video_id: extraction.videoId,
          source_creator: extraction.creator,
          source_thumbnail_url: extraction.thumbnailUrl,
          raw_transcript: transcript,
          raw_caption: extraction.caption,
          extracted_title: extraction.title,
          extraction_method: extraction.method,
          extraction_layer: extraction.layer,
        })
        .select()
        .single();

      videoSource = { data: newVideoSource };
    }

    // =====================================================
    // STEP 2: Extract recipe with Claude
    // =====================================================
    const recipe = await extractRecipe({
      transcript,
      caption: extraction.caption,
      title: extraction.title || videoSource.data?.extracted_title,
      creator: extraction.creator,
      forceMode: force_mode,
    });

    // =====================================================
    // STEP 3: Check for existing user link to this video
    // =====================================================
    const { data: existingLink } = await supabase
      .from("recipe_source_links")
      .select("*, master_recipe:master_recipes(*)")
      .eq("user_id", user.id)
      .eq("video_source_id", videoSource.data.id)
      .neq("link_status", "rejected")
      .single();

    if (existingLink) {
      return new Response(
        JSON.stringify({
          success: false,
          already_imported: true,
          master_recipe_id: existingLink.master_recipe_id,
          message: "You've already imported this video",
        }),
        { status: 409 }
      );
    }

    // =====================================================
    // STEP 4: Check for similar master recipes (fuzzy match)
    // =====================================================
    const { data: similarRecipes } = await supabase
      .from("master_recipes")
      .select("id, title, mode, times_cooked, last_cooked_at")
      .eq("user_id", user.id)
      .eq("mode", recipe.mode)
      .ilike("title", `%${recipe.title.split(" ")[0]}%`) // Simple fuzzy match
      .limit(3);

    // =====================================================
    // STEP 5: Create source link with extracted recipe
    // =====================================================
    const { data: sourceLink } = await supabase
      .from("recipe_source_links")
      .insert({
        video_source_id: videoSource.data.id,
        user_id: user.id,
        extracted_ingredients: recipe.ingredients,
        extracted_steps: recipe.steps,
        extracted_title: recipe.title,
        extracted_description: recipe.description,
        extracted_mode: recipe.mode,
        extracted_cuisine: recipe.cuisine,
        extraction_confidence: recipe.confidence,
        link_status: similarRecipes?.length ? "pending" : "linked",
      })
      .select()
      .single();

    // =====================================================
    // STEP 6: Create master recipe if no similar found
    // =====================================================
    let masterRecipe = null;
    let version = null;

    if (!similarRecipes?.length) {
      // Auto-create master recipe
      const { data: newMaster } = await supabase
        .from("master_recipes")
        .insert({
          user_id: user.id,
          title: recipe.title,
          description: recipe.description,
          mode: recipe.mode,
          cuisine: recipe.cuisine,
          category: recipe.category,
          cover_video_source_id: videoSource.data.id,
        })
        .select()
        .single();

      masterRecipe = newMaster;

      // Create initial version (v1)
      const { data: newVersion } = await supabase
        .from("master_recipe_versions")
        .insert({
          master_recipe_id: masterRecipe.id,
          version_number: 1,
          title: recipe.title,
          description: recipe.description,
          mode: recipe.mode,
          cuisine: recipe.cuisine,
          category: recipe.category,
          prep_time_minutes: recipe.prep_time_minutes,
          cook_time_minutes: recipe.cook_time_minutes,
          servings: recipe.servings,
          servings_unit: recipe.servings_unit,
          difficulty_score: recipe.difficulty_score,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          based_on_source_id: sourceLink.id,
        })
        .select()
        .single();

      version = newVersion;

      // Update master recipe with current_version_id and link the source
      await supabase
        .from("master_recipes")
        .update({ current_version_id: version.id })
        .eq("id", masterRecipe.id);

      await supabase
        .from("recipe_source_links")
        .update({
          master_recipe_id: masterRecipe.id,
          linked_at: new Date().toISOString(),
        })
        .eq("id", sourceLink.id);
    }

    // Increment import count
    await supabase
      .from("users")
      .update({ imports_this_month: currentImports + 1 })
      .eq("id", user.id);

    // Log extraction
    await supabase.from("extraction_logs").insert({
      platform,
      source_url: url,
      extraction_method: extraction.method,
      extraction_layer: extraction.layer,
      success: true,
    });

    // Return response based on whether linking is needed
    if (similarRecipes?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          needs_confirmation: true,
          source_link_id: sourceLink.id,
          extracted_recipe: {
            title: recipe.title,
            mode: recipe.mode,
            confidence: recipe.confidence,
          },
          suggestions: similarRecipes,
          message: "This looks similar to recipes you already have",
        })
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        master_recipe_id: masterRecipe.id,
        version_id: version.id,
        source_link_id: sourceLink.id,
        extraction: {
          method: extraction.method,
          layer: extraction.layer,
          confidence: recipe.confidence,
          cached: extraction.method === "cached",
        },
      })
    );
  } catch (error) {
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

### 2.5 Edge Function: confirm-source-link

When the import returns `needs_confirmation: true`, the user must confirm whether to link to an existing recipe or create a new one:

```typescript
// supabase/functions/confirm-source-link/index.ts
serve(async (req) => {
  const { source_link_id, action, master_recipe_id } = await req.json();
  // action: 'link_existing' | 'create_new'

  const user = await getUser(req);

  const { data: sourceLink } = await supabase
    .from("recipe_source_links")
    .select("*, video_source:video_sources(*)")
    .eq("id", source_link_id)
    .eq("user_id", user.id)
    .single();

  if (!sourceLink) {
    return errorResponse("Source link not found", 404);
  }

  if (action === "link_existing") {
    // Link to existing master recipe
    await supabase
      .from("recipe_source_links")
      .update({
        master_recipe_id,
        link_status: "linked",
        linked_at: new Date().toISOString(),
      })
      .eq("id", source_link_id);

    return new Response(
      JSON.stringify({
        success: true,
        master_recipe_id,
        message: "Source linked to existing recipe",
      })
    );
  } else if (action === "create_new") {
    // Create new master recipe from extracted data
    const { data: masterRecipe } = await supabase
      .from("master_recipes")
      .insert({
        user_id: user.id,
        title: sourceLink.extracted_title,
        description: sourceLink.extracted_description,
        mode: sourceLink.extracted_mode,
        cuisine: sourceLink.extracted_cuisine,
        cover_video_source_id: sourceLink.video_source_id,
      })
      .select()
      .single();

    // Create initial version
    const { data: version } = await supabase
      .from("master_recipe_versions")
      .insert({
        master_recipe_id: masterRecipe.id,
        version_number: 1,
        title: sourceLink.extracted_title,
        mode: sourceLink.extracted_mode,
        ingredients: sourceLink.extracted_ingredients,
        steps: sourceLink.extracted_steps,
        based_on_source_id: source_link_id,
      })
      .select()
      .single();

    // Update master recipe and source link
    await supabase
      .from("master_recipes")
      .update({ current_version_id: version.id })
      .eq("id", masterRecipe.id);

    await supabase
      .from("recipe_source_links")
      .update({
        master_recipe_id: masterRecipe.id,
        link_status: "linked",
        linked_at: new Date().toISOString(),
      })
      .eq("id", source_link_id);

    return new Response(
      JSON.stringify({
        success: true,
        master_recipe_id: masterRecipe.id,
        version_id: version.id,
      })
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
│ │ 💬 Ask CHEZ...                  │ │
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
- TTS read-aloud (tap speaker icon) - **Pro only** (OpenAI TTS costs)
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
You are CHEZ, an expert culinary mentor helping someone cook a recipe.

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
                : doc.metadata?.source || "CHEZ Knowledge Base";
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

        {/* Pro-only features */}
        <View style={styles.features}>
          <Feature icon="✓" text="Unlimited recipe imports" />
          <Feature icon="✓" text="Voice input & TTS read-aloud" />
          <Feature icon="✓" text="Unlimited AI chat questions" />
          <Feature icon="✓" text="Skill level adaptations" />
        </View>

        <PricingOption
          title="Monthly"
          price="$4.99/month"
          onPress={() => purchaseProMonthly()}
        />

        <PricingOption
          title="Annual"
          price="$39.99/year"
          subtitle="Save 33%"
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

| Hive-Mind Pattern            | CHEZ Adaptation                                         |
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
