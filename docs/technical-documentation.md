# Chez: Technical Documentation

## 1. Architecture Overview

Chez is a native iOS app built with React Native (Expo SDK 54) and TypeScript. The backend runs entirely on Supabase: Postgres for data, Edge Functions (Deno/TypeScript) for server logic, and Row-Level Security for access control. Monetization is handled through RevenueCat with server-side webhook verification.

| Layer         | Technology                                       |
| ------------- | ------------------------------------------------ |
| Mobile app    | Expo + React Native, TypeScript                  |
| State         | React local state + React Query (server)         |
| Database      | Supabase Postgres with Row-Level Security        |
| Backend       | Supabase Edge Functions (Deno)                   |
| AI models     | Claude, GPT-4o Mini, Gemini Flash via OpenRouter |
| Embeddings    | OpenAI text-embedding-3-small (1536 dimensions)  |
| Vector search | pgvector with cosine similarity                  |
| Voice         | OpenAI Whisper (STT) + TTS                       |
| Subscriptions | RevenueCat SDK + webhook                         |
| Analytics     | Custom event tracking via Edge Function          |

## 2. Edge Functions

8 core production Edge Functions power the main user flow:

**import-recipe:** Extracts structured recipes from video URLs. Fetches transcripts via Supadata API (primary) with free fallback layers for YouTube (InnerTube API) and TikTok (oEmbed + page scraping). Runs transcript through Claude Sonnet 4 with a detailed extraction prompt that includes 60+ phonetic error corrections for speech-to-text artifacts. Includes server-side nonsense detection (vowel ratio, repeated characters) to reject garbage input before spending an API call. The manual entry flow adds a client-side check as well. Returns structured JSON with ingredients, steps, timing, and a confidence score. Rejects extractions below 0.3 confidence.

**cook-chat-v2:** The real-time cooking assistant. Uses a 3-tier smart model routing system to minimize cost while maintaining quality:

- Tier 1 (Gemini Flash, ~70% of traffic): Simple questions, timing, temperature, preferences. $0.30/$2.50 per 1M tokens.
- Tier 2 (GPT-4o Mini, ~25%): Substitutions, technique, scaling. $0.15/$0.60 per 1M tokens.
- Tier 3 (Claude Sonnet 4, ~5%): Complex troubleshooting only. $3/$15 per 1M tokens.

Intent classification is done locally via regex pattern matching (no API call, zero cost). 12 intent types with confidence scores. If confidence is below 0.7, the query escalates to GPT-4o Mini regardless of intent. If OpenRouter fails, the function falls back to direct Claude via the Anthropic SDK.

Result: 97% cost reduction vs Claude-only ($0.00066/msg average vs $0.02/msg).

**embed-memory:** Generates OpenAI text-embedding-3-small embeddings for user cooking memories. Called after memory creation to enable semantic retrieval.

**whisper:** Speech-to-text transcription via OpenAI Whisper-1. Accepts base64-encoded m4a audio, returns transcribed text.

**confirm-source-link:** Handles user decisions on the similar-recipe confirmation modal. Three actions: link video to existing recipe, create new recipe, or reject.

**create-my-version:** Creates "My Version" (v2) from cook session learnings. Starts from the original (v1), applies detected substitutions, timing changes, and additions, then upserts as v2. Always replaces existing v2 rather than creating v3, v4, etc.

**revenuecat-webhook:** Processes subscription lifecycle events from RevenueCat. Handles initial purchase, renewal, cancellation, expiration, billing issues, and product changes. Syncs tier to both user_rate_limits and users tables.

**track-event:** Logs analytics events to the database. Fails silently so analytics never breaks the app.

## 3. RAG and Memory System (pgvector)

The memory system uses pgvector for semantic search across user cooking history.

**Storage:**

- `user_cooking_memory` table stores per-user memories with 1536-dimensional embeddings
- Each memory has: content (text), memory_type (preference/cooking_note), label (substitution_used, technique_learned, preference_expressed, etc.), metadata (recipe title, learning type, step number), and the embedding vector

**Creation (Chef-only):**

- During cook-chat-v2, the system detects meaningful preferences via two methods:
  1. Direct intent-based: If the user's message is classified as a preference_statement or modification_report with confidence >= 0.8, the learning is auto-saved
  2. AI-suggested: The AI can return a structured learning block in its response, parsed via regex, with default confidence 0.75 (requires user confirmation)
- Each saved memory gets an embedding generated via OpenAI text-embedding-3-small
- Memories are also appended to the cook session's detected_learnings JSONB array for the completion summary

**Retrieval (all tiers):**

- On every cook-chat message, the user's question is embedded
- `match_user_memory` RPC searches user_cooking_memory using cosine similarity (threshold: 0.5, top 3 results)
- `match_recipe_knowledge` RPC searches the global knowledge base (threshold: 0.7, top 3 results) for relevant intents only
- Retrieved context is injected into the AI's system prompt before generating a response

This means free users benefit from memory created during Chef sessions, creating an incentive to subscribe (the AI gets smarter) without degrading the free experience.

## 4. RevenueCat Implementation

**SDK Setup:**

- Initialized in the root layout (`_layout.tsx`) on app mount
- User identified via `Purchases.logIn(supabaseUserId)` after authentication
- Real-time listener (`addCustomerInfoUpdateListener`) monitors subscription changes

**Entitlement:**

- Single entitlement: `"chef"`
- Checked via `customerInfo.entitlements.active["chef"]`
- Products: `chef_monthly` ($9.99/month), `chef_annual` (annual pricing from RevenueCat dashboard)

**Client-side hook (`useSubscription`):**

- Returns: tier, isChef, expirationDate, willRenew, productId, isLoading
- Lightweight variant: `useIsChef()` for simple boolean checks
- Updates in real-time when subscription status changes

**Paywall triggers:**

- After last free AI message (4.5s delay post-response in ChatModal)
- Import limit reached (3/month for free tier)
- Manual upgrade button on profile screen

**Purchase flow:**

- `PaywallContent` component fetches offerings, pre-selects annual package
- `purchasePackage()` handles the App Store transaction
- On success: tracks `subscription_started` event, calls `refresh()` to sync

**Server-side verification:**

- RevenueCat webhook sends events to `revenuecat-webhook` Edge Function
- Webhook verifies authorization secret
- Events processed: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE, NON_RENEWING_PURCHASE
- Updates `user_rate_limits.tier` and `users.subscription_tier` in Supabase
- Security: Client-side sync can only downgrade to "free". Upgrades to "chef" must come through the webhook (service_role bypass). This prevents client-side tier spoofing.

**Rate limiting:**

- Enforced via `check_rate_limit` Postgres function with atomic row-level locking
- Free: 20 messages/day, Chef: 500 messages/day
- Counter resets at midnight UTC
- Single atomic UPDATE prevents race conditions (no SELECT-then-UPDATE)

## 5. Database Schema (Key Tables)

| Table                             | Purpose                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `users`                           | Core user record with subscription_tier, imports_this_month, imports_reset_at                                        |
| `master_recipes`                  | User's recipe collection with title, mode, current_version_id, times_cooked                                          |
| `master_recipe_versions`          | Immutable version snapshots with ingredients (JSONB), steps (JSONB), times, servings. v1 = original, v2 = My Version |
| `video_sources`                   | Global transcript cache keyed by normalized URL. Reused across users                                                 |
| `recipe_source_links`             | Maps user + video to master recipe. Stores extracted data for deferred creation                                      |
| `cook_sessions`                   | Active cooking state with current_step, completed_steps, detected_learnings (JSONB), version_id                      |
| `cook_session_messages`           | Chat history with role, content, step context                                                                        |
| `user_cooking_memory`             | RAG memories with embedding vector(1536), labels, and metadata                                                       |
| `recipe_knowledge`                | Global cooking knowledge base with embeddings for technique, substitution, and tip retrieval                         |
| `user_rate_limits`                | Atomic rate limiting with tier, daily count, and reset date                                                          |
| `grocery_lists` / `grocery_items` | Per-user shopping lists with items categorized by aisle                                                              |
| `ai_cost_logs`                    | Per-message cost tracking with model, provider, tokens, cost, and latency                                            |

All tables use Row-Level Security. User data is scoped per-user, with explicit exceptions for shared read access (e.g., `recipe_knowledge` global knowledge base, challenge community completion counts). Service-role access is reserved for Edge Functions and webhook processing.

## 6. Cost Optimization

AI cost per message averages $0.00066 through smart model routing:

- 70% of queries handled by Gemini Flash ($0.30/$2.50 per 1M tokens)
- 25% by GPT-4o Mini ($0.15/$0.60 per 1M tokens)
- 5% by Claude Sonnet 4 ($3/$15 per 1M tokens)

Intent classification is free (local regex, no API call).
Token budgeting caps input at 3,000 tokens with smart context truncation.
Every message's cost is logged to `ai_cost_logs` for monitoring.

## 7. App Structure

Expo Router file-based navigation:

| Route             | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `(auth)/`         | Login/signup with OTP                        |
| `(onboarding)/`   | Welcome slides + cooking mode selection      |
| `(tabs)/`         | Home, Recipes, Add, Grocery, Profile         |
| `cook/[id].tsx`   | Full-screen cook mode with step cards + chat |
| `recipe/[id].tsx` | Recipe detail with version toggle            |
| `challenge.tsx`   | Weekly challenge screen                      |
| `paywall.tsx`     | Subscription upgrade screen                  |

**Key libraries:**

- `react-native-purchases` (RevenueCat SDK v9.7.6)
- `@supabase/supabase-js` (database + auth)
- `@tanstack/react-query` (server state + caching)
- `react-native-reanimated` (animations)
- `expo-router` (navigation)
