# Chez - AI Cooking Assistant

> RevenueCat Shipyard 2026

A mobile app that imports recipes from social media (TikTok, Instagram, YouTube), then guides you through cooking with an AI assistant that learns your preferences and adapts recipes to your style.

## Submission Docs

- [Technical Documentation](https://docs.google.com/document/d/1rYGwRbny24ghWaMDZVayLPy0Ix9nuS30/edit?usp=sharing&ouid=111553881592209474763&rtpof=true&sd=true)
- [Written Proposal](https://docs.google.com/document/d/1C7iqol6LBCkGQ4tr486wdVTJXbRkidw2/edit?usp=sharing&ouid=111553881592209474763&rtpof=true&sd=true)

## Features

**Recipe Management**

- Import recipes from TikTok, Instagram, YouTube using AI extraction
- Multi-source support (websites, manual entry, social platforms)
- "My Version" - save personalized recipe adaptations

**AI Cooking Assistant**

- Real-time help while cooking (substitutions, troubleshooting, techniques)
- Fully hands-free voice interaction
- RAG-powered responses using cooking knowledge base + user history
- Intent-based routing to optimal AI model

**Cooking Experience**

- Step-by-step voice-guided navigation
- Multiple concurrent timers with voice alerts
- Automatic learning detection (captures your preferences)
- Session memory that improves over time

**Modes**

- Casual Cook - simple cooking with AI help
- Chef Mode - full power with version history, learnings, analytics (subscription)

## AI Architecture

Smart model routing automatically selects the optimal AI based on query complexity:

| Model            | Use Cases                                | Cost                       | Traffic |
| ---------------- | ---------------------------------------- | -------------------------- | ------- |
| Gemini Flash 1.5 | Simple questions, timing, preferences    | $0.10/$0.30 per 1M tokens  | ~70%    |
| GPT-4o Mini      | Substitutions, techniques, scaling       | $0.15/$0.60 per 1M tokens  | ~25%    |
| Claude Sonnet 4  | Complex troubleshooting, multi-step help | $3.00/$15.00 per 1M tokens | ~5%     |

**Result**: 97% cost reduction vs Claude-only ($0.00066/msg vs $0.02/msg)

**Architecture Components**:

- OpenRouter gateway with automatic fallback to direct Claude
- RAG system: recipe knowledge base + user memory
- OpenAI embeddings with vector similarity search

See [docs/ai-optimization-results.md](docs/ai-optimization-results.md) for performance data.

## Tech Stack

- **Frontend**: React Native / Expo SDK 54
- **Backend**: Supabase (Postgres, Auth, Edge Functions, Realtime)
- **AI Models**: Claude Sonnet 4, GPT-4o Mini, Gemini Flash 1.5 (via OpenRouter)
- **Voice**: OpenAI TTS HD + Whisper API
- **Subscriptions**: RevenueCat
- **State**: Zustand + React Query
- **Scraping**: Supadata.ai (social media recipe extraction)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Expo CLI
- Supabase project

### Installation

```bash
# Clone the repo
git clone https://github.com/mateodaza/chez.git
cd chez

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Environment Variables

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Edge Functions require additional secrets (set via Supabase dashboard):

- `ANTHROPIC_API_KEY` - Claude API
- `OPENAI_API_KEY` - Embeddings, TTS, Whisper
- `SUPADATA_API_KEY` - Video transcript extraction

### Development

```bash
# Start Expo dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android
```

### Database Setup

Migrations are in `supabase/migrations/`. Apply them to your Supabase project:

```bash
supabase db push
```

### Deploy Edge Functions

```bash
supabase functions deploy import-recipe
supabase functions deploy cook-chat-v2
supabase functions deploy text-to-speech
supabase functions deploy whisper
supabase functions deploy embed-memory
```

**Environment Secrets** (set via Supabase dashboard):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
supabase secrets set SUPADATA_API_KEY=...
```

## Project Structure

```
chez/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Login/signup
│   ├── (tabs)/            # Main tab navigation
│   ├── cook/[id].tsx      # Cook mode screen
│   └── recipe/[id].tsx    # Recipe detail
├── components/            # Reusable components
├── lib/                   # Utilities
│   ├── supabase/         # Supabase client
│   ├── extraction/       # Platform detection
│   └── auth/             # Auth helpers
├── hooks/                 # Custom React hooks
├── stores/                # Zustand stores
├── types/                 # TypeScript types
└── supabase/
    ├── migrations/        # Database migrations
    ├── functions/         # Edge Functions
    └── seed/              # Seeding scripts
```

## Edge Functions

| Function         | Purpose                                       | AI Model(s)                          |
| ---------------- | --------------------------------------------- | ------------------------------------ |
| `cook-chat-v2`   | Cooking Assistant with smart AI routing & RAG | Gemini/GPT-4o-mini/Claude            |
| `import-recipe`  | Extract recipes from video URLs               | GPT-4 Turbo (→ Gemini Flash pending) |
| `text-to-speech` | OpenAI TTS HD for voice responses             | OpenAI TTS                           |
| `whisper`        | Speech-to-text transcription                  | OpenAI Whisper                       |
| `embed-memory`   | Generate embeddings for user memories         | OpenAI text-embedding-3-small        |

## Scripts

```bash
pnpm start          # Start Expo dev server
pnpm lint           # Run ESLint
pnpm lint:fix       # Fix ESLint issues
pnpm format         # Format with Prettier
pnpm typecheck      # TypeScript check
pnpm validate       # Run all checks
```

## Building for Production

```bash
# Build for iOS TestFlight
pnpm build:ios:local
```
