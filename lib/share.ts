import { Share, Platform } from "react-native";
import { Analytics } from "@/lib/analytics";

// TODO: Replace with real store URLs before production release
const IOS_STORE_URL = "https://apps.apple.com/app/chez/id000000000";
const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.chez.app";

const STORE_URLS_CONFIGURED = !IOS_STORE_URL.includes("id000000000");

if (__DEV__ && !STORE_URLS_CONFIGURED) {
  console.warn(
    "[share] Store URLs are placeholders. Replace before production release."
  );
}

/**
 * Build the store fallback text for users without the app.
 * Always includes both stores so recipients on either platform can install.
 */
function buildStoreFallback(): string {
  // Primary link first based on sender platform, but always include both
  if (Platform.OS === "android") {
    return `Get Chez:\nAndroid: ${ANDROID_STORE_URL}\niOS: ${IOS_STORE_URL}`;
  }
  return `Get Chez:\niOS: ${IOS_STORE_URL}\nAndroid: ${ANDROID_STORE_URL}`;
}

export interface SharePayload {
  title: string;
  message: string;
}

/**
 * Build a share payload for a recipe
 */
export function buildRecipeSharePayload(
  recipeTitle: string,
  _recipeId: string,
  _versionId?: string
): SharePayload {
  const fallback = buildStoreFallback();

  return {
    title: recipeTitle,
    message: `Check out this recipe on Chez: ${recipeTitle}\n\n${fallback}`,
  };
}

/**
 * Build a share payload for a completed cook
 */
export function buildCompletedCookPayload(
  recipeTitle: string,
  _recipeId: string,
  _versionId?: string
): SharePayload {
  const fallback = buildStoreFallback();

  return {
    title: `I just cooked ${recipeTitle}!`,
    message: `I just made ${recipeTitle} with Chez! Try it yourself:\n\n${fallback}`,
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
