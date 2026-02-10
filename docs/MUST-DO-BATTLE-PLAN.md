# MUST-DO BATTLE PLAN - Shipyard $20K

**Deadline: Feb 12, 11:59 PM PST**
**Judge: Eitan Bernath (23yo, 2.3M TikTok, CEO of Eitan Productions)**
**Brief: "From saved recipe to dinner made"**

---

## PHASE 0: TESTFLIGHT + CRITICAL BLOCKERS (do first)

TestFlight External Testing review can take 24-48 hrs. This is the #1 deadline risk.
Kick it off NOW, fix code blockers while Apple reviews.

### 0A: Kick Off TestFlight External Testing (15 min, manual)

Do this BEFORE any code changes so Apple processes in parallel.

- [ ] Open App Store Connect -> TestFlight -> External Testing
- [ ] Create a new External Testing group (e.g., "Shipyard Judges")
- [ ] Add the latest build (Build 5) to this group
- [ ] Submit for Apple review (auto-triggered when adding to external group)
- [ ] While waiting: continue with 0B, 0C, all other phases
- [ ] Once approved (could be hours or next day), generate the PUBLIC LINK
- [ ] Save the public link for Devpost submission and share.ts update

**If Build 5 gets rejected or we need a newer build:** We'll rebuild after Phase 2 polish and resubmit. But getting the review queue started NOW is critical.

**HARD GATE:** Do NOT publish or share the TestFlight public link until the externally approved build includes ALL Phase 0B fixes. Build 5 has known blockers (import "Coming Soon", share placeholder). If Build 5 gets approved before Build 6 is ready, do NOT use it as the submission link. Wait for a clean build.

### 0B: Fix Code Blockers (15 min)

- [ ] **Fix "Coming Soon" dead end** (`app/(tabs)/import.tsx:609`)
  - Currently: `Alert.alert("Coming Soon", "Upgrade functionality coming soon!")`
  - Also says "Upgrade to Pro" instead of "Chef"
  - Fix: Route to `router.push("/paywall")` and change text to "Upgrade to Chef"
- [ ] **Fix share.ts to use deep links** (`lib/share.ts`)
  - Currently: store URL placeholder `id000000000` with no deep link
  - Fix: Make share payload use `chez://recipe/{id}` deep link as primary, store URL as fallback
  - Store URL update happens LATER when we have the TestFlight public link (Phase 0A)
  - The deep link is the important part for the "share -> open exact recipe" story
- [ ] **Apply community counter migration** to production Supabase
  - Paste only `20260209180000_add_challenge_completion_counts_rpc.sql` in SQL editor
  - Do NOT run `supabase db push` (too broad, could ship unrelated pending migrations)

### 0C: Legal URLs (10 min)

Paywall has placeholder `chez.app/terms` and `chez.app/privacy`. If a judge taps these, they 404. Removing them looks worse for a subscription app.

- [ ] Create minimal Terms of Service and Privacy Policy pages (GitHub Pages, Notion public page, or simple hosted HTML)
- [ ] Update URLs in `app/paywall.tsx` lines 33-34

---

## PHASE 1: EITAN'S RECIPES + CHALLENGE BRANDING (1 hr)

Replace the 3 challenge recipes with Eitan's actual recipes. His brief says devs can use recipes from eitanbernath.com during the hackathon.

**Target recipes (simple, viral, demo-friendly):**

| #   | Recipe                      | Source                                                                                        | Time    | Why                                                                               |
| --- | --------------------------- | --------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------- |
| 1   | **Tomato White Wine Pasta** | [TikTok](https://www.tiktok.com/@eitan/video/7400764325247454507) / eitanbernath.com          | ~20 min | His self-described "go-to easy weeknight dinner." 7 ingredients. Viral on TikTok. |
| 2   | **PB&J Pancakes**           | [The Kitchn](https://www.thekitchn.com/eitan-bernath-pbj-pancakes-recipe-23248691) / Cookbook | ~20 min | His stated FAVORITE recipe. Nostalgic, breakfast category.                        |
| 3   | **Sausage & Peppers**       | [eitanbernath.com](https://www.eitanbernath.com/2019/06/11/sausage-peppers/)                  | ~15 min | Only 4 ingredients. 15 min. Impossible to mess up.                                |

**Steps:**

- [ ] Import all 3 recipes into Chez via the app's import flow (paste URLs)
- [ ] If import fails for any, manually enter them via manual-entry screen
- [ ] Update `constants/challenge-config.ts`:
  - `recipeIds` -> new UUIDs
  - `creatorName` -> `"Eitan Bernath"`
  - `title` -> `"Eitan's Weekly Challenge"`
- [ ] Update challenge subtitle in `app/challenge.tsx` ("Cook all 3 of Eitan's recipes this week")
- [ ] Update home screen challenge card to reference Eitan by name
- [ ] Update `docs/devpost-project-story.md`:
  - Replace "garlic butter salmon" example with "tomato white wine pasta" (Eitan's actual recipe)
  - Keep the same narrative flow, just swap the recipe name
- [ ] Cook through at least 1 recipe fully to generate demo data (completion, photo, learnings)
- [ ] Verify challenge screen shows the 3 Eitan recipes correctly with community counter

---

## PHASE 2: UX/UI POLISH SPRINT (2 hrs)

Priority order. Only what shows in the demo video. No nice-to-haves.

### 2A: Color Consistency (MUST - 45 min)

The app has hardcoded colors that break the warm orange brand.

**Cook Mode (`app/cook/[id].tsx`):**

- [ ] Replace "Done" button green `#22c55e` with `colors.primaryDark` (#C2410C)
- [ ] Replace progress bar completion green `#22c55e` with `colors.primaryDark`
- [ ] Replace hardcoded `#FFEDD5`, `#FFF7ED` with `colors.primaryLight` or derived tokens
- [ ] Replace completed step card peach `#FFF7ED` background (StepCard.tsx) with theme token

**Chat Modal (`components/cook/ChatModal.tsx`):**

- [ ] Replace disabled send button `#E5E5E5` with theme color
- [ ] Improve recording vs transcribing visual distinction

**Home Screen (`app/(tabs)/index.tsx`):**

- [ ] Replace sample badge indigo `#6366F1` / `#E0E7FF` with orange brand colors

**Import Screen (`app/(tabs)/import.tsx`):**

- [ ] Replace hardcoded `#FFF7ED` in active option card with theme token

### 2B: Cook Mode + Completion (MUST - 30 min) ✅ Haptics done

This is the hero screen for the demo. It must feel premium.

- [x] Add haptic feedback on step completion (`Haptics.notificationAsync(Success)`) — already implemented
- [ ] **Completed step: opacity 0.5 instead of strikethrough** — strikethrough at 24px hurts readability; opacity is the modern cooking app pattern (SideChef, Whisk, Kitchen Stories all use opacity)
- [ ] **Haptics in CompletionModal** — star rating (`selectionAsync` per star boundary), tag toggle (`impactAsync Light`), submit (`notificationAsync Success`)
- [ ] **Photo proof area: 160px → full-width aspect-ratio 4:3** — current 160x160 is too small for the hero moment; use `width: "100%", aspectRatio: 4/3` with dashed border empty state
- [ ] **borderCurve: "continuous" on StepCard, MessageBubble, TimerOverlay pills** — match Card/Button consistency (Apple HIG)
- [ ] Verify completion modal looks good on demo device

### 2C: Chat Modal (MUST - 20 min) ✅ State labels done

Voice AI is a key differentiator. Must work smoothly for demo recording.

- [x] Add state labels: "Transcribing..." → "Thinking..." → "Speaking..." — implemented with icons
- [ ] **Welcome message from assistant on first open** — "I can help with this recipe — substitutions, techniques, timing, or anything else." + 2-3 contextual suggestion chips. Never drop users into a blank chat
- [ ] **Rate limit exhausted: upgrade card instead of 12px text** — when remaining === 0, show a proper card with icon + "Upgrade to Chef" button + message about daily limit
- [ ] Verify voice input → AI response → TTS loop works on device

### 2D: Paywall Verification (MUST - 15 min)

Monetization is 20% of judging.

- [ ] Verify paywall loads packages correctly from RevenueCat
- [ ] Verify annual savings badge is visible and clear
- [ ] Test sandbox purchase flow works on TestFlight build
- [x] Legal URLs point to real pages (from Phase 0C) — GitHub Pages live

### 2E: Nice-to-haves (IF TIME ALLOWS - skip if behind schedule)

- [ ] Confetti/celebration animation on cook completion (ZoomIn.springify() on checkmark)
- [ ] Confetti on "Challenge Complete" (all 3 recipes done)
- [ ] Spring animation on step completion checkbox (Reanimated `ZoomIn.springify().damping(15)`)
- [ ] Dark mode for cook mode (less glare in kitchen)

---

## PHASE 3: EITAN DEEP KNOWLEDGE (Reference - no code)

Know the judge. This informs demo script, story framing, and post-win outreach.

### Who He Is

- 23yo celebrity chef, CEO of Eitan Productions (NYC, staff of 7+)
- Started on Food Network's Chopped at age 12
- Principal Culinary Contributor on The Drew Barrymore Show (CBS)
- Published cookbook: "Eitan Eats the World" (Penguin Random House, 2022)
- UN World Food Programme High Level Supporter (youngest ever)
- ADL Distinguished Leadership Council Chair
- Columbia University student (GS '25)

### His Audience (Our Users)

- **Gen Z (15-27)** primary, younger Millennials secondary
- Discover recipes on TikTok/Instagram, save 50, cook 0
- Pain point: "Cooking as a burden" - his own words
- Pain point: Lost recipes buried in TikTok bookmarks, Instagram saves, screenshots
- Want easy, globally-inspired food without intimidation
- 350M+ people reached annually across all platforms

### His Content Style

- HIGH ENERGY, loud, fast-cut videos
- 80+ pieces of content/week across platforms
- Snapchat Discover is his PRIMARY revenue (3 shows, 29.2M unique viewers)
- TikTok: 2.3M followers, 69.3M likes
- Instagram: 766K+
- YouTube: longer-form, less frequent

### His Values (Match These in Our Story)

1. **Food accessibility** - "Get people excited about food and inspired to be in the kitchen"
2. **Fighting hunger** - UN WFP work
3. **Cultural education** through food - cookbook covers 7+ cuisines
4. **Jewish pride** - openly proud, uses platform for advocacy
5. **Fun over perfection** - cooking should feel like an "adrenaline rush"

### His Brand Aesthetic

- **Colors**: Navy #2a3752, Warm cream #fff5eb, Accent green #738f7d, Blue #59BACC
- **Style**: Bright, warm, saturated. Food is always the hero shot
- **Typography**: Modern sans-serif, bold headers
- **Vibe**: Contemporary food media, sophisticated but approachable

### Business Intelligence (For Post-Win Outreach)

- **No existing recipe app partnership** - wide open for a deal
- **Representation**: WME (talent), Range Media Partners (management)
- **Contact**: teameitanbernath@rangemp.com
- **Revenue streams**: Snapchat shows, brand deals (Walmart, DoorDash, KitchenAid), TV, cookbook, speaking
- **His audience has no centralized recipe solution** - massive market gap we fill
- **Recipe app market**: $6.41B (2025), growing 10.5% CAGR to $14.27B by 2033

---

## PHASE 4: BUILD & DEPLOY (45 min)

- [ ] Run full audit: `pnpm typecheck && pnpm lint && pnpm test`
- [ ] Build with EAS: `eas build --platform ios --profile production`
  - `autoIncrement: true` in eas.json handles buildNumber automatically, no manual bump needed
- [ ] Submit to TestFlight: `eas submit --platform ios`
- [ ] Wait for Apple processing (~15-30 min)
- [ ] If External Testing from Phase 0A was approved with Build 5, add new build to group too
- [ ] If External Testing was NOT yet approved, add this build to the external group (replaces Build 5)
- [ ] Update `lib/share.ts` store URL with TestFlight public link (once available)

### 4B: Android Backup Build (30 min, do in parallel with iOS processing)

Emergency fallback if TestFlight External Testing gets stuck. Google Play Internal Testing has **zero review wait**.

- [ ] Build Android: `eas build --platform android --profile production`
- [ ] Create Google Play Internal Testing track (Play Console → Testing → Internal testing)
- [ ] Upload AAB to internal testing track
- [ ] Generate internal testing link (available immediately, no review)
- [ ] Quick smoke test on Android emulator or device: onboarding, import, cook mode, paywall
- [ ] If iOS TestFlight is approved on time, Android link is a bonus "Also available on Android" for Devpost
- [ ] If iOS TestFlight is NOT approved by submission deadline, use Android internal testing link as the "Try it out" link

**Risk**: We haven't tested Android at all. Possible UI issues. Do NOT demo Android in the video — keep iOS as primary. This is purely a distribution backup.

---

## PHASE 5: E2E REHEARSAL (30 min)

Walk through the entire app as a first-time user before recording.

- [ ] Cold open the app (fresh state or second test account)
- [ ] Complete onboarding flow (welcome slides, mode select)
- [ ] Import one of Eitan's recipe URLs
- [ ] View recipe detail, add to grocery list
- [ ] Enter cook mode, walk through steps
- [ ] Open chat, ask a voice question, get voice answer
- [ ] Complete the cook, take photo, see learnings
- [ ] Share the completed cook
- [ ] Open challenge screen, see Eitan's recipes + community counter
- [ ] Hit import rate limit, tap "Upgrade to Chef", verify paywall opens
- [ ] **Test deep link share loop**: share a recipe, tap the shared `chez://recipe/{id}` link on a second device/account, confirm it opens the correct recipe
- [ ] **Note any bugs or visual issues** -> quick-fix before recording
- [ ] **Capture 5 screenshots** during rehearsal for Devpost:
  1. Recipe import (Eitan's TikTok link being pasted)
  2. Cook mode with step card
  3. Chat modal with voice AI
  4. Completion modal with photo
  5. Eitan's Weekly Challenge screen

---

## PHASE 6: DEMO VIDEO (2-3 hrs, most important artifact)

**This is how we win or lose.** Judges may never install the app.

### Script Structure (2-3 min)

1. **Hook (10 sec)**: "You saved Eitan's tomato pasta on TikTok. Now what? It dies in your bookmarks. Chez fixes that."
2. **The Flow (90 sec)**: Live demo on real device
   - Paste Eitan's TikTok link -> extraction -> recipe appears
   - Show grocery list generation
   - Enter cook mode -> walk through 2-3 steps
   - Ask AI a question via voice ("Can I use white wine vinegar instead?")
   - AI responds via voice
   - Complete the dish, take photo
   - Show learning detection ("Chez remembered you prefer less salt")
3. **Challenge (20 sec)**: Show Eitan's Weekly Challenge with community completion counter
4. **Monetization (15 sec)**: Show paywall, explain freemium model
5. **Vision (15 sec)**: "Today: the cook. Tomorrow: creator dashboards showing which recipes get cooked, not just saved."

### Production Tips (from Devpost/RevenueCat)

- Record on real device with screen mirroring (QuickTime/OBS)
- Script it, but don't sound scripted
- Start recording well before deadline (leave 2-3 hrs buffer)
- Upload to YouTube early (processing takes time)
- Do NOT use ChatGPT for the voiceover script - judges can tell
- Show the app from the user's perspective, not the developer's
- Keep it under 3 minutes

### Demo Data Prep

- [ ] Have at least 3 Eitan recipes imported
- [ ] Have 1 recipe with existing cook session + photo + learning
- [ ] Have the challenge screen showing real completion data
- [ ] Have a clean user state for the "first time" import demo portion (second account or cleared data)

---

## PHASE 7: DEVPOST SUBMISSION (2 hrs)

### Required Artifacts

- [ ] **Demo video** (YouTube link, 2-3 min)
- [ ] **Public TestFlight link** (from Phase 0A/4)
- [ ] **Project story** (`docs/devpost-project-story.md` - already written, updated in Phase 1)
- [ ] **Screenshots** (5, captured during Phase 5 rehearsal)

### Written Proposal (1-2 pages)

Structure it around the judging criteria weights:

1. **Problem Statement** (Audience Fit - 30%)
   - Eitan's audience saves 50 recipes, cooks 0. The gap between inspiration and action is the problem.
   - Use his language: "For a lot of people, cooking can be a burden."
2. **Solution Overview** (UX - 25%)
   - Paste link -> AI extracts -> cook step-by-step with voice AI -> learn -> share
   - Hands-free, memory-powered, version-aware
3. **Monetization Strategy** (Monetization - 20%)
   - Freemium with RevenueCat: Free (20 AI msgs/day) vs Chef ($9.99/mo, 500 msgs/day)
   - Natural upgrade path: challenge weeks drive usage -> free users hit limits -> upgrade
   - Creator challenges as engagement + paywall driver
4. **Roadmap** (Innovation - 15%)
   - Creator dashboards (conversion rates, completion stats)
   - Expand to cocktails, pastry
   - Professional tier for kitchen teams
   - Deep-link attribution for creator distribution

### Technical Documentation

- Architecture diagram (Expo + Supabase + RevenueCat + AI pipeline)
- RevenueCat integration: entitlements, webhook, client-side sync, rate limiting
- AI pipeline: multi-model routing (Gemini Flash 70%, GPT-4o Mini 25%, Claude 5%), voice I/O (Whisper + TTS)
- Data: Supabase Postgres + RLS, Edge Functions (Deno), Storage for cook photos

### Developer Bio

- Background as engineer, personal cooking story
- What motivated building Chez (the Google Drive/duct tape workflow)
- Link to portfolio/GitHub

### Submission Checklist

- [ ] Verify "Try it out" section has public TestFlight link
- [ ] Verify video is embedded and plays
- [ ] Verify all required fields are filled
- [ ] Select Eitan Bernath's brief
- [ ] Upload 5 screenshots
- [ ] Double-check everything before hitting Submit

---

## TIMELINE (revised for TestFlight risk)

| When         | What                                                       | Duration  |
| ------------ | ---------------------------------------------------------- | --------- |
| **NOW**      | Phase 0A: Submit Build 5 for External Testing              | 15 min    |
| **+15 min**  | Phase 0B+0C: Code blockers + legal URLs                    | 25 min    |
| **+40 min**  | Phase 1: Import Eitan's recipes + challenge branding       | 1 hr      |
| **+1.5 hrs** | Phase 2: UX/UI polish sprint                               | 2 hrs     |
| **+3.5 hrs** | Phase 4: Build 6 iOS + deploy to TestFlight                | 45 min    |
| **+3.5 hrs** | Phase 4B: Android backup build (parallel with iOS)         | 30 min    |
| **+4.5 hrs** | Phase 5: E2E rehearsal + screenshots                       | 30 min    |
| **+5 hrs**   | Phase 6: Record demo video                                 | 2-3 hrs   |
| **+8 hrs**   | Phase 7: Write docs + Devpost submission                   | 2 hrs     |
| **Ongoing**  | Phase 0A: Check External Testing approval, get public link | async     |
| **Phase 3**  | Reference material, no code needed                         | as needed |

**Total: ~9-10 hrs of focused work**
**Buffer: 3 days until deadline (Feb 12)**
**Critical path: External Testing approval (24-48 hrs) must be kicked off TODAY**

---

## WIN CONDITION

We win if Eitan watches our 2-3 min demo video and thinks:

> "This is the app my audience needs. They save my recipes on TikTok and never cook them.
> This app fixes that. It uses MY actual recipes. The AI cooking assistant is novel.
> The voice interaction is hands-free. The learning memory is sticky.
> And the community challenge counter shows me real engagement.
> This could be a real business."

That's the bar. Everything in this plan points toward making that happen.
