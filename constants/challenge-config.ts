/**
 * Creator Challenge Configuration
 *
 * The 3 recipe IDs must point to actual master_recipes rows in Supabase.
 * Create/import these recipes first, then paste their real UUIDs here.
 */

export const CHALLENGE_CONFIG = {
  /** Display name for the challenge creator (used in attribution) */
  creatorName: "Eitan Bernath",

  /** Title shown on challenge screen */
  title: "Weekly Challenge",

  /** The 3 challenge recipe IDs — real master_recipes.id values in Supabase. */
  recipeIds: [
    "59e866ec-7d5d-49c0-8fd2-73ee9854489d", // Frozen Tomato Burrata (484K TikTok likes)
    "8c2d1283-c679-43b3-8b6e-681678c42e4c", // Chicken Kofta Kebabs (Drew Barrymore Show)
    "24307bb9-ec84-43d5-a24a-aa8ccdc17054", // Homemade Roti (Bill Gates viral collab)
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
