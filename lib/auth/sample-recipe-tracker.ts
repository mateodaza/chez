import * as SecureStore from "expo-secure-store";

const SAMPLE_DISMISSED_KEY = "sample_recipe_dismissed_user_id";

/**
 * Check if the sample recipe was dismissed by this user
 * Uses user_id to ensure dismissal persists across sessions
 */
export async function hasDismissedSampleRecipe(
  userId: string | undefined
): Promise<boolean> {
  if (!userId) return false;

  try {
    const dismissedUserId =
      await SecureStore.getItemAsync(SAMPLE_DISMISSED_KEY);
    return dismissedUserId === userId;
  } catch (error) {
    console.warn("[SampleRecipeTracker] Failed to check dismissal:", error);
    return false;
  }
}

/**
 * Mark the sample recipe as dismissed for this user
 * Call this when user deletes the sample recipe
 */
export async function markSampleRecipeDismissed(
  userId: string | undefined
): Promise<void> {
  if (!userId) return;

  try {
    await SecureStore.setItemAsync(SAMPLE_DISMISSED_KEY, userId);
  } catch (error) {
    console.warn("[SampleRecipeTracker] Failed to mark dismissed:", error);
  }
}

/**
 * Clear sample dismissal state (for testing or account reset)
 */
export async function clearSampleDismissalState(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SAMPLE_DISMISSED_KEY);
  } catch (error) {
    console.warn("[SampleRecipeTracker] Failed to clear state:", error);
  }
}
