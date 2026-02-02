# Version Management QA Checklist

This document provides a manual QA checklist for verifying the version management bug fixes.

## Test Data

The following test recipes are set up in the database:

| Recipe              | Type       | ID                                     | Versions                        | Sources   |
| ------------------- | ---------- | -------------------------------------- | ------------------------------- | --------- |
| Cacio e Pepe        | Outsourced | `7b02129c-71fb-40c0-987b-b78701175baf` | v1 (Original) + v2 (My Version) | 2 sources |
| Cacio e Pepe (Copy) | Forked     | `047baf21-ec9c-4e1f-881c-fe01b6ce23dd` | v1 only                         | 0 sources |

### Version IDs

- **Outsourced v1 (Original)**: `f4e3c685-7d76-4154-9c0f-632b06c62706`
- **Outsourced v2 (My Version)**: `0b814ed1-d665-44b8-82d3-780f060ffda9`
- **Forked v1**: `2f85ebc2-1ebc-497d-a814-53b10bdb8e7d`

---

## A. Version Toggle -> Cooking Route Respects Selection

### A1. Toggle to Original, Start Cooking

- [ ] Open outsourced recipe (Cacio e Pepe)
- [ ] Toggle to "Original" version
- [ ] Tap "Start Cooking"
- [ ] **Verify**: URL contains `versionId=f4e3c685-7d76-4154-9c0f-632b06c62706` (v1)
- [ ] **Verify**: Cook screen shows v1 ingredients (1 cup pecorino, NO garlic)
- [ ] **Verify**: Cook screen shows v1 steps (9 steps)

### A2. Toggle to My Version, Start Cooking

- [ ] Go back to recipe detail
- [ ] Toggle to "My Version"
- [ ] Tap "Start Cooking"
- [ ] **Verify**: URL contains `versionId=0b814ed1-d665-44b8-82d3-780f060ffda9` (v2)
- [ ] **Verify**: Cook screen shows v2 ingredients (1.5 cups pecorino, HAS garlic)

### A3. Invalid versionId Fallback

- [ ] Manually navigate to `/cook/7b02129c-71fb-40c0-987b-b78701175baf?versionId=invalid-uuid`
- [ ] **Verify**: No crash
- [ ] **Verify**: Falls back to current_version_id (v2 data)

---

## B. Forked Recipe Behavior

### B1. Edit Ingredient Stays Single Version

- [ ] Open forked recipe (Cacio e Pepe Copy)
- [ ] Edit any ingredient (e.g., change pecorino quantity)
- [ ] Save the edit
- [ ] **Verify**: Recipe still has only 1 version (no v2 created)
- [ ] **Verify**: Changes are applied directly to v1
- [ ] **DB Check**: Run `SELECT COUNT(*) FROM master_recipe_versions WHERE master_recipe_id = '047baf21-ec9c-4e1f-881c-fe01b6ce23dd'` - should be 1

### B2. Cook Session Learnings Update v1 in Place

- [ ] Open forked recipe
- [ ] Start cooking
- [ ] Ask Chez something that creates a learning (e.g., "I'm using olive oil instead of butter")
- [ ] Tap "Remember this"
- [ ] Complete cooking session with "Save to My Version" enabled
- [ ] **Verify**: Learning is applied to v1 (not creating v2)
- [ ] **DB Check**: Version count still 1

### B3. Version Toggle Hidden for Forked Recipes

- [ ] Open forked recipe
- [ ] **Verify**: No version toggle is shown
- [ ] **Verify**: "Your recipe" badge is shown instead

---

## C. Source Apply Attribution

### C1. Apply Source Updates based_on_source_id

- [ ] Open outsourced recipe (Cacio e Pepe)
- [ ] Open source browser (tap "2 Sources")
- [ ] Select "Chef Maria Test" source
- [ ] Tap "Apply" to apply this source's data
- [ ] **Verify**: v2 now shows Chef Maria's ingredients (tonnarelli, 200g pecorino DOP)
- [ ] **DB Check**: Run query below - should show new source ID

```sql
SELECT based_on_source_id FROM master_recipe_versions
WHERE master_recipe_id = '7b02129c-71fb-40c0-987b-b78701175baf'
AND version_number = 2;
```

### C2. Apply Original Source

- [ ] Open Compare modal
- [ ] Apply the original source (first source)
- [ ] **Verify**: v2 based_on_source_id becomes original source ID

---

## D. Refetch / Refresh Preserves Selection

### D1. Pull-to-Refresh While Viewing Original

- [ ] Open outsourced recipe
- [ ] Toggle to "Original"
- [ ] Pull down to refresh
- [ ] **Verify**: Still viewing Original (not switched to My Version)

### D2. Navigate Away and Back

- [ ] Open outsourced recipe
- [ ] Toggle to "Original"
- [ ] Navigate to another screen (e.g., Home)
- [ ] Navigate back to recipe
- [ ] **Verify**: Still viewing Original

---

## E. Edge Function Verification

### E1. create-my-version Replaces v2

- [ ] Complete a cook session on outsourced recipe with learnings
- [ ] **DB Check**: v2 should have new data, v1 should be unchanged
- [ ] **Verify**: v1 ingredient count stays the same as original

### E2. Forked Recipes Never Call create-my-version

- [ ] Complete a cook session on forked recipe with learnings
- [ ] **Verify**: No edge function call to create-my-version (check network tab or logs)
- [ ] **Verify**: v1 is updated directly

---

## SQL Verification Queries

Run these queries to verify database state:

```sql
-- All assertions should return PASS
-- Copy from: scripts/verify-version-management.sql
```

---

## Test Results

| Test                                     | Status | Notes |
| ---------------------------------------- | ------ | ----- |
| A1. Toggle Original -> Cook              |        |       |
| A2. Toggle My Version -> Cook            |        |       |
| A3. Invalid versionId fallback           |        |       |
| B1. Forked edit stays single version     |        |       |
| B2. Forked cook session updates v1       |        |       |
| B3. Version toggle hidden for forked     |        |       |
| C1. Apply source updates attribution     |        |       |
| C2. Apply original source                |        |       |
| D1. Pull-to-refresh preserves toggle     |        |       |
| D2. Navigate away/back preserves toggle  |        |       |
| E1. create-my-version replaces v2        |        |       |
| E2. Forked never calls create-my-version |        |       |

---

## Running DB Assertions

```bash
# Run from project root
supabase db execute --file scripts/verify-version-management.sql
```

Or run via Supabase dashboard SQL editor.
