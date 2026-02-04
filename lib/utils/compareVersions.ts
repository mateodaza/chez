/**
 * Compare Versions Utility
 *
 * Calculates differences between recipe versions or sources.
 * Used for the Compare modal to show what changed between
 * a user's version and the original source.
 */

import type {
  VersionIngredient,
  VersionStep,
  VersionLearning,
} from "@/types/database";

// Diff types
export type DiffType = "added" | "removed" | "modified";
export type DiffCategory = "ingredient" | "step" | "note";

export interface IngredientDiff {
  category: "ingredient";
  type: DiffType;
  original: VersionIngredient | null;
  current: VersionIngredient | null;
  field?: "item" | "quantity" | "unit" | "preparation"; // Which field changed (for modified)
  summary: string; // Human-readable diff summary
}

export interface StepDiff {
  category: "step";
  type: DiffType;
  stepNumber: number;
  original: VersionStep | null;
  current: VersionStep | null;
  field?: "instruction" | "duration" | "temperature"; // Which field changed (for modified)
  summary: string;
}

export interface NoteDiff {
  category: "note";
  type: "added"; // Notes are only "added" (they don't exist in original)
  stepNumber?: number; // Optional - not used for version-level learnings
  noteType: string; // e.g., "substitution", "timing", etc.
  content: string;
  summary: string;
}

export type RecipeDiff = IngredientDiff | StepDiff | NoteDiff;

export interface CompareResult {
  diffs: RecipeDiff[];
  totalChanges: number;
  ingredientChanges: number;
  stepChanges: number;
  noteChanges: number;
  hasChanges: boolean;
}

/**
 * Normalize text for comparison (lowercase, trim, collapse whitespace)
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Check if two strings are similar enough to be considered "the same item"
 * Uses simple substring matching for fuzzy matching
 */
function isSimilarItem(a: string, b: string): boolean {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  // Exact match
  if (normA === normB) return true;

  // One contains the other (e.g., "chicken breast" matches "chicken")
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Check if main words overlap (at least 50% of words match)
  const wordsA = normA.split(" ").filter((w) => w.length > 2);
  const wordsB = normB.split(" ").filter((w) => w.length > 2);

  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const matchingWords = wordsA.filter((word) =>
    wordsB.some((w) => w.includes(word) || word.includes(w))
  );

  return matchingWords.length >= Math.min(wordsA.length, wordsB.length) * 0.5;
}

/**
 * Format quantity and unit for display
 */
function formatQuantity(quantity: number | null, unit: string | null): string {
  if (quantity === null) return "";
  const unitStr = unit ? ` ${unit}` : "";
  return `${quantity}${unitStr}`;
}

/**
 * Compare two ingredients and detect what changed
 */
function compareIngredient(
  original: VersionIngredient,
  current: VersionIngredient
): IngredientDiff | null {
  const changes: string[] = [];
  let primaryField: "item" | "quantity" | "unit" | "preparation" | undefined;

  // Check item name change
  if (normalizeText(original.item) !== normalizeText(current.item)) {
    changes.push(`"${original.item}" → "${current.item}"`);
    primaryField = "item";
  }

  // Check quantity change
  if (original.quantity !== current.quantity) {
    const origQty = formatQuantity(original.quantity, original.unit);
    const currQty = formatQuantity(current.quantity, current.unit);
    if (origQty !== currQty) {
      changes.push(`${origQty || "unspecified"} → ${currQty || "unspecified"}`);
      if (!primaryField) primaryField = "quantity";
    }
  } else if (original.unit !== current.unit) {
    // Unit changed but quantity didn't
    changes.push(
      `${original.unit || "no unit"} → ${current.unit || "no unit"}`
    );
    if (!primaryField) primaryField = "unit";
  }

  // Check preparation change
  if (
    normalizeText(original.preparation) !== normalizeText(current.preparation)
  ) {
    const origPrep = original.preparation || "no prep";
    const currPrep = current.preparation || "no prep";
    changes.push(`prep: ${origPrep} → ${currPrep}`);
    if (!primaryField) primaryField = "preparation";
  }

  if (changes.length === 0) return null;

  return {
    category: "ingredient",
    type: "modified",
    original,
    current,
    field: primaryField,
    summary: `${current.item}: ${changes.join(", ")}`,
  };
}

/**
 * Compare two steps and detect what changed
 */
function compareStep(
  original: VersionStep,
  current: VersionStep
): StepDiff | null {
  const changes: string[] = [];
  let primaryField: "instruction" | "duration" | "temperature" | undefined;

  // Check instruction change (only if significantly different)
  const normOriginal = normalizeText(original.instruction);
  const normCurrent = normalizeText(current.instruction);

  if (normOriginal !== normCurrent) {
    // Check if it's a significant change (not just minor word tweaks)
    const origWords = normOriginal.split(" ");
    const currWords = normCurrent.split(" ");
    const totalWords = Math.max(origWords.length, currWords.length);
    const matchingWords = origWords.filter((w) => currWords.includes(w));
    const similarity = matchingWords.length / totalWords;

    // Only report if less than 80% similar
    if (similarity < 0.8) {
      changes.push("instruction changed");
      primaryField = "instruction";
    }
  }

  // Check duration change
  if (original.duration_minutes !== current.duration_minutes) {
    const origDur = original.duration_minutes
      ? `${original.duration_minutes} min`
      : "no time";
    const currDur = current.duration_minutes
      ? `${current.duration_minutes} min`
      : "no time";
    changes.push(`${origDur} → ${currDur}`);
    if (!primaryField) primaryField = "duration";
  }

  // Check temperature change
  if (
    original.temperature_value !== current.temperature_value ||
    original.temperature_unit !== current.temperature_unit
  ) {
    const origTemp = original.temperature_value
      ? `${original.temperature_value}°${original.temperature_unit || "F"}`
      : "no temp";
    const currTemp = current.temperature_value
      ? `${current.temperature_value}°${current.temperature_unit || "F"}`
      : "no temp";
    if (origTemp !== currTemp) {
      changes.push(`${origTemp} → ${currTemp}`);
      if (!primaryField) primaryField = "temperature";
    }
  }

  if (changes.length === 0) return null;

  return {
    category: "step",
    type: "modified",
    stepNumber: current.step_number,
    original,
    current,
    field: primaryField,
    summary: `Step ${current.step_number}: ${changes.join(", ")}`,
  };
}

/**
 * Compare ingredients between original (source) and current (version)
 * Returns list of differences
 */
function compareIngredients(
  original: VersionIngredient[],
  current: VersionIngredient[]
): IngredientDiff[] {
  const diffs: IngredientDiff[] = [];
  const matchedOriginalIds = new Set<string>();
  const matchedCurrentIds = new Set<string>();

  // First pass: match by ID
  for (const currIng of current) {
    const origIng = original.find((o) => o.id === currIng.id);
    if (origIng) {
      matchedOriginalIds.add(origIng.id);
      matchedCurrentIds.add(currIng.id);

      const diff = compareIngredient(origIng, currIng);
      if (diff) diffs.push(diff);
    }
  }

  // Second pass: fuzzy match by item name for unmatched
  for (const currIng of current) {
    if (matchedCurrentIds.has(currIng.id)) continue;

    const origIng = original.find(
      (o) =>
        !matchedOriginalIds.has(o.id) && isSimilarItem(o.item, currIng.item)
    );

    if (origIng) {
      matchedOriginalIds.add(origIng.id);
      matchedCurrentIds.add(currIng.id);

      const diff = compareIngredient(origIng, currIng);
      if (diff) diffs.push(diff);
    }
  }

  // Added ingredients (in current but not in original)
  for (const currIng of current) {
    if (matchedCurrentIds.has(currIng.id)) continue;

    diffs.push({
      category: "ingredient",
      type: "added",
      original: null,
      current: currIng,
      summary: `Added: ${currIng.item}`,
    });
  }

  // Removed ingredients (in original but not in current)
  for (const origIng of original) {
    if (matchedOriginalIds.has(origIng.id)) continue;

    diffs.push({
      category: "ingredient",
      type: "removed",
      original: origIng,
      current: null,
      summary: `Removed: ${origIng.item}`,
    });
  }

  return diffs;
}

/**
 * Compare steps between original (source) and current (version)
 * Returns list of differences
 * Handles non-contiguous step numbers (e.g., 1, 3, 5 after deletions)
 */
function compareSteps(
  original: VersionStep[],
  current: VersionStep[]
): StepDiff[] {
  const diffs: StepDiff[] = [];

  // Build maps by step_number for efficient lookup
  const originalMap = new Map<number, VersionStep>();
  const currentMap = new Map<number, VersionStep>();

  for (const step of original) {
    originalMap.set(step.step_number, step);
  }
  for (const step of current) {
    currentMap.set(step.step_number, step);
  }

  // Get all unique step numbers from both arrays
  const allStepNumbers = new Set<number>([
    ...originalMap.keys(),
    ...currentMap.keys(),
  ]);

  for (const stepNum of allStepNumbers) {
    const origStep = originalMap.get(stepNum);
    const currStep = currentMap.get(stepNum);

    if (origStep && currStep) {
      // Both exist - check for modifications
      const diff = compareStep(origStep, currStep);
      if (diff) diffs.push(diff);
    } else if (currStep && !origStep) {
      // Added step
      diffs.push({
        category: "step",
        type: "added",
        stepNumber: currStep.step_number,
        original: null,
        current: currStep,
        summary: `Added step ${currStep.step_number}`,
      });
    } else if (origStep && !currStep) {
      // Removed step
      diffs.push({
        category: "step",
        type: "removed",
        stepNumber: origStep.step_number,
        original: origStep,
        current: null,
        summary: `Removed step ${origStep.step_number}`,
      });
    }
  }

  // Sort by step number for consistent ordering
  diffs.sort((a, b) => a.stepNumber - b.stepNumber);

  return diffs;
}

/**
 * Extract notes from both:
 * 1. Version-level learnings (new: version.learnings)
 * 2. Step-level notes (deprecated: step.user_notes, for backward compat)
 */
function extractNotes(
  currentSteps: VersionStep[],
  versionLearnings?: VersionLearning[]
): NoteDiff[] {
  const noteDiffs: NoteDiff[] = [];

  // 1. Version-level learnings (new format)
  if (versionLearnings && Array.isArray(versionLearnings)) {
    for (const learning of versionLearnings) {
      noteDiffs.push({
        category: "note",
        type: "added",
        noteType: learning.type,
        content: learning.content,
        summary: learning.content,
      });
    }
  }

  // 2. Step-level notes (deprecated, backward compat)
  for (const step of currentSteps) {
    if (step.user_notes && Array.isArray(step.user_notes)) {
      for (const note of step.user_notes) {
        noteDiffs.push({
          category: "note",
          type: "added",
          stepNumber: step.step_number,
          noteType: note.type,
          content: note.content,
          summary: note.content,
        });
      }
    }
  }

  return noteDiffs;
}

/**
 * Main compare function
 * Compares current version data against original source data
 */
export function compareVersions(
  originalIngredients: VersionIngredient[],
  originalSteps: VersionStep[],
  currentIngredients: VersionIngredient[],
  currentSteps: VersionStep[],
  versionLearnings?: VersionLearning[] // New: version-level learnings
): CompareResult {
  const ingredientDiffs = compareIngredients(
    originalIngredients,
    currentIngredients
  );
  const stepDiffs = compareSteps(originalSteps, currentSteps);
  const noteDiffs = extractNotes(currentSteps, versionLearnings);

  const diffs = [...ingredientDiffs, ...stepDiffs, ...noteDiffs];

  return {
    diffs,
    totalChanges: diffs.length,
    ingredientChanges: ingredientDiffs.length,
    stepChanges: stepDiffs.length,
    noteChanges: noteDiffs.length,
    hasChanges: diffs.length > 0,
  };
}

/**
 * Get top N most significant diffs
 * Prioritizes: notes > substitutions > timing changes > other modifications > additions > removals
 */
export function getTopDiffs(
  result: CompareResult,
  limit: number = 3
): RecipeDiff[] {
  const priorityOrder: Record<string, number> = {
    "note-added": 1, // User's learnings are most significant
    "ingredient-modified": 2,
    "step-modified": 3,
    "ingredient-added": 4,
    "step-added": 5,
    "ingredient-removed": 6,
    "step-removed": 7,
  };

  return [...result.diffs]
    .sort((a, b) => {
      const keyA = `${a.category}-${a.type}`;
      const keyB = `${b.category}-${b.type}`;
      return (priorityOrder[keyA] || 99) - (priorityOrder[keyB] || 99);
    })
    .slice(0, limit);
}
