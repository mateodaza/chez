# Versioning System Improvement Plan

## Executive Summary

This document outlines improvements to the recipe versioning system to make versions more accessible, understandable, and aligned with the user mental model of "forks from cooking sessions."

### Core Product Goals

1. **Get people to cook** - Minimize friction between "I want to make this" and actually cooking
2. **Let experts iterate seamlessly** - Version history, comparisons, and modifications should feel natural

### Design Principles

- **Your Version is the star** - User's personalized recipe is always front and center
- **Sources are reference, not navigation** - Don't make users think about sources when they just want to cook
- **Visible but Quiet** - All features accessible, but beginners see calm UI; experts find power when they look

---

## MVP-First Checklist

**Must-do for clean first implementation:**

### Schema (Day 1)

- [ ] Add `parent_version_id` with integrity trigger (parent must belong to same recipe)
- [ ] Add `created_from_session_id` for traceability
- [ ] Add `created_from_mode` enum: `'import' | 'edit' | 'cook_session' | 'source_apply'`
- [ ] Add `created_from_title` (optional) for dropdown label clarity (e.g., "From Cook Session")
- [ ] Backfill existing versions: v1 → parent=null, v2+ → parent=previous version

### Shared Code (Day 1-2)

- [ ] Create `useRecipeWithVersion` hook with documented fallback order
- [ ] Centralize "active version" state (single source of truth)
- [ ] Add version data validation guard

### UI Foundation (Day 2-3)

- [ ] Remove tab system
- [ ] Hide version badge until v2 exists (show "v1" inline for single-version recipes)
- [ ] Add "Previewing v3 — tap 'Make Active' to cook this version" helper when previewing
- [ ] Sticky Cook button (content scrolls, CTA stays fixed)
- [ ] Source attribution line with "Compare" button

### Cook Flow (Day 3-4)

- [ ] Version-aware cook mode (respects active version)
- [ ] Post-cook "Save changes?" prompt sets parent_version_id correctly
- [ ] Optional version notes field at save time (1-liner, power user feature)

### Compare Feature (Day 4-5)

- [ ] "Compare with original" shows top 3 diffs + "show more" link
- [ ] Add "Apply as New Version" button on compare sheet (solves fork-from-source confusion)
- [ ] Compare accessible from both source attribution AND version dropdown
- [ ] **Beginner guard**: Only show "Compare" button after 2+ versions OR 2+ sources exist

**What counts as a diff (MVP scope):**

- Ingredients: name, quantity, unit, prep method
- Steps: text content, duration, temperature
- Ignore: order changes, formatting-only changes

---

## Part 1: Current State Analysis

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         master_recipes                               │
│  - current_version_id (points to active version)                     │
│  - cover_video_source_id                                            │
└─────────────────────────────────────────────────────────────────────┘
          │                                    │
          │ 1:N                                │ 1:N
          ▼                                    ▼
┌─────────────────────────┐      ┌─────────────────────────────────────┐
│ master_recipe_versions   │      │     recipe_source_links              │
│ - version_number         │      │ - extracted_ingredients (JSONB)      │
│ - ingredients (JSONB)    │      │ - extracted_steps (JSONB)            │
│ - steps (JSONB)          │      │ - video_source_id                    │
│ - based_on_source_id     │      │ - link_status                        │
│ - change_notes           │      └─────────────────────────────────────┘
└─────────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────┐
│     cook_sessions        │
│ - version_id             │
│ - source_link_id         │
│ - detected_learnings     │
└─────────────────────────┘
```

### 1.2 Identified Issues

#### A. Technical Debt

| Issue                             | Impact                                               | Root Cause                                                                                                                      |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **FK Join Direction Bug**         | Caused empty version data, broken versions created   | PostgREST `!fk_name` syntax doesn't work for parent→child FK relationships. We've patched this in 4+ places but inconsistently. |
| **No Data Validation**            | Versions v3, v4 created with empty ingredients/steps | No guard against creating versions with incomplete data. Just added a reactive fix.                                             |
| **Inconsistent Version Fetching** | Each screen fetches version data differently         | No shared utility/hook for fetching recipe with version data.                                                                   |

#### B. UX/Conceptual Issues

| Issue                                  | Current Behavior                                               | User Expectation                                                                  |
| -------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Can't switch versions**              | Only see "current_version"                                     | Want to browse version history like git branches                                  |
| **Tab confusion**                      | "My Version" tab vs source creator tabs                        | Unclear that "My Version" IS the version, and sources are just reference material |
| **No version lineage**                 | Just shows "Based on [creator]"                                | Want to see: v1 → v2 (added garlic) → v3 (used cherry tomatoes)                   |
| **Version created from wrong context** | Editing ingredient creates new version from "My Version" state | Should fork from whatever the user is currently viewing                           |

#### C. Data Model Observations

**What's Good:**

- `master_recipe_versions.based_on_source_id` - tracks which source a version came from
- `master_recipe_versions.change_notes` - documents what changed
- `cook_sessions.detected_learnings` - captures modifications during cooking
- `cook_sessions.version_id` - links session to specific version used

**What's Missing:**

- `master_recipe_versions.parent_version_id` - would enable true version tree
- `master_recipe_versions.created_from_session_id` - would link version to its origin session
- No version comparison view

---

## Part 2: Proposed Improvements

### 2.1 Dual-Persona Design

**Persona A: Casual Cook ("Just let me cook")**

- Imports a recipe, wants to cook it tonight
- Doesn't care about versions, sources, or history
- Wants: Big "Cook" button, clear ingredients, simple steps
- Success = Started cooking in < 10 seconds

**Persona B: Recipe Enthusiast ("Let me perfect this")**

- Has cooked this 5+ times, tweaking each time
- Wants to see what changed, compare versions, maybe revert
- Might have multiple sources for same dish to compare techniques
- Success = Can see evolution of their recipe, iterate confidently

**Design Strategy: Visible but Quiet**

Both personas get equal power - the difference is in what they _use_, not what's available.

```
Always Visible:
├── Version badge (v2 ●) - tap for history, notes, comparisons
├── Ingredients - expandable, editable
├── Steps button - tap to expand, editable when open
└── Cook button - primary action

Expert Actions (available, not hidden):
├── Tap ingredient → edit
├── Tap step → edit
├── Tap version badge → history, notes, compare
├── Long-press → reorder
└── "+" buttons → add new items
```

### 2.2 User Mental Model

**Current Model (Confusing):**

```
Recipe Detail Screen
├── "My Version" tab (shows current_version data)
├── "Creator A" tab (shows source link A data)  ← What is this? Do I cook this?
└── "Creator B" tab (shows source link B data)  ← Or this? I'm confused.
```

**Proposed Model (Clear):**

```
Recipe Detail Screen
├── YOUR RECIPE (always shown, this is what you cook)
│   └── Version: [v2 - Your tweaks ▼]  ← Optional, for those who iterate
│
├── Inspired by: Brian Lagerstrom  ← Attribution, not navigation
│   └── [Compare with original] ← For experts who want to see diff
│
└── [Cook This Recipe] button  ← THE primary action, always visible
```

**Key Insight:** Versions and Sources serve different purposes:

- **Versions** = Your recipe iterations (what you cook with)
- **Sources** = Reference/inspiration (where you learned it, for comparison)

### 2.2 Proposed Schema Changes

```sql
-- Add parent_version_id for version lineage
ALTER TABLE master_recipe_versions
ADD COLUMN parent_version_id UUID REFERENCES master_recipe_versions(id);

-- Add session reference for traceability
ALTER TABLE master_recipe_versions
ADD COLUMN created_from_session_id UUID REFERENCES cook_sessions(id);

-- Add creation mode for analytics and debugging
-- 'import' = first version from video import
-- 'edit' = manual ingredient/step edit on recipe detail
-- 'cook_session' = created from detected learnings after cooking
-- 'source_apply' = user applied steps/ingredients from a source comparison
ALTER TABLE master_recipe_versions
ADD COLUMN created_from_mode TEXT CHECK (created_from_mode IN ('import', 'edit', 'cook_session', 'source_apply'));

-- Index for version history queries
CREATE INDEX idx_versions_parent ON master_recipe_versions(parent_version_id);
CREATE INDEX idx_versions_recipe_number ON master_recipe_versions(master_recipe_id, version_number DESC);

-- INTEGRITY: Ensure parent_version_id belongs to the same master_recipe
CREATE OR REPLACE FUNCTION check_parent_version_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_version_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM master_recipe_versions
      WHERE id = NEW.parent_version_id AND master_recipe_id = NEW.master_recipe_id
    ) THEN
      RAISE EXCEPTION 'parent_version_id must belong to the same master_recipe';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_parent_version
  BEFORE INSERT OR UPDATE ON master_recipe_versions
  FOR EACH ROW EXECUTE FUNCTION check_parent_version_integrity();
```

#### Backfill Rules

When running the migration on existing data:

- **v1 versions**: `parent_version_id = NULL`, `created_from_mode = 'import'`
- **v2+ versions**: `parent_version_id = previous version's ID`, infer mode from `based_on_source_id` or `change_notes`
- **Rule**: If `created_from_session_id` would be set, `parent_version_id = session.version_id`

### 2.3 Proposed UI Changes

#### Recipe Detail Screen

**Beginner Mode (only v1 exists):**

```
┌─────────────────────────────────────────────────────┐
│  Amatriciana                               v1       │  ← inline, no dropdown
│  ─────────────────────────────────────────────────  │
│  Inspired by Brian Lagerstrom                       │
│                                                     │
│  ┌─ Ingredients ─────────────────────────────────┐  │
│  │ • 200g guanciale                              │  │
│  │ • 400g San Marzano tomatoes                   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ View Steps (6 steps) ────────────────────────┐  │  ← collapsed by default
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ════════════════════════════════════════════════   │
│  │        🍳 Cook This Recipe                   │   │  ← STICKY (always visible)
│  ════════════════════════════════════════════════   │
└─────────────────────────────────────────────────────┘
```

**Expert Mode (v2+ exists):**

```
┌─────────────────────────────────────────────────────┐
│  Amatriciana                                        │
│  ─────────────────────────────────────────────────  │
│  Version: [v2 - Your tweaks ▼]                      │  ← dropdown appears
│           ┌─────────────────────────────┐           │
│           │ v2 - Your tweaks       ✓    │ ← active  │
│           │ v1 - Original               │           │
│           │ ─────────────────────────── │           │
│           │ Compare with v1...          │           │  ← compare in dropdown
│           └─────────────────────────────┘           │
│                                                     │
│  ┌ Previewing v1 — tap "Make Active" to cook ────┐  │  ← shown when previewing
│  └───────────────────────────────────────────────┘  │     a non-active version
│                                                     │
│  Inspired by Brian Lagerstrom  [Compare]            │
│                                                     │
│  ┌─ Ingredients ─────────────────────────────────┐  │
│  │ • 200g guanciale (you use: pancetta)          │  │
│  │ • 400g San Marzano tomatoes                   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ View Steps (6 steps) ────────────────────────┐  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ════════════════════════════════════════════════   │
│  │        🍳 Cook This Recipe                   │   │  ← STICKY
│  ════════════════════════════════════════════════   │
└─────────────────────────────────────────────────────┘
```

#### Version Selector Dropdown

Simple dropdown showing:

- Version number + auto-generated label from change_notes
- Date created
- Visual indicator (✓) for active version
- "Compare with [version]..." action at bottom

#### Compare Sheet (MVP scope)

When "Compare" is tapped (from source attribution or version dropdown):

```
┌─────────────────────────────────────────────────────┐
│  Compare with Original                         [X]  │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Differences (3):                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │ ≠ Guanciale → Pancetta                      │   │
│  │ ≠ San Marzano → Cherry tomatoes             │   │
│  │ ≠ Step 3: Added "rest for 2 min"            │   │
│  └─────────────────────────────────────────────┘   │
│  [Show all differences]                             │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │   Apply Original as New Version              │   │  ← solves "fork from source"
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │   Keep My Version                            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

#### Source References (Collapsed Section)

- Shows all linked sources
- Tap to view original video
- Not for cooking - just for reference

### 2.4 Proposed Code Improvements

#### A. Create Shared Hook: `useRecipeWithVersion`

```typescript
// lib/hooks/useRecipeWithVersion.ts
export function useRecipeWithVersion(recipeId: string, versionId?: string) {
  // Handles:
  // 1. Fetching master_recipe
  // 2. Fetching specific version OR current_version
  // 3. Fetching all versions for dropdown
  // 4. Proper FK join workaround (no !fk_name)

  return {
    recipe,                    // master_recipe data
    activeVersion,             // The version user will cook (current_version_id)
    previewedVersion,          // Version currently being viewed (may differ from active)
    allVersions,               // All versions for dropdown
    sourceLinks,               // Linked sources for attribution/compare
    isLoading,
    error,

    // Actions
    previewVersion: (versionId: string) => void,   // Switch view without changing active
    makeActive: (versionId: string) => void,       // Set as the version to cook
    createVersion: (data, mode) => Promise<void>,  // Create new version with lineage
  };
}
```

**Fallback Order (documented in hook):**

1. If `versionId` param provided → fetch that specific version
2. If invalid/missing → fall back to `recipe.current_version_id`
3. If `current_version_id` is null → show error state with "Recipe has no versions"
4. On any fetch error → show toast **"Couldn't load that version — showing latest."** + fall back

**State Persistence:**

- `activeVersionId` = `master_recipes.current_version_id` (persisted in DB)
- `previewedVersionId` = UI state only (never persisted, resets on screen mount)
- When user taps "Make Active" → update `current_version_id` in DB

**Lineage Rules (explicit):**
| Creation Context | `parent_version_id` | `based_on_source_id` | `created_from_mode` |
|------------------|---------------------|----------------------|---------------------|
| Cook session | `session.version_id` | null | `'cook_session'` |
| Manual edit | `activeVersionId` at edit time | null | `'edit'` |
| Source apply | `activeVersionId` | source link ID | `'source_apply'` |
| Initial import | null | source link ID | `'import'` |

**Auto-generated Version Labels:**
If user skips "version notes" at save time, auto-generate from:

1. `detected_learnings` if from cook session → "Used pancetta, added garlic"
2. `created_from_mode` fallback → "From Cook Session" / "Manual Edit" / "From Source"

#### B. Centralize Version Data Fetching

Instead of inline queries with FK joins, use a helper:

```typescript
// lib/supabase/queries.ts
export async function fetchRecipeVersion(versionId: string) {
  const { data } = await supabase
    .from("master_recipe_versions")
    .select("id, version_number, ingredients, steps, ...")
    .eq("id", versionId)
    .single();
  return data;
}

export async function fetchAllVersions(masterRecipeId: string) {
  const { data } = await supabase
    .from("master_recipe_versions")
    .select("id, version_number, change_notes, created_at, parent_version_id")
    .eq("master_recipe_id", masterRecipeId)
    .order("version_number", { ascending: false });
  return data;
}
```

#### C. Version Creation Guard

Already added, but should be in the shared hook:

```typescript
function validateVersionData(ingredients: any[], steps: any[]) {
  if (!ingredients?.length || !steps?.length) {
    throw new Error("Cannot create version with empty data");
  }
}
```

---

## Part 3: Implementation Plan

### Phase 1: Foundation (Schema + Shared Code)

| Task                                             | Priority | Complexity |
| ------------------------------------------------ | -------- | ---------- |
| Add `parent_version_id` column                   | High     | Low        |
| Add `created_from_session_id` column             | Medium   | Low        |
| Create `useRecipeWithVersion` hook               | High     | Medium     |
| Create centralized query helpers                 | High     | Low        |
| Backfill parent_version_id for existing versions | Low      | Low        |

### Phase 2: Recipe Detail Screen Refactor

| Task                                        | Priority | Complexity |
| ------------------------------------------- | -------- | ---------- |
| Replace tab system with version dropdown    | High     | Medium     |
| Add version selector component              | High     | Medium     |
| Move sources to collapsed reference section | Medium   | Low        |
| Update ingredient edit to use shared hook   | High     | Low        |

### Phase 3: Cook Mode Updates

| Task                                                | Priority | Complexity |
| --------------------------------------------------- | -------- | ---------- |
| Pass selected version_id to cook mode               | High     | Low        |
| Update cook mode to use `useRecipeWithVersion`      | High     | Medium     |
| Update `create-my-version` to set parent_version_id | Medium   | Low        |

### Phase 4: Polish

| Task                                | Priority | Complexity |
| ----------------------------------- | -------- | ---------- |
| Version comparison view (optional)  | Low      | High       |
| Version history timeline (optional) | Low      | Medium     |

---

## Part 4: Design Decisions (Aligned)

Based on our discussion, here are the design decisions:

### D1: Version Switching Behavior

**Decision:** View by default, with "Make this my active version" action

- Switching versions just previews them
- Explicit action to change what you'll cook next
- Prevents accidental changes for casual cooks

### D2: Source References Display

**Decision:** Minimal attribution + "Compare" for experts

- Show "Inspired by [Creator]" as simple attribution
- "Compare with original" button for those who want to see differences
- NO tabs that confuse sources with versions

### D3: Version Labels

**Decision:** Auto-generate from change_notes

- "v2 - Used pancetta instead of guanciale"
- "v3 - Added extra garlic"
- Keep it automatic, don't burden users with naming

### D4: Cook Mode Version Selection

**Decision:** Always cook your current active version

- The version selector affects what's "active"
- Cook button always uses active version
- No confusion about "which version am I cooking?"

### D5: Multiple Sources

**Decision:** Sources as reference material only

- When importing a second source for same recipe, it gets linked
- User can "Compare sources" to see different techniques
- Can optionally "Apply steps from [source]" to create a new version
- Sources never replace your version - they inform it

### D6: Default State for New Recipes

**Decision:** v1 IS your version from day one

- No "original" vs "my version" distinction
- First import = v1 of YOUR recipe
- Modifications create v2, v3, etc.
- The recipe is YOURS the moment you import it

### D7: Source Picking Flow (For Multiple Sources)

When a recipe has multiple linked sources, experts might want to compare:

```
┌─────────────────────────────────────────────────────┐
│  Compare Sources                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  ┌─────────────────┐    ┌─────────────────┐        │
│  │ Your Version    │    │ Brian Lagerstrom │        │
│  │ (v2)            │    │ (Original source)│        │
│  ├─────────────────┤    ├─────────────────┤        │
│  │ 200g pancetta   │ ≠  │ 200g guanciale   │        │
│  │ Cherry tomatoes │ ≠  │ San Marzano      │        │
│  │ 6 steps         │    │ 6 steps          │        │
│  └─────────────────┘    └─────────────────┘        │
│                                                     │
│  [Use Brian's tomato step] [Keep my version]       │
└─────────────────────────────────────────────────────┘
```

This is a **Layer 3 feature** - only for experts who explicitly want to compare.

---

## Part 5: Success Metrics

### For Casual Cooks (Persona A)

- [ ] Can start cooking in < 10 seconds from recipe detail
- [ ] Never confused about "which version am I cooking?"
- [ ] Sources don't clutter the main cooking flow
- [ ] Single-version recipes show calm, simple UI (no version badge)

### For Recipe Enthusiasts (Persona B)

- [ ] Can switch between versions in < 2 taps
- [ ] Version history shows clear progression with changes
- [ ] Can compare their version with original source
- [ ] Modifications from cook mode automatically create new versions
- [ ] **Behavioral: Create new version in ≤30s after a cook session** (validates smart versioning flow)
- [ ] Can add version notes at save time for better labeling

### Technical Health

- [ ] No more empty version bugs (validation in place)
- [ ] Single `useRecipeWithVersion` hook replaces 4+ duplicate implementations
- [ ] FK join bug eliminated via centralized query helpers
- [ ] Version lineage tracked via `parent_version_id`
- [ ] Invalid version IDs gracefully fall back + show toast

---

## Part 6: What We're NOT Building (Scope Control)

To keep this focused, explicitly out of scope for now:

- ❌ Full version diff view (side-by-side comparison of every change)
- ❌ Branch/merge of versions (git-like complexity)
- ❌ Sharing versions with other users
- ❌ "Fork from source" as a primary action (sources inform, not replace)
- ❌ Version comments/annotations

**Low-complexity future additions (post-MVP):**

- ✅ "Revert to this version" in dropdown → creates new version with old content (high expert value, low risk)

These could be future enhancements but aren't needed for the core experience.

---

## Appendix: Current Code Locations

| Component            | File                                              | Lines |
| -------------------- | ------------------------------------------------- | ----- |
| Recipe Detail Screen | `app/recipe/[id].tsx`                             | ~1550 |
| Cook Mode Screen     | `app/cook/[id].tsx`                               | ~2000 |
| Create My Version    | `supabase/functions/create-my-version/index.ts`   | ~400  |
| Cook Chat            | `supabase/functions/cook-chat/index.ts`           | ~880  |
| Confirm Source Link  | `supabase/functions/confirm-source-link/index.ts` | ~420  |

---

## Next Steps

### Immediate (Phase 1 - Foundation)

1. **Schema migration**: Add `parent_version_id` and `created_from_session_id` columns
2. **Create shared hook**: `useRecipeWithVersion` to replace duplicate code
3. **Query helpers**: Centralized functions that avoid FK join bugs

### Then (Phase 2 - Recipe Detail Refactor)

4. **Remove tab system**: Replace with version dropdown
5. **Simplify source display**: Attribution line + "Compare" button
6. **Ensure Cook button clarity**: Always cooks active version

### Finally (Phase 3 - Cook Mode Polish)

7. **Version-aware cook mode**: Respects selected version
8. **Auto-version from learnings**: create-my-version sets parent_version_id
9. **Post-cook version prompt**: "Save as new version?" with clear labeling

---

**Ready to start Phase 1?** Just say "go" and I'll begin with the schema migration and shared hook.
