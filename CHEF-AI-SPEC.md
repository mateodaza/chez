# CHEZ — Technical Specification

**Version 1.0 | January 2026 | Shipyard Hackathon Entry**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [API Endpoints](#5-api-endpoints)
6. [AI Prompts](#6-ai-prompts)
7. [Screen-by-Screen UX](#7-screen-by-screen-ux)
8. [Data Flows](#8-data-flows)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Cost Model](#10-cost-model)
11. [MVP vs v1.1 Prioritization](#11-mvp-vs-v11-prioritization)
12. [Four-Week Sprint Plan](#12-four-week-sprint-plan)
13. [Risk Register](#13-risk-register)
14. [Product Roadmap](#14-product-roadmap)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

### 1.1 Product Vision

CHEZ is a mobile application that transforms how people learn to cook by importing recipe videos from TikTok, Instagram, and YouTube, then providing personalized, skill-adapted guidance through an intelligent chat interface with hands-free voice cooking assistance.

### 1.2 Core Value Proposition

- Import any recipe video in seconds — no manual transcription
- AI adapts recipes to your exact skill level (Beginner, Home Cook, Chef)
- Hands-free voice guidance while cooking — never touch your phone with messy hands
- Smart grocery lists that consolidate ingredients across multiple recipes
- Three specialized modes: Cooking, Mixology, and Pastry — each with domain expertise

### 1.3 Target Market

**Primary:** Food content consumers ages 18-45 who save TikTok/Instagram recipe videos but rarely make them.

**Secondary:** Home cooks seeking to improve their skills.

**Tertiary:** Professional chefs and bartenders seeking efficiency tools.

### 1.4 Business Model

| Tier                | Features                                                          |
| ------------------- | ----------------------------------------------------------------- |
| Free                | 3 imports/month, 10 AI questions, manual cook mode, no voice      |
| Pro Monthly ($4.99) | 50 imports, 200 AI questions, voice TTS+STT, hands-free cook mode |
| Pro Annual ($39.99) | Same as monthly, 33% savings ($3.33/mo effective)                 |

### 1.5 Key Metrics

- Cost per active user: $0.40/month
- Gross margin: 67-81%
- Break-even: ~31 paying users (blended)
- Target extraction success rate: 95%+ with fallbacks

---

## 2. Product Overview

### 2.1 The Three Modes

CHEZ automatically detects and adapts to three culinary domains, each with specialized knowledge, terminology, and measurement systems.

#### 2.1.1 Cooking Mode

- **Domain:** Savory meals, proteins, vegetables, sauces, techniques
- **Measurements:** Flexible (cups, tablespoons, "season to taste")
- **Precision:** Forgiving — ratios can vary
- **Terminology:** Sauté, braise, deglaze, fond, mise en place
- **Equipment:** Varies widely, substitutions common

**Specialized Sub-Domains:** Cooking mode also serves as the expert for specialized areas that don't warrant separate modes:

- **BBQ/Smoking:** Temperature zones, smoke selection, long cooks, bark development
- **Grilling:** Direct vs indirect heat, grill marks, flare-up management
- **Fermentation:** Kimchi, sauerkraut, kombucha — timing, pH, safety
- **Preservation:** Canning, pickling, curing — food safety critical
- **Coffee/Espresso:** Ratios, grind size, extraction time, water temperature
- **Sous Vide:** Time-temperature combinations, finishing techniques

When these specialized recipes are detected, Cooking mode activates domain-specific knowledge while maintaining the flexible measurement philosophy.

#### 2.1.2 Mixology Mode

- **Domain:** Cocktails, spirits, bar techniques
- **Measurements:** Precise (oz, ml, dashes, parts)
- **Precision:** Balanced — ratios matter for taste
- **Terminology:** Shake, stir, muddle, express, float, build
- **Equipment:** Bar tools essential (jigger, shaker, strainer)
- **Special features:** Batching calculator, pour cost analysis (Pro)

#### 2.1.3 Pastry Mode

- **Domain:** Desserts, breads, cakes, precision baking
- **Measurements:** Exact (grams always, baker's percentages for pros)
- **Precision:** Scientific — small variations cause failure
- **Terminology:** Fold, cream, proof, bloom, temper, laminate
- **Equipment:** Specific tools required (stand mixer, scale)
- **Special features:** Timeline generator, troubleshooting, humidity/altitude adjustments

### 2.2 Skill Levels

Each mode has three skill levels that affect recipe presentation, terminology, and guidance depth.

| Level         | Cooking                                                    | Mixology                                                          | Pastry                                                 |
| ------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| **Beginner**  | "I burn water" — Extra guidance, simple terms, visual cues | "I just bought a shaker" — Simplified, pre-made syrups OK         | "I burn cookies" — Foolproof recipes, extra warnings   |
| **Home Cook** | "I cook weekly" — Standard recipes, some technique         | "I have a bar cart" — Original specs, make syrups                 | "I make birthday cakes" — Standard recipes, techniques |
| **Chef**      | "I work in a kitchen" — Pro techniques, assumed knowledge  | "I work behind a bar" — Historical context, house-made everything | "I work in pastry" — Baker's %, production scheduling  |

### 2.3 Automatic Mode Detection

When a user imports a recipe, the system automatically detects which mode applies based on ingredient and technique analysis:

```javascript
// Mixology indicators: oz, dash, bitters, shake, stir, strain, cocktail, spirit
// Pastry indicators: flour, sugar, butter, bake, oven, dough, proof, rise, fold
// Default: Cooking mode
```

The user can always override the detected mode if needed.

### 2.4 Core User Flows

#### 2.4.1 Import Flow

1. User copies video URL from TikTok/Instagram/YouTube
2. User pastes URL into CHEZ
3. System extracts video metadata and transcript
4. AI extracts structured recipe from content
5. Mode auto-detected, recipe organized into user's library
6. User can edit, adjust skill level, or cook immediately

#### 2.4.2 Cook Flow

1. User selects recipe from library
2. System generates step-by-step guidance at user's skill level
3. User taps "Start Cooking" for voice mode
4. Hands-free: Tap mic to activate voice commands (Pro tier)
5. Voice commands: "Next step", "Repeat", "How long?", "What temperature?"
6. Post-cook: Rating and feedback for skill calibration

#### 2.4.3 Grocery List Flow

1. User adds recipes to a meal plan or "cooking session"
2. System consolidates ingredients (e.g., 2 onions from recipe A + 1 from recipe B = 3 onions)
3. System organizes by store section (Produce, Dairy, Meat, etc.)
4. User can check off items while shopping
5. Pantry tracking (optional): System remembers what user has

### 2.5 Recipe Iteration Tracking (Pro Feature)

For serious home cooks and professional chefs, CHEZ tracks the evolution of a dish across multiple attempts — creating a development journal that captures what changed, what worked, and what didn't.

#### 2.5.1 The Problem It Solves

- Pro chefs iterate on dishes 10-50 times before menu launch
- Notes get lost in notebooks, photos, voice memos
- Hard to remember what you changed between version 3 and version 7
- No single source of truth for recipe R&D

#### 2.5.2 How It Works

1. User imports or creates a base recipe (Version 1)
2. After cooking, user logs what they changed and results
3. System creates Version 2 with tracked modifications
4. Each version maintains: ingredients delta, technique changes, outcome notes, photos
5. AI can analyze patterns across iterations ("You increased salt in v3, v5, v7 — current level seems optimal")
6. User can compare any two versions side-by-side
7. Can "fork" from any version to try a different direction

#### 2.5.3 Iteration Data Captured

- Version number and date
- Parent version (which version this branched from)
- Ingredient changes: Added, removed, quantity adjusted
- Technique changes: Different method, timing, temperature
- Equipment changes: Different pan, oven vs stovetop
- Outcome rating (1-5 stars)
- Outcome notes: What worked, what didn't
- Photos: Before/after, plating, texture shots
- Taster feedback: Notes from others who tried it
- Environment notes: Humidity, altitude, oven calibration

#### 2.5.4 AI-Powered Insights

After 3+ iterations, AI can provide:

- **Pattern analysis:** "Your best results come when you rest the dough 2+ hours"
- **Suggested next experiments:** "Try reducing sugar by 10% based on your sourness feedback"
- **Regression detection:** "Version 6 scored lower — you removed the brown butter from v5"
- **Optimization suggestions:** "Across 8 versions, 175°C consistently outperforms 180°C"

#### 2.5.5 Version Timeline View

```
CARBONARA EVOLUTION
═══════════════════════════════════════════════════════════════

v1 ──── v2 ──── v3 ──┬── v4 ──── v5 ★ CURRENT BEST
Jan 5   Jan 12  Jan 19 │   Jan 26  Feb 2
★★☆☆☆  ★★★☆☆  ★★★★☆ │  ★★★☆☆  ★★★★★
                       │
                       └── v4b ──── v5b (experimental branch)
                           Feb 5    Feb 10
                           ★★☆☆☆   ★★★☆☆

v3 → v4 changes: +50g guanciale, -1 egg yolk, +30sec pasta water
v4 → v5 changes: Pecorino ratio 2:1 over parm, ice bath for eggs
```

#### 2.5.6 Use Cases

- **Home Cook:** Perfecting grandma's recipe — tracking adjustments until it tastes "right"
- **Content Creator:** Developing a signature dish for a video — documenting the journey
- **Restaurant Chef:** R&D for new menu item — systematic iteration with team feedback
- **Bakery:** Scaling a recipe — tracking how it performs at 2x, 5x, 10x batch sizes
- **Competition:** Preparing for a cook-off — refining every element

### 2.6 Recipe States: Saved → Planned → Cooked

This is THE core problem CHEZ solves: people save recipes but never make them. The app explicitly tracks and encourages progression through states.

#### 2.6.1 The Three States

```
SAVED                    PLANNED                  COOKED
━━━━━━━━━━━━━━━━━━━━    ━━━━━━━━━━━━━━━━━━━━    ━━━━━━━━━━━━━━━━━━━━
'I want to make this'   'I'm making this soon'   'I made this'

• Just imported          • Added to meal plan     • Completed cook session
• Browsing/inspiration   • On grocery list        • Has rating + notes
• No commitment          • Ingredients bought     • In cooking history

────────────────────────────────────────────────────────────────────────
Default state            User action: 'Plan'      Auto after cook complete
```

#### 2.6.2 UI Manifestation

- Home screen shows: "Planned This Week" section prominently
- Recipe card shows state badge: 📌 Saved | 📅 Planned | ✓ Cooked
- "Plan This" button on saved recipes adds to weekly plan
- Planning a recipe auto-adds ingredients to grocery list
- Stats track: "You've cooked 12 of 47 saved recipes (26%)"

#### 2.6.3 Nudges & Motivation

- Weekly prompt: "You saved 5 recipes this week. Plan one?"
- Streak tracking: "You've cooked something new 3 weeks in a row!"
- Gentle reminder: "Carbonara has been saved for 30 days. Ready to try it?"
- Celebration: "You made it! How did the Pad Thai turn out?"

### 2.7 Offline Mode

Kitchens often have poor WiFi. CHEZ must work reliably without connectivity.

#### 2.7.1 What Works Offline

- View all saved recipes (cached locally)
- Full cook mode with step navigation and timers
- Voice commands (on-device processing for basic commands)
- Grocery list viewing and checking off items
- Rating and notes (synced when back online)

#### 2.7.2 What Requires Online

- Importing new recipes
- AI chat during cooking (complex questions)
- Grocery list consolidation (AI-powered)
- Recipe iteration analysis
- Account sync across devices

#### 2.7.3 Implementation

- SQLite local database via expo-sqlite
- Recipes cached on first view
- Planned recipes pre-cached automatically
- Offline indicator in UI when disconnected
- Queue actions for sync when reconnected

### 2.8 Substitution Suggestions

When a user doesn't have an ingredient, AI suggests alternatives instantly.

#### 2.8.1 Trigger Points

- Grocery list: "Don't have this" button on any item
- Cook mode: "I don't have [ingredient]" voice command or chat
- Recipe view: Tap any ingredient for substitution options

#### 2.8.2 Substitution Logic

- **Context-aware:** Knows the recipe, not just the ingredient
- **Skill-aware:** Beginner gets simpler swaps, Chef gets technique alternatives
- **Mode-aware:** Mixology suggests different spirits; Pastry warns about chemistry impacts

#### 2.8.3 Example Outputs

```
USER: 'I don't have heavy cream'

FOR PASTA SAUCE:
  Best: Crème fraîche (1:1 ratio)
  Good: Cream cheese + milk (3 tbsp + 1/4 cup)
  OK: Greek yogurt (won't be as rich, add off heat)

FOR WHIPPED CREAM:
  Best: Coconut cream, chilled (different flavor)
  OK: Can't substitute well — skip or buy cream
```

### 2.9 Allergen Warnings

Users set dietary restrictions during onboarding. The app actively protects them.

#### 2.9.1 Warning Points

- **Import:** "This recipe contains dairy" banner if user is dairy-free
- **Recipe view:** Allergen ingredients highlighted in red
- **Cook mode:** Verbal warning before steps with allergens
- **Grocery list:** Allergen items flagged

#### 2.9.2 Smart Detection

- Ingredient parsing identifies allergens (not just "milk" but "butter", "cheese", "whey")
- Cross-contamination warnings for severe allergies
- Suggests allergen-free substitutions automatically

#### 2.9.3 User Control

- Can dismiss warnings ("I know, it's for a guest")
- Severity levels: Preference vs Allergy vs Severe
- Per-recipe override available

### 2.10 Multiple Concurrent Timers

Real cooking requires tracking multiple things simultaneously.

#### 2.10.1 Timer Features

- Up to 5 concurrent timers
- Each timer has: Name, duration, color coding
- Visual: Timer bar showing all active timers
- Audio: Distinct sounds per timer (or same, user choice)
- Voice: "Pasta timer done!" announcement

#### 2.10.2 Timer Sources

- Auto-created from recipe steps with durations
- Voice command: "Set timer for 8 minutes for the pasta"
- Manual: Quick-add timer button

#### 2.10.3 Timer Display

```
┌─────────────────────────────────────────────┐
│  ACTIVE TIMERS                              │
├─────────────────────────────────────────────┤
│  🔴 Pasta         ████████░░░░  3:24        │
│  🟡 Garlic bread  ██████████░░  1:45        │
│  🟢 Rest meat     ████░░░░░░░░  8:30        │
└─────────────────────────────────────────────┘
```

### 2.11 Pantry Tracking (Basic)

Simple "I have this" tracking to make grocery lists smarter.

#### 2.11.1 MVP Scope (Not Full Inventory)

- When checking off grocery items: "Mark as purchased"
- Option: "I already have this" removes from list
- Basic pantry memory: Common staples user always has
- NOT tracking quantities or expiration (that's v2)

#### 2.11.2 Staples Setup

- Onboarding question: "What do you usually have at home?"
- Quick presets: "Basic pantry", "Well-stocked", "Minimal"
- Common items: Salt, pepper, oil, butter, eggs, flour, sugar, garlic
- These auto-exclude from grocery lists unless quantity is unusual

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React Native / Expo)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Screens: Home, Import, Recipe, Cook, Grocery, Profile, Settings           │
│  State: Zustand + React Query                                              │
│  Voice: OpenAI Whisper (STT) + OpenAI TTS (Pro only, tap-to-speak)        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTPS
┌────────────────────────────────────▼────────────────────────────────────────┐
│                              SUPABASE BACKEND                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Auth: Supabase Auth (email, Apple, Google)                                │
│  Database: PostgreSQL with RLS                                             │
│  Storage: Recipe images, audio                                             │
│  Edge Functions: API endpoints                                             │
│  Realtime: Live grocery list sync                                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  AI: Claude API (recipe extraction, chat, adaptation)                      │
│  Transcription: OpenAI Whisper API                                         │
│  Video Scraping: ScrapeCreators, RapidAPI, Apify (fallback layers)        │
│  Payments: RevenueCat                                                      │
│  Analytics: PostHog                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer            | Technology             | Rationale                                     |
| ---------------- | ---------------------- | --------------------------------------------- |
| Mobile Framework | React Native + Expo    | Cross-platform, fast iteration, OTA updates   |
| State Management | Zustand + React Query  | Simple, performant, good caching              |
| Backend          | Supabase               | Instant backend, auth, realtime, storage      |
| Database         | PostgreSQL (Supabase)  | ACID, JSON support, full-text search          |
| AI/LLM           | Claude API (Sonnet)    | Best reasoning, structured output             |
| Speech-to-Text   | OpenAI Whisper API     | Best accuracy, 99 languages (Pro only)        |
| Text-to-Speech   | OpenAI TTS API         | Natural voice (nova), high quality (Pro only) |
| Wake Word        | ~~Picovoice~~ Deferred | Requires native modules; tap-to-speak MVP     |
| Payments         | RevenueCat             | Handles App Store/Play Store complexity       |
| Analytics        | PostHog                | Open-source, feature flags, funnels           |

### 3.3 Video Extraction Architecture

Multi-layer extraction ensures maximum reliability across platforms.

```
User pastes URL
       │
       ▼
LAYER 1: Platform Detection + Official APIs (YouTube Data API)
       │ Failed?
       ▼
LAYER 2: Primary Scraper (ScrapeCreators for TikTok, Apify for Instagram)
       │ Failed?
       ▼
LAYER 3: Backup Scraper (RapidAPI alternatives)
       │ Failed?
       ▼
LAYER 4: oEmbed Metadata (basic info only)
       │ Failed?
       ▼
LAYER 5: Manual Fallback (user provides title, creator, recipe text)
```

#### 3.3.1 Platform-Specific Strategies

**TikTok:** Primary: ScrapeCreators API. Backup: RapidAPI TikTok Scraper7. Transcription: Whisper API (if no caption). Success rate: 85-92%.

**Instagram:** Primary: Apify Instagram Reel Scraper (includes transcripts). Backup: ScrapeCreators. Success rate: 80-90%.

**YouTube:** Primary: youtube-transcript-api (free Python library). Metadata: YouTube Data API v3 (free tier). Success rate: 98%+.

**Web Recipes:** Primary: Schema.org JSON-LD parsing. Backup: Claude HTML extraction. Success rate: 95%+.

---

## 4. Database Schema

### 4.1 Entity Relationship Overview (Multi-Source Architecture)

The database uses a **multi-source architecture** where:

1. **Video sources are globally cached** - Transcripts stored once, shared across users
2. **User links to sources** - Each user has their own link to a source with their extracted recipe
3. **Master recipe is user-editable** - User's personal version that evolves through iterations
4. **Versions are immutable snapshots** - Each change creates a new version, cook sessions link to specific versions

```
video_sources (global cache)
      │
      └─────────< recipe_source_links ──────────> master_recipes
                        │                              │
                        │                              └─────────< master_recipe_versions
                        │                              │
                        └──────────────────────────────┴─────────< cook_sessions
                                                                        │
users ─────────< master_recipes                                         └─────────< cook_session_messages
   │                │
   │                └─────────< master_recipe_versions
   │
   └─────────< recipe_source_links
   │
   └─────────< grocery_lists ───< grocery_items
   │
   └─────────< user_preferences
   │
   └─────────< user_cooking_memory
```

### 4.2 Table Definitions (Multi-Source Architecture)

#### 4.2.1 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free', -- free, pro_monthly, pro_annual
  subscription_expires_at TIMESTAMPTZ,
  imports_this_month INTEGER DEFAULT 0,
  imports_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.2.2 user_preferences

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Skill levels per mode
  cooking_skill_level TEXT DEFAULT 'home_cook', -- beginner, home_cook, chef
  mixology_skill_level TEXT DEFAULT 'beginner',
  pastry_skill_level TEXT DEFAULT 'beginner',

  -- Dietary restrictions (JSONB array)
  dietary_restrictions JSONB DEFAULT '[]', -- ['vegetarian', 'gluten-free']

  -- Measurement preferences
  preferred_units TEXT DEFAULT 'imperial', -- imperial, metric

  -- Voice settings
  voice_enabled BOOLEAN DEFAULT true,
  tts_speed DECIMAL DEFAULT 1.0,

  -- Pantry staples
  pantry_staples JSONB DEFAULT '[]',

  -- Cooking stats
  total_cooks INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### 4.2.3 video_sources (Global Cache)

Caches video transcripts to avoid re-extraction. One row per unique normalized video URL.

```sql
CREATE TABLE video_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Video identity (globally unique, NORMALIZED URL)
  source_url TEXT UNIQUE NOT NULL,       -- Must be normalized before insert
  source_url_hash TEXT GENERATED ALWAYS AS (md5(source_url)) STORED,
  source_platform TEXT,                  -- youtube, tiktok, instagram
  video_id TEXT,                         -- Platform-specific ID

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

-- Indexes
CREATE INDEX idx_video_sources_url ON video_sources(source_url);
CREATE INDEX idx_video_sources_hash ON video_sources(source_url_hash);
CREATE INDEX idx_video_sources_platform ON video_sources(source_platform);
```

#### 4.2.4 master_recipes (Per-User Editable Recipe)

The user's personal recipe that groups sources and tracks their journey.

```sql
CREATE TABLE master_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Current state (editable by user)
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('cooking', 'mixology', 'pastry')),
  cuisine TEXT,
  category TEXT,

  -- Version tracking
  current_version_id UUID,  -- FK added after versions table created

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

-- Indexes
CREATE INDEX idx_master_recipes_user ON master_recipes(user_id);
CREATE INDEX idx_master_recipes_status ON master_recipes(user_id, status);
CREATE INDEX idx_master_recipes_updated ON master_recipes(updated_at DESC);
```

#### 4.2.5 master_recipe_versions (Immutable Snapshots)

Each edit creates a new version. Cook sessions link here.

```sql
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
  based_on_source_id UUID,  -- FK to recipe_source_links

  -- Outcome (filled after cooking)
  outcome_rating INTEGER CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
  outcome_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_versions_unique ON master_recipe_versions(master_recipe_id, version_number);
CREATE INDEX idx_versions_master ON master_recipe_versions(master_recipe_id);
```

**JSONB Structure for Ingredients:**

```json
[
  {
    "id": "uuid",
    "item": "Pecorino Romano",
    "quantity": 100,
    "unit": "g",
    "preparation": "finely grated",
    "is_optional": false,
    "grocery_category": "dairy",
    "allergens": ["dairy"],
    "confidence_status": "confirmed",
    "original_text": "parmyo reo",
    "user_verified": true,
    "sort_order": 1
  }
]
```

**JSONB Structure for Steps:**

```json
[
  {
    "id": "uuid",
    "step_number": 1,
    "instruction": "Bring a large pot of salted water to boil",
    "duration_minutes": 10,
    "temperature_value": null,
    "temperature_unit": null,
    "equipment": ["large pot"],
    "techniques": ["boiling"],
    "timer_label": "Water boiling"
  }
]
```

#### 4.2.6 recipe_source_links (Per-User Video Links)

Connects a user's master recipe to video sources with their extracted recipe.

```sql
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

-- Indexes (allow re-import after rejection: unique only for non-rejected links)
CREATE UNIQUE INDEX idx_source_links_unique
  ON recipe_source_links(user_id, video_source_id)
  WHERE link_status != 'rejected';
CREATE INDEX idx_source_links_master ON recipe_source_links(master_recipe_id);
CREATE INDEX idx_source_links_pending ON recipe_source_links(user_id, link_status) WHERE link_status = 'pending';
CREATE INDEX idx_source_links_video ON recipe_source_links(video_source_id);
```

#### 4.2.7 cook_sessions

```sql
CREATE TABLE cook_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  master_recipe_id UUID REFERENCES master_recipes(id) ON DELETE SET NULL,
  version_id UUID REFERENCES master_recipe_versions(id) ON DELETE SET NULL,

  -- Session info
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  skill_level_used TEXT, -- skill level at time of cooking

  -- Scaling
  scale_factor DECIMAL DEFAULT 1.0, -- 0.5 for half, 2.0 for double

  -- Progress tracking
  current_step INTEGER DEFAULT 1,
  is_complete BOOLEAN DEFAULT false,

  -- Post-cook feedback
  outcome_rating INTEGER, -- 1-5
  outcome_notes TEXT,
  changes_made TEXT,

  -- Voice usage analytics
  voice_commands_used INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cook_sessions_user_id ON cook_sessions(user_id);
CREATE INDEX idx_cook_sessions_master ON cook_sessions(master_recipe_id);
CREATE INDEX idx_cook_sessions_version ON cook_sessions(version_id);
```

#### 4.2.8 cook_session_messages

```sql
CREATE TABLE cook_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES cook_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  voice_response TEXT,
  current_step INTEGER,
  sources JSONB DEFAULT '[]',
  feedback TEXT,  -- For RAG memory extraction
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cook_session_messages_session_id ON cook_session_messages(session_id);
CREATE INDEX idx_cook_session_messages_feedback ON cook_session_messages(feedback) WHERE feedback IS NOT NULL;
```

#### 4.2.9 grocery_lists

```sql
CREATE TABLE grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- 'This Week', 'Party Prep', etc.

  -- Linked master recipes
  master_recipe_ids JSONB DEFAULT '[]', -- UUIDs of included master recipes

  -- Status
  is_active BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grocery_lists_user_id ON grocery_lists(user_id);
```

#### 4.2.10 grocery_items

```sql
CREATE TABLE grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grocery_list_id UUID REFERENCES grocery_lists(id) ON DELETE CASCADE,

  -- Item details (consolidated)
  item TEXT NOT NULL,
  quantity DECIMAL,
  unit TEXT,

  -- Categorization
  category TEXT, -- produce, dairy, meat, pantry, etc.

  -- Source tracking
  source_master_recipe_ids JSONB DEFAULT '[]', -- which master recipes need this

  -- Shopping state
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,

  -- Manual additions
  is_manual BOOLEAN DEFAULT false,

  sort_order INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grocery_items_grocery_list_id ON grocery_items(grocery_list_id);
```

#### 4.2.11 recipe_knowledge (RAG - Global Cooking Knowledge)

```sql
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

-- Indexes
CREATE INDEX idx_recipe_knowledge_embedding ON recipe_knowledge
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_recipe_knowledge_content_search ON recipe_knowledge
  USING gin(to_tsvector('english', content));
```

#### 4.2.12 user_cooking_memory (RAG - Per-User Memory)

```sql
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

-- Indexes
CREATE INDEX idx_user_cooking_memory_user_id ON user_cooking_memory(user_id);
CREATE INDEX idx_user_cooking_memory_embedding ON user_cooking_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_user_cooking_memory_label ON user_cooking_memory(label) WHERE label IS NOT NULL;
```

#### 4.2.13 extraction_logs

```sql
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

CREATE INDEX idx_extraction_logs_platform_created ON extraction_logs(platform, created_at);
```

---

## 5. API Endpoints

All endpoints are Supabase Edge Functions. Authentication via Supabase Auth JWT.

### 5.1 Recipe Import (Multi-Source Architecture)

#### POST /functions/v1/import-recipe

Import a recipe from a video URL (YouTube, TikTok, Instagram). Uses multi-source architecture with video caching and similar recipe detection. Web page import is planned for future release.

**Request:**

```json
{
  "url": "https://www.tiktok.com/@creator/video/123...",
  "force_mode": null // optional: "cooking", "mixology", "pastry"
}
```

**Response (auto-created, no similar recipes found):**

```json
{
  "success": true,
  "master_recipe_id": "uuid",
  "version_id": "uuid",
  "source_link_id": "uuid",
  "extraction": {
    "method": "scrapecreators",
    "layer": 1,
    "confidence": 0.92,
    "cached": false
  }
}
```

**Response (similar recipes found, needs confirmation):**

```json
{
  "success": true,
  "needs_confirmation": true,
  "source_link_id": "uuid",
  "extracted_recipe": {
    "title": "Creamy Garlic Pasta",
    "mode": "cooking",
    "confidence": 0.92
  },
  "suggestions": [
    {
      "id": "uuid",
      "title": "Creamy Pasta",
      "mode": "cooking",
      "times_cooked": 3,
      "last_cooked_at": "2025-01-15T18:00:00Z"
    }
  ],
  "message": "This looks similar to recipes you already have"
}
```

**Response (already imported):**

```json
{
  "success": false,
  "already_imported": true,
  "master_recipe_id": "uuid",
  "message": "You've already imported this video"
}
```

**Error Response (extraction failed):**

```json
{
  "success": false,
  "fallback_mode": true,
  "message": "Could not extract automatically",
  "manual_fields": ["title", "creator", "recipe_text"]
}
```

#### POST /functions/v1/confirm-source-link

Confirm linking a pending source to an existing or new master recipe.

**Request (link to existing):**

```json
{
  "source_link_id": "uuid",
  "action": "link_existing",
  "master_recipe_id": "uuid"
}
```

**Request (create new):**

```json
{
  "source_link_id": "uuid",
  "action": "create_new"
}
```

**Response:**

```json
{
  "success": true,
  "master_recipe_id": "uuid",
  "version_id": "uuid" // only if action was "create_new"
}
```

#### POST /functions/v1/import-recipe (with manual_content)

Manual recipe entry when automatic extraction fails. Uses the same endpoint with `manual_content` field.

**Request:**

```json
{
  "url": "https://...", // original URL for reference
  "manual_content": {
    "title": "Recipe Name",
    "creator": "Creator Name",
    "recipe_text": "Ingredients and instructions as text"
  }
}
```

### 5.2 Master Recipe Management

#### Direct Supabase Client Access

Master recipes are accessed directly via Supabase client with RLS. No Edge Function needed.

```typescript
// List user's master recipes with filtering
const { data: recipes } = await supabase
  .from("master_recipes")
  .select(
    `
    *,
    current_version:master_recipe_versions!current_version_id(*),
    source_links:recipe_source_links(
      *,
      video_source:video_sources(*)
    )
  `
  )
  .eq("user_id", userId)
  .eq("mode", "cooking") // optional filter
  .eq("status", "saved") // optional filter
  .order("updated_at", { ascending: false });

// Get single master recipe with full details
const { data: recipe } = await supabase
  .from("master_recipes")
  .select(
    `
    *,
    current_version:master_recipe_versions!current_version_id(*),
    versions:master_recipe_versions(*),
    source_links:recipe_source_links(
      *,
      video_source:video_sources(*)
    )
  `
  )
  .eq("id", masterRecipeId)
  .single();

// Update master recipe
await supabase
  .from("master_recipes")
  .update({ title, user_notes, user_rating, status, is_favorite })
  .eq("id", masterRecipeId);

// Delete master recipe (cascades to versions and source links)
await supabase.from("master_recipes").delete().eq("id", masterRecipeId);
```

### 5.3 Cooking Session

#### POST /functions/v1/cook/start

Start a cooking session. Links to specific version of master recipe.

**Request:**

```json
{
  "master_recipe_id": "uuid",
  "skill_level": "home_cook", // override user default
  "scale_factor": 1.0
}
```

**Response:**

```json
{
  "session_id": "uuid",
  "version_id": "uuid", // locked to this version for the session
  "adapted_recipe": {
    "steps": [
      {
        "step_number": 1,
        "instruction": "Adapted instruction for skill level",
        "voice_instruction": "Shorter version for TTS",
        "duration_minutes": 5
      }
    ]
  }
}
```

#### POST /functions/v1/cook-chat

Chat with AI during cooking.

**Request:**

```json
{
  "session_id": "uuid",
  "message": "What does it mean to fold the eggs?",
  "current_step": 3
}
```

**Response:**

```json
{
  "response": "Folding means gently combining...",
  "voice_response": "Shorter version for TTS",
  "sources": [] // RAG sources if applicable
}
```

#### POST /functions/v1/whisper

Transcribe audio using Whisper API for voice input.

**Request:**

```json
{
  "audio_base64": "...",
  "audio_format": "m4a"
}
```

**Response:**

```json
{
  "text": "Transcribed text...",
  "language": "en",
  "duration_seconds": 45
}
```

#### POST /functions/v1/text-to-speech

Generate speech audio for hands-free cooking (Pro only).

**Request:**

```json
{
  "text": "Step 3: Heat the oil in a large skillet...",
  "voice": "nova" // optional, defaults to nova
}
```

**Response:**

```json
{
  "audio_base64": "...",
  "duration_seconds": 5.2
}
```

#### POST /functions/v1/cook/complete

Complete cooking session with feedback.

**Request:**

```json
{
  "session_id": "uuid",
  "outcome_rating": 4,
  "outcome_notes": "Turned out great!",
  "changes_made": "Added extra garlic"
}
```

### 5.4 Grocery Lists

#### POST /functions/v1/grocery-lists

Create new grocery list from master recipes.

**Request:**

```json
{
  "name": "Weekend Cooking",
  "master_recipe_ids": ["uuid1", "uuid2"]
}
```

#### GET /functions/v1/grocery-lists/:id

Get grocery list with consolidated items.

#### PATCH /functions/v1/grocery-lists/:id/items/:item_id

Check/uncheck grocery item.

#### POST /functions/v1/grocery-lists/:id/items

Add manual item to list.

### 5.5 Version Management

#### Direct Supabase Client Access

Versions are accessed directly via Supabase client with RLS.

```typescript
// Get all versions of a master recipe
const { data: versions } = await supabase
  .from("master_recipe_versions")
  .select("*")
  .eq("master_recipe_id", masterRecipeId)
  .order("version_number", { ascending: false });

// Create new version (after editing recipe)
const nextVersion = await supabase.rpc("get_next_version_number", {
  p_master_recipe_id: masterRecipeId,
});

const { data: newVersion } = await supabase
  .from("master_recipe_versions")
  .insert({
    master_recipe_id: masterRecipeId,
    version_number: nextVersion,
    title: recipe.title,
    mode: recipe.mode,
    ingredients: recipe.ingredients, // JSONB
    steps: recipe.steps, // JSONB
    change_notes: "Added extra garlic, reduced salt",
  })
  .select()
  .single();

// Update master recipe to point to new version
await supabase
  .from("master_recipes")
  .update({ current_version_id: newVersion.id })
  .eq("id", masterRecipeId);
```

### 5.6 Recipe Iteration Tracking (Future)

> **Note:** Advanced iteration tracking with AI insights is planned for v1.1. Current implementation uses simple version history via `master_recipe_versions` table.

#### GET /functions/v1/master-recipes/:id/versions

Get all versions of a master recipe with timeline data.

**Response:**

```json
{
  "master_recipe_id": "uuid",
  "total_versions": 7,
  "current_version_id": "uuid",
  "versions": [
    {
      "id": "uuid",
      "version_number": 1,
      "title": "Original Import",
      "created_at": "2025-01-05T18:00:00Z",
      "outcome_rating": 2,
      "change_notes": null,
      "based_on_source_id": "uuid"
    },
    {
      "id": "uuid",
      "version_number": 2,
      "created_at": "2025-01-12T19:30:00Z",
      "outcome_rating": 3,
      "change_notes": "Added more garlic, reduced cook time"
    }
  ]
}
```

#### POST /functions/v1/master-recipes/:id/versions

Create a new version after cooking.

**Request:**

```json
{
  "change_notes": "Extra Crispy Attempt",
  "ingredient_changes": [
    { "type": "modified", "item": "butter", "from": "2 tbsp", "to": "3 tbsp" },
    { "type": "added", "item": "breadcrumbs", "amount": "1/4 cup" }
  ],
  "technique_changes": [{ "step": 4, "change": "Increased oven temp to 425F" }],
  "outcome_rating": 4,
  "what_worked": "Much crispier crust",
  "what_didnt_work": "Interior slightly dry",
  "next_iteration_ideas": "Try butter-basting during last 5 min",
  "taster_feedback": [
    { "name": "Mom", "rating": 5, "notes": "Best version yet!" }
  ],
  "photos": ["base64...", "base64..."]
}
```

#### GET /functions/v1/master-recipes/:id/versions/compare (Future)

Compare two versions side-by-side.

**Query Parameters:**

- `v1`: Version number (e.g., 3)
- `v2`: Version number (e.g., 7)

**Response:**

```json
{
  "version_a": {
    /* full version data */
  },
  "version_b": {
    /* full version data */
  },
  "diff": {
    "ingredients": [
      { "item": "salt", "v_a": "1 tsp", "v_b": "1.5 tsp", "change": "+50%" }
    ],
    "steps_changed": [3, 5, 7],
    "rating_change": "+2 stars",
    "ai_analysis": "Key differences: v7 uses higher heat and longer rest time"
  }
}
```

#### PATCH /functions/v1/master-recipes/:id (Future)

Set current version by updating `current_version_id`.

```json
{
  "current_version_id": "uuid"
}
```

#### POST /functions/v1/master-recipes/:id/analyze-iterations (Future)

Trigger AI analysis of all versions to generate insights.

**Response:**

```json
{
  "insights": [
    {
      "type": "pattern",
      "text": "Versions rated 4+ all had rest time > 10 minutes",
      "confidence": 0.85,
      "related_versions": [3, 5, 6, 7]
    },
    {
      "type": "regression",
      "text": "v4 scored lower when you removed the garlic paste from v3",
      "confidence": 0.78
    },
    {
      "type": "suggestion",
      "text": "Based on your notes, try combining v5 butter amount with v7 technique",
      "confidence": 0.65
    }
  ]
}
```

---

## 6. AI Prompts

All prompts use Claude API with claude-3-5-sonnet model. Prompts are versioned and stored as constants.

### 6.1 Recipe Extraction Prompt

```
RECIPE_EXTRACTION_PROMPT = `
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
      "grocery_category": "produce" | "dairy" | "meat" | "pantry" | "spices" | "bar"
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
- Flag low confidence in confidence_notes
`
```

### 6.2 Skill Adaptation Prompt

```
SKILL_ADAPTATION_PROMPT = `
You are a culinary instructor adapting recipe steps for different skill levels.

SKILL LEVELS:

BEGINNER:
- Explain every technique ('dice' = 'cut into small cubes about 1/4 inch')
- Include safety warnings ('be careful with hot oil')
- Give visual cues ('onions are done when they look translucent and soft')
- Suggest equipment alternatives if specialized tools needed
- Break complex steps into smaller sub-steps

HOME COOK:
- Use standard culinary terms without extensive explanation
- Include tips for better results ('let meat rest for juicier results')
- Mention common mistakes to avoid
- Keep steps practical but thorough

CHEF:
- Use professional terminology freely
- Focus on precision and technique refinement
- Include advanced tips ('temper the eggs to prevent scrambling')
- Assume knowledge of basic techniques
- Can combine related steps for efficiency

For the given recipe step, provide THREE versions:
{
  "beginner": "Detailed beginner-friendly instruction",
  "home_cook": "Standard instruction with helpful tips",
  "chef": "Concise professional instruction"
}

MODE-SPECIFIC ADAPTATIONS:

COOKING:
- Beginner: Explain doneness cues, suggest thermometer use
- Home Cook: Include seasoning adjustments
- Chef: Focus on timing and mise en place

MIXOLOGY:
- Beginner: Explain why we shake vs stir, what 'express' means
- Home Cook: Include specs, suggest garnish variations
- Chef: Reference classic ratios, discuss spirit selection

PASTRY:
- Beginner: Explain gluten development, temperature importance
- Home Cook: Include troubleshooting tips
- Chef: Use baker's percentages, discuss texture goals
`
```

### 6.3 Cooking Chat System Prompt

```
COOKING_CHAT_SYSTEM_PROMPT = `
You are CHEZ, an expert culinary assistant helping someone cook a recipe.

CONTEXT:
- Recipe: {recipe_title}
- Mode: {mode} (cooking/mixology/pastry)
- User skill level: {skill_level}
- Current step: {current_step} of {total_steps}
- Current instruction: {current_instruction}

YOUR ROLE:
1. Answer questions about the current recipe and cooking process
2. Explain techniques at the user's skill level
3. Offer substitutions when asked
4. Provide timing and temperature guidance
5. Help troubleshoot issues ('my sauce is too thin')

RESPONSE GUIDELINES:
- Be concise but helpful - user has messy hands
- Match terminology to skill level
- For BEGINNER: More explanation, visual cues, reassurance
- For HOME COOK: Balanced detail, tips for better results
- For CHEF: Efficient, technical, assumes knowledge

ALSO PROVIDE a 'voice_response' field with a shorter version suitable for TTS
(under 30 words when possible).

Respond in JSON:
{
  "response": "Full text response",
  "voice_response": "Shorter TTS version"
}
`
```

### 6.4 Voice Command Parser Prompt

```
VOICE_COMMAND_PARSER_PROMPT = `
Parse the user's voice command and determine the appropriate action.

CONTEXT:
- Current step: {current_step} of {total_steps}
- Recipe: {recipe_title}

RECOGNIZED COMMANDS:

NAVIGATION:
- "next step", "continue", "done", "next" → advance_step
- "previous step", "go back", "back" → previous_step
- "repeat", "say again", "what was that" → repeat_step
- "go to step 3", "step 5" → goto_step (extract step number)

INFORMATION:
- "how long", "what time", "timer" → get_time
- "what temperature", "how hot" → get_temperature
- "what do I need", "ingredients" → get_ingredients
- "read recipe", "full recipe" → read_recipe

QUESTIONS:
- Any question starting with 'what', 'why', 'how', 'can I' → ask_question
  (Pass the question to the cooking chat)

CONTROL:
- "pause", "stop", "hold on" → pause
- "resume", "continue" → resume
- "start timer for X minutes" → set_timer (extract duration)

Respond in JSON:
{
  "action": "action_name",
  "params": { /* action-specific params */ },
  "confidence": 0.0-1.0
}
`
```

### 6.5 Grocery List Consolidation Prompt

```
GROCERY_CONSOLIDATION_PROMPT = `
Consolidate ingredients from multiple recipes into a unified grocery list.

INPUT: Array of ingredients from multiple recipes

TASKS:
1. Combine same ingredients (2 cups flour + 1 cup flour = 3 cups flour)
2. Normalize units (convert to most common unit for item)
3. Categorize by grocery store section
4. Handle 'to taste' items (list once, no quantity)
5. Round quantities for shopping convenience (2.33 cups → 2.5 cups)

CATEGORIES:
- produce: Fresh fruits, vegetables, herbs
- dairy: Milk, cheese, eggs, butter
- meat: Beef, chicken, pork, seafood
- bakery: Bread, tortillas
- pantry: Canned goods, pasta, rice, oils
- spices: Dried herbs, spices, seasonings
- frozen: Frozen items
- bar: Spirits, mixers, bitters (for mixology)

OUTPUT: JSON array sorted by category, then alphabetically
[
  {
    "item": "onion",
    "quantity": 3,
    "unit": "medium",
    "category": "produce",
    "source_recipes": ["Pasta Carbonara", "French Onion Soup"]
  }
]
`
```

### 6.6 Recipe Iteration Analysis Prompt

```
ITERATION_ANALYSIS_PROMPT = `
You are a culinary R&D analyst helping a cook perfect their recipe through
systematic iteration. Analyze the version history and provide actionable insights.

INPUT: Array of recipe versions with:
- Version number and date
- Ingredient changes from previous version
- Technique changes
- Outcome rating (1-5)
- User notes (what worked, what didn't)
- Taster feedback

ANALYSIS TASKS:

1. PATTERN DETECTION
   - Identify correlations between changes and ratings
   - Find common elements in high-rated versions
   - Spot what's consistent in low-rated versions
   - Track ingredient ratios that work best

2. REGRESSION DETECTION
   - Flag when a change led to worse results
   - Identify if removing something hurt the recipe
   - Note when scaling caused issues

3. OPTIMIZATION SUGGESTIONS
   - Recommend specific next experiments
   - Suggest combining successful elements from different versions
   - Propose addressing noted issues

4. CONVERGENCE ASSESSMENT
   - Is the recipe improving? Plateauing? Getting worse?
   - Estimate how close to 'optimal' based on rating trend
   - Suggest if it's time to 'lock in' the recipe

OUTPUT: JSON array of insights
[
  {
    "type": "pattern" | "regression" | "optimization" | "convergence",
    "text": "Clear, actionable insight text",
    "confidence": 0.0-1.0,
    "related_versions": [version numbers],
    "evidence": "Brief explanation of why this insight"
  }
]

GUIDELINES:
- Be specific: '50g more butter' not 'more butter'
- Be actionable: What should they try next?
- Acknowledge uncertainty: Don't overstate with limited data
- Respect user expertise: They know their taste preferences
- Minimum 3 versions needed for pattern detection
- Weight recent versions higher (taste memory is fresher)
`
```

### 6.7 Substitution Suggestions Prompt

```
SUBSTITUTION_PROMPT = `
You are a culinary expert helping a cook find ingredient substitutions.

CONTEXT:
- Recipe: {recipe_title}
- Recipe mode: {mode} (cooking/mixology/pastry)
- Missing ingredient: {ingredient}
- How it's used in recipe: {usage_context}
- User skill level: {skill_level}

PROVIDE:
1. BEST substitution (closest result)
2. GOOD substitution (acceptable result)
3. OK substitution (will work but different)
4. OR explain if no good substitute exists

FOR EACH SUBSTITUTION INCLUDE:
- What to use
- Ratio/amount adjustment
- Any technique changes needed
- Expected difference in result

MODE-SPECIFIC RULES:

COOKING:
- Consider flavor profile, texture, cooking behavior
- Suggest across categories if needed (e.g., acid for acid)

MIXOLOGY:
- Stay within spirit categories when possible
- Note proof/ABV differences
- Warn if substitution changes cocktail classification

PASTRY:
- BE VERY CAREFUL - chemistry matters
- Warn about structural/leavening impacts
- Some things truly cannot be substituted

SKILL LEVEL ADAPTATION:
- Beginner: Simpler swaps, more explanation
- Home Cook: Standard suggestions with tips
- Chef: Include pro alternatives, assume knowledge

OUTPUT JSON:
{
  "ingredient": "heavy cream",
  "context": "for pasta sauce",
  "substitutions": [
    {
      "tier": "best",
      "substitute": "crème fraîche",
      "ratio": "1:1",
      "technique_change": "Add at same point, may be slightly tangier",
      "result_difference": "Very similar, slightly tangy"
    }
  ],
  "no_substitute_warning": null  // or explanation if truly no option
}
`
```

---

## 7. Screen-by-Screen UX

### 7.1 Onboarding Flow

#### Screen 1: Welcome

- CHEZ logo + tagline: "Your AI Sous Chef"
- Three value props with icons:
  - Import any recipe video instantly
  - Learn at your skill level
  - Cook hands-free with voice
- CTA: "Get Started" button

#### Screen 2: What Do You Love to Make?

- Mode selection (multi-select):
  - 🍳 Cooking - Savory dishes, meals
  - 🍸 Mixology - Cocktails, drinks
  - 🧁 Pastry - Baking, desserts
- At least one must be selected
- CTA: "Next"

#### Screen 3: Skill Level (per selected mode)

- For each selected mode, choose skill level:
  - Beginner: "I'm just starting out"
  - Home Cook: "I cook regularly"
  - Chef: "I'm a pro"
- Brief description of what each level means
- CTA: "Next"

#### Screen 4: Dietary Preferences

- Optional multi-select:
  - Vegetarian, Vegan, Gluten-Free, Dairy-Free, Nut-Free, Kosher, Halal
- "None" option available
- CTA: "Next"

#### Screen 5: Sign Up

- Continue with Apple (primary)
- Continue with Google
- Continue with Email
- Terms of Service + Privacy Policy links

#### Screen 6: Enable Notifications (iOS)

- Timer notifications during cooking
- Optional: Weekly recipe inspiration
- CTA: "Enable" or "Maybe Later"

### 7.2 Home Screen

#### Layout

- Top: Greeting + User avatar
- Quick Actions row: `[+ Import] [📋 Grocery List] [🎙 Voice Mode]`
- **Planned This Week** (horizontal scroll, prominent)
- Recent Recipes (horizontal scroll)
- Continue Cooking (if session in progress)
- Collections (Favorites, by Mode, by Category)

#### Bottom Navigation

`Home | Recipes | Import | Lists | Profile`

### 7.3 Import Screen

#### Initial State

- Large paste area: "Paste a video link or website URL"
- Supported platforms icons: TikTok, Instagram, YouTube, Web
- Recent clipboard detection (auto-show if URL detected)

#### Processing State

- Progress indicator with stages:
  - "Fetching video..."
  - "Transcribing audio..."
  - "Extracting recipe..."
- Video thumbnail preview when available
- Cancel option

#### Success State

- Recipe preview card:
  - Title (editable)
  - Detected mode badge (changeable)
  - Ingredient count
  - Time estimate
  - Confidence score indicator
- Source attribution (creator name + platform)
- CTAs: "Save Recipe" | "Edit First" | "Cook Now"

#### Fallback State (extraction failed)

- Friendly message: "I couldn't extract this automatically"
- Manual entry form:
  - Recipe name (required)
  - Creator name (optional)
  - Paste or type recipe text (required)
- CTA: "Save Recipe"

### 7.4 Recipe Detail Screen

#### Header

- Hero image/thumbnail from source
- Title
- Mode badge + Skill level indicator
- Source: "@creator on TikTok" (tappable to open original)
- Actions: Heart (favorite), Share, Edit, Delete

#### Quick Stats Row

`⏱ Total time | 👥 Servings | 📊 Difficulty`

#### State Actions

- 📌 **Saved:** Shows "Plan This" button
- 📅 **Planned:** Shows planned date, "Start Cooking" button
- ✓ **Cooked:** Shows last cooked date, rating, "Cook Again"

#### Tabs

**Ingredients Tab:**

- List of ingredients with quantities
- Tap to check off (for prep)
- "Add to Grocery List" button
- Scale slider (0.5x, 1x, 2x, custom)

**Steps Tab:**

- Numbered step cards
- Each shows: instruction, time, temperature if applicable
- Technique terms underlined (tappable for definition)

**Notes Tab:**

- User's personal notes
- Cooking history (dates, ratings)
- AI-suggested variations

#### Floating Action Button

"Start Cooking" — initiates cook mode

### 7.5 Cook Mode Screen

#### Layout (full screen, optimized for distance viewing)

- Large step number: "2 of 8"
- Large instruction text (auto-sizes to fit)
- Timer display (if step has time)
- Progress bar

#### Controls (bottom)

- Previous | Play/Pause Voice | Next
- Mic button (for voice commands)
- "Ask a Question" text input

#### Voice Mode Active Indicator

- Pulsing mic icon when listening
- "Tap mic to speak" (Pro only)

#### Timer Bar (when timers active)

- Shows all active timers with color coding
- Tap to expand/manage individual timers

#### Question/Chat Overlay

- Slides up from bottom
- Shows conversation with AI
- Voice response auto-plays

#### Completion Screen

- "How did it turn out?"
- 5-star rating
- Quick tags: "Perfect", "Made adjustments", "Had issues"
- "What did you change?" text field (simple iteration tracking)
- Notes field
- "Save & Done" button

### 7.6 Grocery List Screen

#### List View

- Active list at top
- Items grouped by category (Produce, Dairy, etc.)
- Each item: checkbox, name, quantity, source recipe(s)
- Swipe to delete
- "I already have this" toggle

#### Actions

- Add manual item (+ button)
- Clear checked items
- Share list (text format)

#### Empty State

- Illustration + "Add recipes to create a grocery list"
- CTA: "Browse Recipes"

### 7.7 Profile/Settings Screen

#### Profile Section

- Avatar, name, email
- Subscription status + "Upgrade" if free
- Stats: Recipes saved, Times cooked, Current streak

#### Preferences

- Skill levels (per mode)
- Dietary restrictions
- Measurement units (Imperial/Metric)

#### Voice Settings

- Voice enabled (toggle, Pro only)
- Voice speed slider
- Voice selection (if multiple available)

#### Account

- Manage subscription
- Export data
- Log out
- Delete account

#### Support

- Help center
- Contact us
- Rate the app

### 7.8 Recipe Version History Screen (Pro)

#### Version Timeline View

- Visual timeline showing all versions
- Branch points visible (when user forked)
- Star ratings displayed on timeline
- Current best version highlighted
- Tap any version to see details

#### Version Detail View

- Version number + name + date
- Rating (editable)
- Changes from parent version:
  - Ingredient changes (added/removed/modified)
  - Technique changes
  - Equipment changes
- Outcome notes (what worked, what didn't)
- Photos (swipeable gallery)
- Taster feedback list
- Actions: Edit, Set as Best, Fork from Here, Delete

#### Version Compare View

- Side-by-side comparison of two versions
- Dropdown selectors for each version
- Diff view showing:
  - Ingredient differences highlighted
  - Step differences highlighted
  - Rating change
- AI summary of key differences

#### Log New Version Screen

- Appears after completing a cook session
- Pre-filled with current recipe
- Easy toggles for common changes:
  - "More salt" / "Less salt" quick buttons
  - Quantity adjustment sliders
  - Technique change text fields
- Star rating selector
- What worked / What didn't text areas
- Photo capture buttons
- "Add Taster Feedback" button
- Save as new version CTA

#### Insights Panel

- Collapsible panel showing AI insights
- Pattern cards with evidence
- Suggestion cards with "Try This" CTA
- Dismissible (swipe away)
- Helpful/Not Helpful feedback buttons

---

## 8. Data Flows

### 8.1 Video Import Flow (Multi-Source Architecture)

```
User pastes URL
       │
       ▼
┌─────────────────────┐
│ Normalize URL       │ → Platform-specific normalization
│ Detect Platform     │ → TikTok / Instagram / YouTube / Web
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│ Check video_sources cache (global)              │
│ - If exists: reuse transcript (update last_     │
│   accessed_at) → Skip extraction                │
│ - If not: continue to extraction                │
└──────────┬──────────────────────────────────────┘
           │
           ▼ (if not cached)
┌─────────────────────┐     ┌─────────────────────┐
│ Extract Metadata    │────►│ Extraction Service  │
│ (Title, Creator,    │     │ Layer 1-4           │
│  Thumbnail, Caption)│     └─────────────────────┘
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Has Audio?          │─Yes─►│ Download Audio      │
└──────────┬──────────┘     └──────────┬──────────┘
           │No                         │
           │                           ▼
           │              ┌─────────────────────┐
           │              │ Whisper API         │
           │              │ (Transcribe)        │
           │              └──────────┬──────────┘
           │                         │
           ▼                         ▼
┌─────────────────────────────────────────────────┐
│ Save to video_sources (global cache)            │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│ Claude API: Recipe Extraction                   │
│ Input: transcript + caption + title             │
│ Output: Structured recipe JSON                  │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│ Check user's existing master_recipes            │
│ - Fuzzy match title + mode                      │
│ - If similar found: return needs_confirmation   │
│ - If not found: auto-create                     │
└──────────────────────┬──────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐
│ Auto-create flow    │   │ Confirmation flow   │
│                     │   │                     │
│ - Create master_    │   │ - Create recipe_    │
│   recipes row       │   │   source_links      │
│ - Create initial    │   │   (status: pending) │
│   master_recipe_    │   │ - Return suggestions│
│   versions (v1)     │   │   for linking       │
│ - Create recipe_    │   │                     │
│   source_links      │   │ User confirms:      │
│   (status: linked)  │   │ - link_existing     │
│                     │   │ - create_new        │
└──────────┬──────────┘   └──────────┬──────────┘
           │                         │
           └───────────┬─────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│ Save to Database                                │
│ - video_sources (global cache)                  │
│ - recipe_source_links (user's link)             │
│ - master_recipes (user's recipe)                │
│ - master_recipe_versions (immutable snapshot)   │
│ - extraction_logs                               │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
              Return master_recipe to client
```

### 8.2 Cook Session Flow

```
User taps 'Start Cooking'
       │
       ▼
┌─────────────────────────────────────────────────┐
│ Create cook_session record in database          │
│ - master_recipe_id = selected master recipe     │
│ - version_id = master_recipe.current_version_id │
│ - Get ingredients/steps from that version       │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Claude API: Adapt   │────►│ Generate steps at   │
│ recipe to skill     │     │ user's skill level  │
└──────────┬──────────┘     └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Enter Cook Mode UI  │
│ Show Step 1         │
└──────────┬──────────┘
           │
     ┌─────┴─────────────────────────────┐
     │                                   │
     ▼                                   ▼
┌───────────────┐                 ┌───────────────┐
│ VOICE PATH    │                 │ TOUCH PATH    │
│ (Pro only)    │                 │               │
│               │                 │ Tap Next/Prev │
│ Tap mic btn   │                 │ buttons       │
│      │        │                 │               │
│      ▼        │                 │               │
│ Record audio  │                 │               │
│      │        │                 │               │
│      ▼        │                 │               │
│ Whisper STT   │                 │               │
│      │        │                 │               │
│      ▼        │                 │               │
│ Parse command │                 │               │
└───────┬───────┘                 └───────┬───────┘
        │                                 │
        └───────────────┬─────────────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Action Handler  │
               │ - advance_step  │
               │ - previous_step │
               │ - ask_question  │
               │ - set_timer     │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ TTS Response    │
               │ (OpenAI TTS)    │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Update UI       │
               │ Update session  │
               └─────────────────┘
                        │
            (Loop until complete)
                        │
                        ▼
               ┌─────────────────┐
               │ Completion      │
               │ - Rating        │
               │ - Feedback      │
               │ - Update stats  │
               │ - Status→cooked │
               └─────────────────┘
```

### 8.3 Grocery List Generation Flow

```
User selects recipes to plan
       │
       ▼
┌─────────────────────┐
│ Update recipe       │
│ status → 'planned'  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Fetch ingredients   │
│ from all recipes    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Claude API:         │────►│ Consolidation logic │
│ Consolidate items   │     │ - Combine same item │
│                     │     │ - Normalize units   │
│                     │     │ - Round quantities  │
└──────────┬──────────┘     └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Categorize by       │
│ grocery section     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Check pantry items  │
│ Auto-mark 'have'    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Save grocery_list   │
│ + grocery_items     │
└──────────┬──────────┘
           │
           ▼
Return list to client
```

---

## 9. Third-Party Integrations

### 9.1 Integration Summary

| Service                | Purpose                             | Pricing              | Implementation               |
| ---------------------- | ----------------------------------- | -------------------- | ---------------------------- |
| Claude API             | Recipe extraction, chat, adaptation | $3/$15 per 1M tokens | Direct API via Edge Function |
| OpenAI Whisper         | Audio transcription                 | $0.006/minute        | Direct API via Edge Function |
| ScrapeCreators         | TikTok/IG metadata                  | Credit-based         | REST API                     |
| Apify                  | Instagram Reels (backup)            | Usage-based          | REST API                     |
| YouTube Data API       | Video metadata                      | Free (10K/day)       | REST API                     |
| youtube-transcript-api | YouTube captions                    | Free                 | Python library               |
| OpenAI TTS             | Text-to-speech (Pro only)           | $15/1M chars         | Direct API via Edge Function |
| RevenueCat             | Subscription management             | 1% of revenue        | SDK + webhooks               |
| PostHog                | Analytics                           | Free tier generous   | SDK                          |
| Supabase               | Backend, Auth, DB, Storage          | $25/mo Pro           | SDK                          |

### 9.2 API Keys & Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Server-side only

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Video Extraction
SCRAPECREATORS_API_KEY=xxx
RAPIDAPI_KEY=xxx
APIFY_API_TOKEN=xxx
YOUTUBE_API_KEY=xxx

# Voice (handled by OpenAI keys above - Whisper + TTS)

# Payments
REVENUECAT_API_KEY=xxx
REVENUECAT_WEBHOOK_SECRET=xxx

# Analytics
POSTHOG_API_KEY=xxx
```

### 9.3 Supabase Configuration

#### Row Level Security (RLS) Policies

```sql
-- video_sources: Users can only read sources they've linked
CREATE POLICY "Users can read video sources they have linked"
  ON video_sources FOR SELECT
  USING (id IN (SELECT video_source_id FROM recipe_source_links WHERE user_id = auth.uid()));

-- master_recipes: Users can manage their own
CREATE POLICY "Users can manage their own master recipes"
  ON master_recipes FOR ALL
  USING (auth.uid() = user_id);

-- master_recipe_versions: Inherit from master_recipes
CREATE POLICY "Users can manage versions of their master recipes"
  ON master_recipe_versions FOR ALL
  USING (master_recipe_id IN (SELECT id FROM master_recipes WHERE user_id = auth.uid()));

-- recipe_source_links: Users can manage their own
CREATE POLICY "Users can manage their own source links"
  ON recipe_source_links FOR ALL
  USING (auth.uid() = user_id);

-- Apply similar "auth.uid() = user_id" policies to:
-- users, cook_sessions, user_cooking_memory, grocery_lists, grocery_items
```

#### Edge Functions Structure

```
supabase/functions/
├── confirm-source-link/     # Links pending source to master recipe
│   └── index.ts
├── cook-chat/               # AI cooking assistant conversation
│   └── index.ts
├── embed-memory/            # Creates embeddings for user memories
│   └── index.ts
├── import-recipe/           # Extracts recipe from video URL
│   └── index.ts
├── text-to-speech/          # OpenAI TTS for voice responses
│   └── index.ts
└── whisper/                 # OpenAI Whisper STT for voice input
    └── index.ts
```

### 9.4 RevenueCat Setup

#### Products

```
Identifier: chez_pro_monthly
Type: Auto-Renewable Subscription
Price: $4.99/month

Identifier: chez_pro_annual
Type: Auto-Renewable Subscription
Price: $39.99/year
```

#### Entitlements

```
pro: Grants access to Pro features
  - 50 imports/month (vs 3 free)
  - 200 AI questions/month (vs 10 free)
  - Voice TTS + STT (tap-to-speak)
  - Hands-free cook mode
  - Skill level adaptations
```

#### Webhook Events

- **INITIAL_PURCHASE:** Update user.subscription_tier, subscription_expires_at
- **RENEWAL:** Extend subscription_expires_at
- **CANCELLATION:** Mark for downgrade at period end
- **EXPIRATION:** Downgrade to free tier

---

## 10. Cost Model

### 10.1 Per-User Variable Costs

**Assumptions:** Active user imports 10 recipes/month, cooks 8 times/month

#### Import Costs

| Component                       | Cost Per Import | Monthly (10x) |
| ------------------------------- | --------------- | ------------- |
| Video metadata extraction (avg) | $0.003          | $0.03         |
| Whisper transcription (30s avg) | $0.003          | $0.03         |
| Claude extraction               | $0.006          | $0.06         |
| **TOTAL IMPORT**                | **$0.012**      | **$0.12**     |

#### Cook Session Costs

| Component                        | Cost Per Cook | Monthly (8x) |
| -------------------------------- | ------------- | ------------ |
| Skill adaptation (Claude)        | $0.008        | $0.064       |
| Chat messages (5 avg, Claude)    | $0.010        | $0.080       |
| Voice commands (10 avg, Whisper) | $0.006        | $0.048       |
| TTS read-aloud (OpenAI, Pro)     | $0.003        | $0.024       |
| **TOTAL COOK**                   | **$0.027**    | **$0.216**   |

#### Fixed Per-User Costs

| Component              | Monthly Cost |
| ---------------------- | ------------ |
| Supabase (amortized)   | $0.005       |
| Storage                | $0.001       |
| OpenAI TTS (Pro users) | $0.010       |
| Buffer (20%)           | $0.065       |
| **TOTAL FIXED**        | **$0.081**   |

#### Total Cost Per Active User

**$0.12 (imports) + $0.19 (cooks) + $0.08 (fixed) = $0.39/month**

### 10.2 Revenue Model

| Tier        | Price                | App Store Cut | Net Revenue |
| ----------- | -------------------- | ------------- | ----------- |
| Free        | $0                   | $0            | $0          |
| Pro Monthly | $4.99                | $1.50 (30%)   | $3.49       |
| Pro Annual  | $39.99/yr = $3.33/mo | $1.00 (30%)   | $2.33/mo    |

### 10.3 Unit Economics

| Metric        | Monthly Sub | Annual Sub |
| ------------- | ----------- | ---------- |
| Net Revenue   | $3.49       | $2.33      |
| Cost to Serve | $0.40       | $0.40      |
| Gross Profit  | $1.70       | $0.78      |
| Gross Margin  | 81%         | 67%        |

### 10.4 Break-Even Analysis

```
Fixed Monthly Costs:
  Supabase Pro:           $25
  Apple Developer:        $8.33 ($99/year)
  Domain + Email:         $5
  Monitoring (Sentry):    $0 (free tier)
  ─────────────────────────
  Total Fixed:            $38.33/month

Break-Even (Monthly Subs): $38.33 / $1.70 = 23 users
Break-Even (Annual Subs):  $38.33 / $0.78 = 50 users
Break-Even (50/50 blend):  $38.33 / $1.24 = 31 users
```

---

## 11. MVP vs v1.1 Prioritization

For hackathon success, we must ship a polished subset rather than a rough complete product.

### 11.1 The 90-Second Demo Loop

This is the ONLY thing that matters for judging. Every feature must serve this flow:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE WINNING DEMO (90 seconds)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. IMPORT (15 sec)                                                     │
│     • Copy TikTok link from phone                                       │
│     • Paste into app                                                    │
│     • Watch recipe card appear with ingredients + steps                 │
│     • "Wow, it extracted everything!"                                   │
│                                                                         │
│  2. PLAN & GROCERY (20 sec)                                            │
│     • Tap "Plan This Week"                                              │
│     • Show grocery list auto-populated                                  │
│     • Show consolidation: "3 recipes, 1 list, duplicates merged"        │
│     • Check off "Already have" items                                    │
│                                                                         │
│  3. COOK (30 sec)                                                       │
│     • Tap "Start Cooking"                                               │
│     • Show clean step-by-step UI                                        │
│     • Set a timer (show multiple timer bar)                             │
│     • Ask a question: "What does simmer mean?"                          │
│     • Get instant helpful answer                                        │
│                                                                         │
│  4. COMPLETE (10 sec)                                                   │
│     • Finish cooking                                                    │
│     • Rate + note what you'd change                                     │
│     • See "Cooked!" badge on recipe                                     │
│                                                                         │
│  5. PAYWALL (15 sec)                                                    │
│     • Try to import 4th recipe (free tier = 3)                          │
│     • Hit paywall: "Upgrade to Pro"                                     │
│     • Show RevenueCat subscription flow                                 │
│     • Subscribe → Unlock                                                │
│                                                                         │
│  SCORING:                                                               │
│  ✓ Audience Fit (30%): Solves Eitan's exact problem                    │
│  ✓ UX Polish (25%): Clean, fast, delightful                            │
│  ✓ Monetization (20%): Clear paywall + RevenueCat                      │
│  ✓ Technical (15%): AI extraction + real-time                          │
│  ✓ Completeness (10%): Shipping working app                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 MVP Feature List (Must Ship)

| Feature                      | Why MVP                   | Demo Impact        |
| ---------------------------- | ------------------------- | ------------------ |
| YouTube import               | Most reliable, free API   | HIGH - Demo backup |
| TikTok import                | Core value prop           | HIGH - Hero moment |
| Recipe extraction (Claude)   | The magic                 | HIGH               |
| Recipe library + states      | Saved/Planned/Cooked flow | HIGH               |
| Cook mode (touch)            | Core experience           | HIGH               |
| Multiple timers              | Real cooking need         | MEDIUM             |
| AI chat in cook mode         | Key differentiator        | HIGH               |
| Grocery list                 | On the brief              | HIGH               |
| Grocery consolidation        | Magical moment            | HIGH               |
| Basic pantry ("I have this") | Smart list experience     | MEDIUM             |
| Allergen warnings            | Safety + polish           | MEDIUM             |
| RevenueCat paywall           | Required by brief         | HIGH - Required    |
| Rate + notes after cook      | Feedback loop             | MEDIUM             |

### 11.3 v1.1 Features (Post-Hackathon)

| Feature                     | Why Defer                                           |
| --------------------------- | --------------------------------------------------- |
| Instagram import            | Less reliable, TikTok + YouTube enough for demo     |
| Wake word ("Hey CHEZ")      | Requires native modules; tap-to-speak works well    |
| Full iteration tracking     | Pro feature; MVP has simple notes only              |
| Mixology/Pastry UI emphasis | Detection works, but don't demo; Cooking mode focus |
| Substitution suggestions    | Nice-to-have; add if time permits in Week 4         |
| Offline mode                | Important but demo has WiFi; add post-launch        |
| Skill level adaptation      | Ship "Home Cook" only; toggle is v1.1               |
| ~~Voice TTS responses~~     | **DONE** - OpenAI TTS implemented (Pro only)        |
| Recipe sharing              | Not in judging criteria                             |
| Nutrition info              | Not in judging criteria                             |

### 11.4 Demo Day Risk Mitigation

#### 11.4.1 Extraction Failure Risk

If TikTok scraper fails during demo:

- **BACKUP 1:** Have 3 pre-tested TikTok URLs that are known to work
- **BACKUP 2:** Switch to YouTube import (99% reliable)
- **BACKUP 3:** Have a pre-imported recipe ready to show
- **NEVER** demo live import without a backup plan

#### 11.4.2 Network Failure Risk

If WiFi is unreliable at venue:

- Pre-cache several recipes before demo
- Have mobile hotspot as backup
- Cook mode works with cached data
- Record video backup of full flow

#### 11.4.3 RevenueCat Risk

If payment flow fails:

- Use sandbox/test mode for demo
- Have screenshots of successful flow
- Explain: "In production, this connects to App Store"

#### 11.4.4 Demo Device Prep

- [ ] Fresh install on demo device
- [ ] Logged into test account
- [ ] 3 recipes pre-imported (show library isn't empty)
- [ ] Grocery list with sample data
- [ ] Battery fully charged
- [ ] Do Not Disturb enabled
- [ ] Screen recording running as backup

### 11.5 What "Polish" Means for This Brief

UX Polish is 25% of score. Here's what judges notice:

- **Speed:** Import should feel instant (show loading state, but fast)
- **Transitions:** Smooth animations between screens
- **Empty states:** Beautiful prompts when no data yet
- **Error handling:** Graceful messages, not crashes
- **Typography:** Clean, readable, consistent
- **Touch targets:** Big enough for messy hands
- **Feedback:** Haptics on key actions
- **Delight:** One "wow" moment (the extraction magic)

---

## 12. Four-Week Sprint Plan

### 12.1 Week 1: Foundation

**Goal:** Core infrastructure + YouTube import working end-to-end

#### Days 1-2: Project Setup

- Initialize Expo project with TypeScript
- Configure Supabase project (auth, database, storage)
- Set up CI/CD (EAS Build)
- Create database schema (all tables including status field)
- Configure environment variables

#### Days 3-4: Authentication + Basic UI

- Implement Supabase Auth (email, Apple, Google)
- Build onboarding flow (simplified: mode selection, skill level)
- Create bottom navigation structure
- Build home screen with Saved/Planned/Cooked sections

#### Days 5-7: YouTube Import (MVP Demo Backup)

- Implement YouTube transcript extraction (free library)
- Implement YouTube Data API metadata fetch
- Build Claude recipe extraction prompt
- Create import screen UI with loading states
- Implement recipe save to database with "saved" status
- Build recipe detail screen with "Plan This" button

**Deliverable:** App that imports YouTube recipes and shows Saved/Planned organization

### 12.2 Week 2: TikTok Import + Grocery Lists

**Goal:** TikTok working (hero feature) + grocery list with consolidation

#### Days 1-3: TikTok Import (Hero Feature)

- Integrate ScrapeCreators API for TikTok
- Implement Whisper transcription for audio-only videos
- Build fallback to RapidAPI if primary fails
- Create manual entry fallback UI
- TEST: Import 20+ real TikTok cooking videos
- Build confidence score display

#### Days 4-5: Grocery Lists + Consolidation

- Build grocery list creation from planned recipes
- Implement Claude consolidation prompt
- Create grocery list UI grouped by store section
- Add "I already have this" toggle (basic pantry)
- Add check-off functionality
- Planning a recipe auto-adds to grocery list

#### Days 6-7: Recipe Management Polish

- Recipe list screen with filtering (Saved/Planned/Cooked tabs)
- Recipe editing capabilities
- Allergen detection + warning display
- Recipe search

**Deliverable:** TikTok import working + smart grocery lists

### 12.3 Week 3: Cook Mode + AI Chat

**Goal:** Complete cooking experience with AI assistance (touch-based)

#### Days 1-2: Cook Mode Core

- Build full-screen cook mode layout (large text, touch-friendly)
- Implement step navigation (next/previous)
- Create timer functionality (single timer first)
- Build progress tracking
- Implement cook session database records
- Status auto-updates to "cooked" on completion

#### Days 3-4: Multiple Timers + AI Chat

- Build multiple concurrent timers (up to 5)
- Timer bar UI showing all active timers
- Implement AI chat during cooking
- Build Claude cooking chat prompt
- Create chat overlay UI (slides up from bottom)

#### Days 5-7: Post-Cook + RevenueCat

- Build completion screen with rating
- Add "What I changed" notes field (simple iteration tracking)
- Integrate RevenueCat SDK
- Create subscription products in App Store Connect
- Build paywall UI (appears at 4th import for free users)
- Implement entitlement checks

**Deliverable:** Complete cook mode + working paywall

### 12.4 Week 4: Polish + Launch Prep

**Goal:** Production-ready app optimized for demo day

#### Days 1-2: Polish Sprint

- Empty states for all screens (beautiful, encouraging)
- Loading states and animations
- Error handling throughout
- Haptic feedback on key actions
- Typography and spacing audit

#### Days 3-4: Testing + Bug Fixes

- Full end-to-end testing of demo flow
- Test TikTok extraction on 30+ real videos
- Test paywall flow in sandbox mode
- Test on multiple device sizes
- Fix critical bugs only (no new features!)
- Performance optimization

#### Days 5-6: Demo Prep

- Prepare 3 pre-tested TikTok URLs for demo
- Pre-import backup recipes to demo device
- Record backup video of full demo flow
- Create demo script with talking points
- Practice demo 5+ times

#### Day 7: Launch Prep

- App Store screenshots and description
- Demo video recording (< 3 minutes)
- TestFlight build for judges
- Hackathon submission materials
- Final device prep checklist

**Deliverable:** Polished app + flawless demo

### 12.5 Sprint Milestones

| Week | Milestone               | Success Criteria                       |
| ---- | ----------------------- | -------------------------------------- |
| 1    | YouTube Import Working  | Can paste YT URL, see extracted recipe |
| 2    | All Platforms Importing | TikTok, YT, manual all work            |
| 3    | Voice Cooking Complete  | Full cook session with chat works      |
| 4    | Submission Ready        | App Store build + demo video           |

---

## 13. Risk Register

### 13.1 Technical Risks

| Risk                         | Likelihood | Impact | Mitigation                                                                              |
| ---------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------- |
| TikTok scraper blocked       | High       | High   | Multi-layer fallback (4 providers), manual entry option, browser extension backup plan  |
| Instagram scraper blocked    | High       | Medium | Apify + ScrapeCreators + oEmbed fallback, manual entry                                  |
| Claude extraction inaccurate | Medium     | Medium | Confidence scores, user edit capability, feedback loop for prompt improvement           |
| Voice recognition fails      | Medium     | Low    | Kitchen-tested prompts, fallback to touch controls always available                     |
| API costs exceed estimates   | Medium     | Medium | Usage monitoring, automatic throttling, caching popular recipes, Haiku for simple tasks |

### 13.2 Business Risks

| Risk                        | Likelihood | Impact | Mitigation                                                                           |
| --------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------ |
| Low conversion rate         | Medium     | High   | Compelling free tier to demonstrate value, optimized onboarding, paywall A/B testing |
| Competitor launches similar | Medium     | Medium | Speed to market, unique voice features, strong content creator partnerships          |
| App Store rejection         | Low        | High   | Follow guidelines strictly, have contingency for web app fallback                    |
| Platform ToS changes        | Low        | High   | Diversify sources, build direct creator relationships, browser extension option      |

### 13.3 Schedule Risks

| Risk                           | Likelihood | Impact | Mitigation                                                           |
| ------------------------------ | ---------- | ------ | -------------------------------------------------------------------- |
| Scope creep                    | High       | High   | Strict MVP definition, cut list ready, daily scope check             |
| Third-party integration delays | Medium     | Medium | Start integrations early, have mock data ready, parallel workstreams |
| Bug backlog grows              | Medium     | Medium | Fix-as-you-go policy, dedicated bug time in Week 4                   |

### 13.4 Contingency: MVP Cut List

If running behind schedule, cut in this order:

1. Grocery list consolidation AI (keep manual lists)
2. Multiple skill levels (ship with "Home Cook" only)
3. Web recipe import (keep video-only)
4. ~~Wake word detection~~ (deferred - tap-to-speak implemented)
5. Instagram support (keep TikTok + YouTube)

**Core MVP that MUST ship:** TikTok import + Recipe viewing + Basic cook mode with touch controls

---

## 14. Product Roadmap

This section preserves all planned features with clear timelines. Nothing is lost — only staged for maximum impact.

### 14.1 MVP (Hackathon: Weeks 1-4)

**Ship date:** End of Week 4
**Goal:** Win the Eitan track

#### Core Features

- YouTube video import (most reliable)
- TikTok video import (hero feature)
- Claude recipe extraction with confidence scores
- Recipe library with Saved → Planned → Cooked states
- Grocery list with AI consolidation
- Basic pantry ("I already have this")
- Allergen detection and warnings
- Cook mode with step-by-step navigation
- Multiple concurrent timers (up to 5)
- AI chat during cooking (tap to ask)
- Post-cook rating and simple notes
- RevenueCat paywall (free: 3 imports, Pro: unlimited)

#### Technical Foundation

- Expo + React Native
- Supabase (Auth, Database, Edge Functions)
- Full database schema (11 tables)
- Mode auto-detection (works silently)
- Extraction fallback layers (API → backup → manual)

### 14.2 Version 1.1 (Weeks 5-8)

**Goal:** Expand platform support and enable power features

#### Platform Expansion

- Instagram Reels import
- Web recipe import (Schema.org + Claude fallback)
- Improved extraction reliability monitoring

#### Voice Experience

- ~~"Hey CHEZ" wake word~~ (deferred - requires native modules)
- Voice command navigation via tap-to-speak (next step, repeat, timer) **[DONE]**
- Text-to-speech responses via OpenAI TTS (Pro only) **[DONE]**
- Voice command parser prompt **[DONE]**

#### Skill Levels Enabled

- User can toggle: Beginner / Home Cook / Chef
- Recipe steps adapt to selected level
- Claude skill adaptation prompt active
- Per-mode skill levels (different for cooking vs pastry)

#### Substitution Suggestions

- "I don't have this" button on ingredients
- AI suggests alternatives based on recipe context
- Mode-aware (pastry warns about chemistry)

#### Offline Mode (Basic)

- Cached recipes viewable offline
- Cook mode works without internet
- Actions queue for sync when back online

### 14.3 Version 1.2 (Weeks 9-12)

**Goal:** Full iteration tracking for serious cooks

#### Recipe Iteration Tracking

- Version timeline view
- Track changes: ingredients, techniques, equipment
- Outcome notes: what worked, what didn't
- Photo capture per version
- Taster feedback collection
- Fork/branch from any version
- Compare two versions side-by-side

#### AI Iteration Insights

- Pattern detection across versions
- Regression warnings ("removing X made it worse")
- Optimization suggestions
- Convergence assessment ("you might be done iterating")

#### Pro Chef Features

- Batch scaling (up to 50x)
- Production scheduling
- Cost analysis per serving
- Team accounts (Pro tier expansion)

### 14.4 Version 2.0 (Months 4-6)

**Goal:** Platform expansion and creator ecosystem

#### Mixology Mode (Full UI)

- Dedicated mixology interface
- oz/ml/parts toggle
- Spirit categories and substitutions
- Batching calculator for parties
- Pour cost analysis (Pro)
- Cocktail-specific garnish suggestions

#### Pastry Mode (Full UI)

- Dedicated pastry/baking interface
- Baker's percentages display (Chef level)
- Temperature sensitivity warnings
- Humidity/altitude adjustments
- Timeline generator ("start 2 days before")
- Troubleshooting assistant ("why did my cake sink?")

#### Specialized Sub-Domain Support

- BBQ/Smoking mode: smoke wood, temp zones, bark tracking
- Fermentation mode: pH tracking, timing, safety warnings
- Sous vide mode: time-temp charts, finishing suggestions
- Coffee mode: grind size, ratios, extraction time

#### Social & Sharing

- Share recipe cards
- Public profile (optional)
- Follow creators
- Recipe collections sharing

#### Cookbook Shelf (Future Exploration)

- User enters cookbook titles (metadata only)
- "I want to make something from this book" prompt
- Match user's pantry to cookbook recipes (user-entered)
- Note: No copyrighted content — user transcribes their own

### 14.5 Feature Parking Lot

Ideas captured but not yet scheduled. Review quarterly.

- Apple Watch app (timer notifications, quick actions)
- Home screen widgets (next planned recipe, streak)
- Nutrition information integration (Open Food Facts)
- Barcode scanning for pantry
- Meal planning calendar view
- Dietary goal tracking
- Shopping list sharing (family sync)
- Integration with grocery delivery (Instacart API)
- Recipe scaling with equipment warnings ("this won't fit in standard mixer")
- Video bookmarking (timestamp specific moments in source video)
- AI-generated recipe images (for manual entry recipes)
- Community recipe variations
- Restaurant menu recreation ("I had this at X, help me make it")
- Equipment recommendations based on cooking patterns
- Seasonal ingredient suggestions
- Local ingredient sourcing (farmers markets, specialty stores)

### 14.6 Research & Decisions Preserved

Key decisions made during planning that should not be revisited without new information:

#### Why Three Modes (Not More)

- Cooking, Mixology, Pastry cover 95%+ of food content
- BBQ/Coffee/Fermentation are sub-domains of Cooking
- Each mode has fundamentally different measurement systems
- Adding more modes fragments the experience without proportional value

#### Why Not Full Cookbook Integration

- Copyright risk for hackathon and commercial use
- Dataset licensing issues (Recipe1M+, FlavorDB are non-commercial)
- User-entered cookbook recipes are safe (personal use)
- Focus on video import solves the core problem without legal risk

#### Why Supabase Over Custom Backend

- Instant auth, database, storage, edge functions
- RLS handles security without custom code
- Realtime for grocery list sync
- $25/month Pro tier is economical at scale
- Can migrate to custom backend later if needed

#### Why Claude Over GPT for Extraction

- Better structured output reliability
- Superior reasoning for ambiguous recipes
- Consistent JSON formatting
- Sonnet is cost-effective for our use case

#### Why RevenueCat Over Direct StoreKit

- Required by hackathon brief
- Handles App Store + Play Store complexity
- Webhook-based subscription management
- Analytics and A/B testing built-in
- 1% fee is worth the saved development time

#### Scraping Reliability Research

- TikTok: ScrapeCreators (primary) → RapidAPI (backup) → Manual
- Instagram: Apify Reel Scraper (includes transcripts)
- YouTube: youtube-transcript-api (free, 99% reliable)
- Web: Schema.org JSON-LD parsing → Claude HTML extraction
- Expected success rate: 90% primary, 95% with fallback, 99% with manual

#### Cost Model Validated

- Cost per active user: ~$0.40/month
- Break-even: ~31 paying users (blended)
- Gross margin: 67-81% depending on subscription type
- Costs survive 2x increase in API pricing

---

## 15. Appendices

### 15.1 Glossary

**Mode:** The culinary domain (cooking, mixology, pastry) that determines specialized behavior

**Skill Level:** User's expertise level (beginner, home_cook, chef) that affects recipe presentation

**Extraction:** The process of getting structured recipe data from video/web content

**Adaptation:** Modifying recipe instructions to match user's skill level

**Cook Session:** An active instance of a user cooking a recipe with the app's guidance

**Consolidation:** Combining ingredients from multiple recipes into a single grocery list

**Recipe State:** Where a recipe is in the user journey (saved, planned, cooked)

**Version:** A tracked iteration of a recipe with documented changes

### 15.2 File Structure

```
chef-ai/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Auth screens (login, signup)
│   ├── (tabs)/             # Main tab screens
│   │   ├── index.tsx       # Home
│   │   ├── recipes.tsx     # Recipe list
│   │   ├── import.tsx      # Import screen
│   │   ├── lists.tsx       # Grocery lists
│   │   └── profile.tsx     # Profile/settings
│   ├── recipe/[id].tsx     # Recipe detail
│   ├── cook/[id].tsx       # Cook mode
│   └── onboarding/         # Onboarding flow
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── recipe/             # Recipe-specific components
│   ├── cook/               # Cook mode components
│   └── grocery/            # Grocery list components
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── api/                # API functions
│   ├── hooks/              # Custom hooks
│   └── utils/              # Utility functions
├── stores/                 # Zustand stores
├── types/                  # TypeScript types
└── constants/              # App constants
```

### 15.3 Contact

For questions about this specification, contact the development team.

---

_— End of Document —_
