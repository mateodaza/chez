import { Share } from "react-native";
import { Analytics } from "@/lib/analytics";

// Web redirect page hosted on GitHub Pages — tries chez:// deep link,
// falls back to a landing page with TestFlight/store links
const WEB_BASE_URL = "https://mateodaza.github.io/chez/recipe/";

/**
 * Build a shareable web URL that redirects to the app or shows a landing page.
 */
function buildRecipeShareUrl(recipeId: string, versionId?: string): string {
  const params = new URLSearchParams({ id: recipeId, source: "share" });
  if (versionId) params.set("versionId", versionId);
  return `${WEB_BASE_URL}?${params.toString()}`;
}

export interface SharePayload {
  title: string;
  message: string;
}

/**
 * Build a share payload for a recipe.
 * Uses a web URL that tries the deep link and falls back to a landing page.
 */
export function buildRecipeSharePayload(
  recipeTitle: string,
  recipeId: string,
  versionId?: string
): SharePayload {
  const url = buildRecipeShareUrl(recipeId, versionId);

  return {
    title: recipeTitle,
    message: `Check out this recipe on Chez: ${recipeTitle}\n\n${url}`,
  };
}

/**
 * Build a share payload for a completed cook.
 */
export function buildCompletedCookPayload(
  recipeTitle: string,
  recipeId: string,
  versionId?: string
): SharePayload {
  const url = buildRecipeShareUrl(recipeId, versionId);

  return {
    title: `I just cooked ${recipeTitle}!`,
    message: `I just made ${recipeTitle} with Chez! Try it yourself:\n\n${url}`,
  };
}

/**
 * Share a recipe via the native share sheet
 */
export async function shareRecipe(
  recipeTitle: string,
  recipeId: string,
  versionId?: string
): Promise<boolean> {
  const payload = buildRecipeSharePayload(recipeTitle, recipeId, versionId);

  try {
    const result = await Share.share({
      title: payload.title,
      message: payload.message,
    });

    if (result.action === Share.sharedAction) {
      Analytics.smartShareSent(recipeId, "recipe_detail");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Share a completed cook via the native share sheet
 */
export async function shareCompletedCook(
  recipeTitle: string,
  recipeId: string,
  versionId?: string
): Promise<boolean> {
  const payload = buildCompletedCookPayload(recipeTitle, recipeId, versionId);

  try {
    const result = await Share.share({
      title: payload.title,
      message: payload.message,
    });

    if (result.action === Share.sharedAction) {
      Analytics.smartShareSent(recipeId, "post_completion");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
