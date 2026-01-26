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

### 4.1 Entity Relationship Overview

```
users ─────────< recipes ─────────< recipe_ingredients
   │                │
   │                └─────────< recipe_steps
   │                │
   │                └─────────< cook_sessions
   │                │
   │                └─────────< recipe_versions
   │
   └─────────< grocery_lists ───< grocery_items
   │
   └─────────< user_preferences
```

### 4.2 Table Definitions

#### 4.2.1 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free', -- free, pro_monthly, pro_annual
  subscription_expires_at TIMESTAMPTZ,
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
  wake_word_enabled BOOLEAN DEFAULT true,
  tts_speed DECIMAL DEFAULT 1.0,

  -- Cooking stats
  total_cooks INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### 4.2.3 recipes

```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL, -- cooking, mixology, pastry

  -- Source info
  source_platform TEXT, -- tiktok, instagram, youtube, web, manual
  source_url TEXT,
  source_creator TEXT,
  source_thumbnail_url TEXT,

  -- Timing
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,

  -- Serving
  servings INTEGER,
  servings_unit TEXT, -- servings, drinks, cookies, etc.

  -- Categorization
  category TEXT, -- main_dish, appetizer, dessert, cocktail, bread, etc.
  cuisine TEXT, -- italian, mexican, japanese, etc.
  tags JSONB DEFAULT '[]',

  -- Skill assessment
  original_skill_level TEXT, -- detected skill level of original recipe
  difficulty_score INTEGER, -- 1-10

  -- Extraction metadata
  extraction_confidence DECIMAL, -- 0.0 to 1.0
  extraction_method TEXT, -- api, scraper, manual
  raw_transcript TEXT,
  raw_caption TEXT,

  -- Organization
  is_favorite BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'saved', -- saved, planned, cooked
  planned_for DATE, -- when user plans to cook this
  variation_group_id UUID, -- groups recipe variations together
  parent_recipe_id UUID REFERENCES recipes(id), -- if this is a variation

  -- User notes
  user_notes TEXT,
  user_rating INTEGER, -- 1-5 stars
  times_cooked INTEGER DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_mode ON recipes(mode);
CREATE INDEX idx_recipes_source_url ON recipes(source_url);
CREATE INDEX idx_recipes_status ON recipes(status);
```

#### 4.2.4 recipe_ingredients

```sql
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,

  -- Ingredient details
  item TEXT NOT NULL, -- 'onion', 'bourbon', 'all-purpose flour'
  quantity DECIMAL,
  unit TEXT, -- 'cups', 'oz', 'g', 'to taste'
  preparation TEXT, -- 'diced', 'melted', 'room temperature'

  -- Original text from recipe
  original_text TEXT,

  -- Categorization for grocery list
  grocery_category TEXT, -- produce, dairy, meat, pantry, spices, bar, etc.

  -- Ordering
  sort_order INTEGER,

  -- Optional/substitution flags
  is_optional BOOLEAN DEFAULT false,
  substitution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
```

#### 4.2.5 recipe_steps

```sql
CREATE TABLE recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,

  -- Step content
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,

  -- Timing
  duration_minutes INTEGER, -- if step has a time
  timer_label TEXT, -- 'simmer', 'bake', 'rest'

  -- Temperature
  temperature_value INTEGER,
  temperature_unit TEXT, -- 'F', 'C'

  -- Equipment needed
  equipment JSONB DEFAULT '[]', -- ['skillet', 'whisk']

  -- Technique tags
  techniques JSONB DEFAULT '[]', -- ['sauté', 'deglaze']

  -- Skill-specific instructions (JSONB for versioning by skill level)
  skill_adaptations JSONB DEFAULT '{}',
  -- Example: { 'beginner': 'detailed version', 'chef': 'brief version' }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
```

#### 4.2.6 cook_sessions

```sql
CREATE TABLE cook_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,

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
  issues JSONB DEFAULT '[]', -- ['quantities_off', 'too_difficult']

  -- Voice usage analytics
  voice_commands_used INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.2.7 grocery_lists

```sql
CREATE TABLE grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- 'This Week', 'Party Prep', etc.

  -- Linked recipes
  recipe_ids JSONB DEFAULT '[]', -- UUIDs of included recipes

  -- Status
  is_active BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.2.8 grocery_items

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
  source_recipe_ids JSONB DEFAULT '[]', -- which recipes need this

  -- Shopping state
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,

  -- Manual additions
  is_manual BOOLEAN DEFAULT false,

  sort_order INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.2.9 extraction_logs

```sql
CREATE TABLE extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request info
  platform TEXT NOT NULL, -- tiktok, instagram, youtube, web
  source_url TEXT NOT NULL,

  -- Extraction details
  extraction_method TEXT, -- scrapecreators, rapidapi, apify, manual
  extraction_layer INTEGER, -- 1-5 (which fallback layer succeeded)
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Timing
  duration_ms INTEGER,

  -- Cost tracking
  cost_usd DECIMAL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For monitoring success rates
CREATE INDEX idx_extraction_logs_platform_created ON extraction_logs(platform, created_at);
```

#### 4.2.10 recipe_versions (Iteration Tracking)

```sql
CREATE TABLE recipe_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Version info
  version_number INTEGER NOT NULL,
  version_name TEXT, -- optional: 'Extra Crispy', 'Mom's Feedback'
  parent_version_id UUID REFERENCES recipe_versions(id), -- null for v1

  -- Snapshot of recipe at this version
  ingredients_snapshot JSONB NOT NULL, -- full ingredients array
  steps_snapshot JSONB NOT NULL, -- full steps array

  -- What changed from parent
  changes_summary TEXT, -- AI-generated or user summary
  ingredient_changes JSONB DEFAULT '[]',
  -- Example: [{'type': 'modified', 'item': 'salt', 'from': '1 tsp', 'to': '1.5 tsp'}]
  technique_changes JSONB DEFAULT '[]',
  -- Example: [{'step': 3, 'change': 'Increased sear time from 2min to 3min'}]
  equipment_changes JSONB DEFAULT '[]',

  -- Outcome
  outcome_rating INTEGER, -- 1-5 stars
  outcome_notes TEXT,
  what_worked TEXT,
  what_didnt_work TEXT,
  next_iteration_ideas TEXT,

  -- Media
  photos JSONB DEFAULT '[]', -- array of storage URLs

  -- Feedback from others
  taster_feedback JSONB DEFAULT '[]',
  -- Example: [{'name': 'Sarah', 'rating': 4, 'notes': 'Loved it, slightly too salty'}]

  -- Environment
  environment_notes JSONB DEFAULT '{}',
  -- Example: {'humidity': 'high', 'altitude': '5000ft', 'oven_variance': '+10F'}

  -- Scaling (for production tracking)
  batch_scale DECIMAL DEFAULT 1.0, -- 1x, 2x, 10x batch
  servings_produced INTEGER,

  -- Status flags
  is_current_best BOOLEAN DEFAULT false, -- user's favorite version
  is_archived BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  cooked_at TIMESTAMPTZ DEFAULT NOW() -- when this version was made
);

CREATE INDEX idx_recipe_versions_recipe_id ON recipe_versions(recipe_id);
CREATE INDEX idx_recipe_versions_user_id ON recipe_versions(user_id);
CREATE UNIQUE INDEX idx_recipe_versions_unique ON recipe_versions(recipe_id, version_number);
```

#### 4.2.11 version_insights (AI Analysis)

```sql
CREATE TABLE version_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,

  -- Insight content
  insight_type TEXT NOT NULL,
  -- Types: 'pattern', 'regression', 'optimization', 'suggestion'
  insight_text TEXT NOT NULL,
  confidence DECIMAL, -- 0.0 to 1.0

  -- Related versions
  related_version_ids JSONB DEFAULT '[]',

  -- User interaction
  is_dismissed BOOLEAN DEFAULT false,
  is_helpful BOOLEAN, -- user feedback

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_version_insights_recipe_id ON version_insights(recipe_id);
```

---

## 5. API Endpoints

All endpoints are Supabase Edge Functions. Authentication via Supabase Auth JWT.

### 5.1 Recipe Import

#### POST /functions/v1/import-recipe

Import a recipe from a video URL or web page.

**Request:**

```json
{
  "url": "https://www.tiktok.com/@creator/video/123...",
  "force_mode": null // optional: "cooking", "mixology", "pastry"
}
```

**Response:**

```json
{
  "success": true,
  "recipe_id": "uuid",
  "recipe": {
    "title": "Creamy Garlic Pasta",
    "mode": "cooking",
    "ingredients": [...],
    "steps": [...]
  },
  "extraction": {
    "method": "scrapecreators",
    "layer": 1,
    "confidence": 0.92
  }
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

#### POST /functions/v1/import-recipe-manual

Manual recipe entry when automatic extraction fails.

**Request:**

```json
{
  "url": "https://...", // original URL for reference
  "title": "Recipe Name",
  "creator": "Creator Name",
  "recipe_text": "Ingredients and instructions as text"
}
```

### 5.2 Recipe Management

#### GET /functions/v1/recipes

List user's recipes with filtering.

**Query Parameters:**

- `mode`: Filter by mode (cooking, mixology, pastry)
- `status`: Filter by status (saved, planned, cooked)
- `category`: Filter by category
- `search`: Full-text search
- `favorites`: Boolean, only favorites
- `limit`: Pagination limit (default 20)
- `offset`: Pagination offset

#### GET /functions/v1/recipes/:id

Get single recipe with full details.

#### PATCH /functions/v1/recipes/:id

Update recipe (title, notes, rating, status, etc.).

#### DELETE /functions/v1/recipes/:id

Delete recipe.

### 5.3 Cooking Session

#### POST /functions/v1/cook/start

Start a cooking session.

**Request:**

```json
{
  "recipe_id": "uuid",
  "skill_level": "home_cook", // override user default
  "scale_factor": 1.0
}
```

**Response:**

```json
{
  "session_id": "uuid",
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

#### POST /functions/v1/cook/chat

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
  "voice_response": "Shorter version for TTS"
}
```

#### POST /functions/v1/cook/voice-command

Handle voice command during cooking.

**Request:**

```json
{
  "session_id": "uuid",
  "audio_base64": "...", // or transcribed text
  "transcribed_text": "next step",
  "current_step": 2
}
```

**Response:**

```json
{
  "action": "advance_step",
  "new_step": 3,
  "voice_response": "Step 3: Heat the oil in a large skillet..."
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
  "issues": []
}
```

### 5.4 Grocery Lists

#### POST /functions/v1/grocery-lists

Create new grocery list from recipes.

**Request:**

```json
{
  "name": "Weekend Cooking",
  "recipe_ids": ["uuid1", "uuid2"]
}
```

#### GET /functions/v1/grocery-lists/:id

Get grocery list with consolidated items.

#### PATCH /functions/v1/grocery-lists/:id/items/:item_id

Check/uncheck grocery item.

#### POST /functions/v1/grocery-lists/:id/items

Add manual item to list.

### 5.5 Transcription

#### POST /functions/v1/transcribe

Transcribe audio using Whisper API.

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

### 5.6 Recipe Iteration Tracking

#### GET /functions/v1/recipes/:id/versions

Get all versions of a recipe with timeline data.

**Response:**

```json
{
  "recipe_id": "uuid",
  "total_versions": 7,
  "current_best_version": 5,
  "versions": [
    {
      "version_number": 1,
      "version_name": "Original Import",
      "cooked_at": "2025-01-05T18:00:00Z",
      "outcome_rating": 2,
      "changes_summary": null,
      "is_current_best": false
    },
    {
      "version_number": 2,
      "parent_version": 1,
      "cooked_at": "2025-01-12T19:30:00Z",
      "outcome_rating": 3,
      "changes_summary": "Added more garlic, reduced cook time",
      "is_current_best": false
    }
  ],
  "insights": [
    {
      "type": "pattern",
      "text": "Your best results (v5, v6) both used room-temp eggs"
    }
  ]
}
```

#### POST /functions/v1/recipes/:id/versions

Create a new version after cooking.

**Request:**

```json
{
  "parent_version_id": "uuid",
  "version_name": "Extra Crispy Attempt",
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

#### GET /functions/v1/recipes/:id/versions/compare

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

#### POST /functions/v1/recipes/:id/versions/:version_id/set-best

Mark a version as the current best.

#### POST /functions/v1/recipes/:id/analyze-iterations

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

### 8.1 Video Import Flow

```
User pastes URL
       │
       ▼
┌─────────────────────┐
│ Detect Platform     │ → TikTok / Instagram / YouTube / Web
└──────────┬──────────┘
           │
           ▼
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
│ Claude API: Recipe Extraction                   │
│ Input: transcript + caption + title             │
│ Output: Structured recipe JSON                  │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│ Detect Mode (cooking/mixology/pastry)           │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│ Save to Database                                │
│ - recipes table (status: 'saved')               │
│ - recipe_ingredients table                      │
│ - recipe_steps table                            │
│ - extraction_logs table                         │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
              Return recipe to client
```

### 8.2 Cook Session Flow

```
User taps 'Start Cooking'
       │
       ▼
┌─────────────────────┐
│ Create cook_session │
│ record in database  │
└──────────┬──────────┘
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
-- Users can only access their own data
CREATE POLICY "Users can view own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Apply similar policies to all user-specific tables
```

#### Edge Functions Structure

```
supabase/functions/
├── import-recipe/
│   └── index.ts
├── import-recipe-manual/
│   └── index.ts
├── cook-start/
│   └── index.ts
├── cook-chat/
│   └── index.ts
├── cook-voice-command/
│   └── index.ts
├── cook-complete/
│   └── index.ts
├── transcribe/
│   └── index.ts
├── grocery-consolidate/
│   └── index.ts
└── _shared/
    ├── extraction/
    │   ├── tiktok.ts
    │   ├── instagram.ts
    │   ├── youtube.ts
    │   └── web.ts
    ├── ai/
    │   ├── claude.ts
    │   └── prompts.ts
    └── utils/
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
