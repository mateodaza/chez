# Shipyard Lean Execution Plan (Flawless Loop)

## Objective

Ship one undeniable demo loop:

`Saved recipe -> Cooked meal -> Photo proof -> Shared link -> Seen in history`

This plan intentionally cuts complexity to maximize delivery confidence.

## Locked Decisions

1. Challenge week boundary is fixed to UTC Monday 00:00:00 through Sunday 23:59:59.

- Query window:
- `completed_at >= date_trunc('week', now() AT TIME ZONE 'UTC')`
- `completed_at < date_trunc('week', now() AT TIME ZONE 'UTC') + interval '7 days'`

2. `cook-photos` storage stays private with strict user-folder RLS.

- Upload/read path pattern:
- `{user_id}/{session_id}/{timestamp}.jpg`
- Required storage policy condition:
- `(storage.foldername(name))[1] = auth.uid()::text`

3. Incoming deep links must parse and use both `versionId` and `source` on `app/recipe/[id].tsx`.

- Required param shape:
- `useLocalSearchParams<{ id: string; edit?: string; versionId?: string | string[]; source?: string }>()`
- Normalize `versionId` (array vs string), auto-select matching version, and track `source=share`.

4. The 3 Creator Challenge recipes must be created during implementation and persisted in Supabase (no local-only mocks).

- Create/import 3 real recipes in the demo account while building.
- Save their real `master_recipes.id` values in `constants/challenge-config.ts`.
- Challenge screen must query completion against those persisted Supabase IDs.

## What Already Exists (Do Not Rebuild)

- Completion flow already exists in `app/cook/[id].tsx`:
- clear end-of-cook modal
- `is_complete` and `completed_at` persistence
- `Analytics.cookCompleted(...)`
- Step tracking is already strong:
- manual step toggles
- persistence across reloads
- progress UI

No new passive step-signal system in v1.

## Scope

### In Scope

- Smart share flow (deep link + app download fallback text).
- Photo upload after completion ("Share your cook").
- Completed Meals section inside Profile (completed sessions only).
- Creator Challenge view with 3 recipe cards and completion counter (no gamification engine).
- Plan attribution fields on `cook_sessions` for KPI queries.

### Out of Scope

- Co-cook/social collaboration.
- New challenge tab.
- Points, badges, streak engine, leaderboard.
- Universal/app-link server infrastructure.
- Passive step confidence engine.

## Feature 1: Smart Share (High ROI)

### UX

- Add `Share` button on recipe detail and completion success states.
- Use native `Share.share`.
- Message includes:
- app deep link using custom scheme
- optional context (recipe title, version, completion note)
- app store fallback text

### Link Format (Demo-Safe)

- `chez://recipe/{id}?versionId={versionId}&source=share`
- Fallback text:
- `Get Chez on iOS: [URL]`
- `Get Chez on Android: [URL]`

### Implementation

- Add `lib/share.ts`:
- `buildRecipeSharePayload(...)`
- `shareRecipe(...)`
- `shareCompletedCook(...)`
- Add share entry points in:
- `app/recipe/[id].tsx`
- `app/cook/[id].tsx` (post-completion)

### Acceptance Criteria

- Share works on iOS and Android.
- Installed app opens recipe via `chez://` deep link.
- Non-installed users still get store links in shared text.

## Feature 2: Share Your Cook (Photo Proof)

### UX

- After completion, show action sheet:
- `Add Photo`
- `Share Result`
- `Done`
- If photo upload succeeds, share payload can mention photo proof.
- If upload fails, completion still succeeds and share still works.

### Dependencies

- Add `expo-image-picker`.

### Storage + Data

- Supabase bucket: `cook-photos` (private).
- New table: `cook_session_photos`
- `id uuid pk`
- `session_id uuid fk -> cook_sessions`
- `user_id uuid fk -> users`
- `storage_path text not null`
- `created_at timestamptz default now()`

### Security

- RLS: users can insert/select only their own photo rows.
- Storage path prefix: `{user_id}/{session_id}/...`.
- Serve via signed URLs (no public bucket URLs in v1).
- Storage policy must enforce user folder ownership, e.g.:
- `(storage.foldername(name))[1] = auth.uid()::text`

### Acceptance Criteria

- User can pick and upload a photo after cook completion.
- Upload links to the correct session.
- Upload failure never blocks completion.

## Feature 3: Completed Meals in Profile

### UX

- Add `Completed Meals` section in `app/(tabs)/profile.tsx`.
- Show a simple gallery/list of completed meals:
- photo (if available) or placeholder
- recipe title
- completion date

### Data Rules

- Only include:
- `cook_sessions.is_complete = true`
- `cook_sessions.completed_at IS NOT NULL`
- Left join `cook_session_photos` so no-photo sessions still appear.

### Implementation

- Add query helper in `lib/supabase/queries.ts`.
- Reuse existing Profile screen to avoid new tab/nav complexity.

### Acceptance Criteria

- Incomplete sessions never appear.
- Newly completed meals appear after refresh.
- Empty state is clear (`Complete a cook to see your history`).

## Feature 4: Creator Challenge (No Gamification Engine)

### UX

- Add a prominent entry card on Home that navigates to a dedicated challenge view.
- Add dedicated screen (for example `app/challenge.tsx` or `app/(tabs)/challenge.tsx`).
- Header format for demo/business clarity:
- `Chef [Name]'s Weekly Challenge`
- Show exactly 3 recipe cards with completion checkmarks.
- Show a simple counter:
- `Cooked X/3 recipes this week`

### Implementation (Lean)

- No new challenge tables in v1.
- Derive completion count from existing completed sessions for 3 selected recipe IDs.
- Create/import the 3 challenge recipes during implementation and persist them in Supabase.
- Store those persisted IDs in `constants/challenge-config.ts` for deterministic demo behavior.
- Keep influencer/creator name configurable in app config for demo switching.

### Acceptance Criteria

- Home card clearly surfaces Creator Challenge.
- Dedicated challenge screen renders 3 recipes with completion states.
- Completion counter updates when user completes one of the challenge recipes.

## Feature 5: Plan Attribution for KPI Queries

### Why

Need queryable proof for loop metrics; route params are not enough.

### Migration

Add columns to `cook_sessions`:

- `started_from_plan boolean default false`
- `planned_at timestamptz`
- `planned_target_time timestamptz`
- `planned_servings integer`

### Acceptance Criteria

- Sessions started from planner/cook CTA can be attributed in SQL queries.
- KPI queries can segment plan-started vs non-plan-started sessions.

## Analytics Events (Must Keep)

- `smart_share_sent`
- `cook_photo_uploaded`
- `completed_meals_viewed`
- `creator_challenge_viewed`
- `creator_challenge_recipe_completed`
- `meal_plan_started` (if planner entry used)

## Execution Order (Front-Load Demo Impact)

### Phase 0 (0.5 day): Foundations

- Add analytics event constants + tracking calls.
- Add `lib/share.ts`.
- Add `cook_sessions` attribution migration.

### Phase 1 (0.5 day): Smart Share

- Implement share entry points.
- Validate deep links and fallback messaging.

### Phase 2 (1 day): Photo Proof

- Add dependency, picker flow, upload, signed URL path.
- Add `cook_session_photos` table + RLS/storage policy.

### Phase 3 (0.5 day): Completed Meals in Profile

- Add query + profile section.
- Validate completed-only filtering.

### Phase 4 (0.5 day): Creator Challenge View

- Add home entry card and dedicated challenge screen.
- Add completion counter and recipe checkmarks.
- No badges/points/streaks/leaderboard.

### Phase 5 (0.5 day): Hardening + Demo

- Run `pnpm -s typecheck`
- Run `pnpm -s lint`
- Run `pnpm -s test --runInBand`
- Final demo rehearsal.

## Cut Line (If Time Slips)

1. Keep: Smart Share + Photo Proof + Completed Meals + attribution migration.
2. Cut first: Creator Challenge visual polish (keep core screen + counter).
3. Cut second: planner entry UX extras.
4. Never cut: share flow and completion/photo history proof.

## Demo Script (3 Minutes)

1. Open Creator Challenge (`Chef [Name]'s Weekly Challenge`) and show `Cooked X/3`.
2. Open one challenge recipe from that screen.
3. Start cooking and complete it (existing completion UX).
4. Add photo proof.
5. Return to challenge and show counter increment/checkmark.
6. Open Profile and show Completed Meals history updated.
7. Share result via message (deep link + app fallback text).
8. Open `/(admin)/dashboard` and show a concrete loop conversion card:

- `cook_completed -> cook_photo_uploaded -> smart_share_sent`

## Implementation Checklist

- [ ] Add `lib/share.ts`
- [ ] Recipe + completion share entry points
- [ ] Verify incoming deep link parsing for `versionId` and `source=share` on `app/recipe/[id].tsx`
- [ ] Add `expo-image-picker`
- [ ] Create `cook_session_photos` table migration
- [ ] Configure `cook-photos` bucket policies
- [ ] Verify challenge week window uses UTC Monday-Sunday boundaries
- [ ] Post-completion photo upload UI
- [ ] Completed Meals section in Profile
- [ ] Home card -> Creator Challenge screen
- [ ] Create/import 3 challenge recipes and persist them in Supabase
- [ ] Add `constants/challenge-config.ts` with the 3 persisted recipe IDs
- [ ] Creator Challenge screen with 3 recipes + `Cooked X/3`
- [ ] Add `cook_sessions` plan attribution columns
- [ ] Wire analytics events
- [ ] Validation pass (`typecheck`, `lint`, `test`)

## Risks and Mitigations

- Risk: deep link behavior varies by app.
- Mitigation: always include plain store fallback text.

- Risk: photo upload instability.
- Mitigation: optional action, never blocks completion.

- Risk: scope creep from gamification ideas.
- Mitigation: no badges/points/leaderboard in v1.
