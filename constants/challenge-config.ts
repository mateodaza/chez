/**
 * Creator Challenge Configuration
 *
 * The 3 recipe IDs must point to actual master_recipes rows in Supabase.
 * Create/import these recipes first, then paste their real UUIDs here.
 */

export const CHALLENGE_CONFIG = {
  /** Display name for the challenge */
  creatorName: "Chez",

  /** Title format: "Chef {creatorName}'s Weekly Challenge" */
  title: "Chez's Weekly Challenge",

  /** The 3 challenge recipe IDs — real master_recipes.id values in Supabase. */
  recipeIds: [
    "26e267a7-755b-4953-9bf8-295975a97253", // Crispy Garlic Butter Salmon
    "ea4521bd-762f-4f4b-bc03-2b32b5f5d8e9", // Spicy Miso Ramen
    "bf753b7d-32c1-45b1-b6ad-7282fac9c333", // Classic Tiramisu
  ] as const,

  /** Number of recipes in the challenge */
  totalRecipes: 3,
} as const;

/**
 * Returns true if the recipe IDs are still placeholder values.
 * Used to hide the challenge card/screen until real recipes are configured.
 */
export function areChallengeRecipesConfigured(): boolean {
  return CHALLENGE_CONFIG.recipeIds.every(
    (id) => !id.startsWith("00000000-0000-0000")
  );
}

/**
 * Get the UTC Monday 00:00:00 start of the current week
 */
export function getCurrentWeekStart(): Date {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get the exclusive upper bound for the current week: next Monday 00:00:00 UTC.
 * Use with .lt() (strictly less than) to avoid edge-case drops at the boundary.
 */
export function getCurrentWeekEnd(): Date {
  const start = getCurrentWeekStart();
  const nextMonday = new Date(start);
  nextMonday.setUTCDate(start.getUTCDate() + 7);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday;
}
