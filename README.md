# Chez - Cooking Assistant

A mobile app that imports recipes from TikTok, YouTube, and Instagram videos, then guides you through cooking with an AI assistant.

## Features

- **Video Recipe Import** - Paste a TikTok, YouTube, or Instagram URL to extract recipes using AI
- **Cooking Assistant** - Ask questions while cooking, get substitutions, troubleshoot issues
- **Voice Interaction** - Speech-to-text input and text-to-speech responses
- **RAG-Powered Answers** - Responses enhanced with cooking knowledge base and your personal cooking history
- **Step Timers** - Set multiple concurrent timers with voice alerts
- **Session Memory** - Your cooking sessions are saved and inform future AI responses

## Tech Stack

- **Frontend**: React Native / Expo SDK 54
- **Backend**: Supabase (Postgres, Auth, Edge Functions)
- **AI**: Claude (chat), OpenAI (embeddings, TTS, Whisper STT)
- **State**: Zustand + React Query

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
supabase functions deploy cook-chat
supabase functions deploy text-to-speech
supabase functions deploy whisper
supabase functions deploy embed-memory
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

| Function         | Purpose                               |
| ---------------- | ------------------------------------- |
| `import-recipe`  | Extract recipes from video URLs       |
| `cook-chat`      | Cooking Assistant with RAG            |
| `text-to-speech` | OpenAI TTS for voice responses        |
| `whisper`        | Speech-to-text transcription          |
| `embed-memory`   | Generate embeddings for user memories |

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
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

## License

Private - All rights reserved
