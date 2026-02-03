import * as SecureStore from "expo-secure-store";

const ONBOARDING_SESSION_KEY = "onboarding_completed_session_id";

/**
 * Tracks onboarding completion per session to ensure onboarding
 * only shows once per login, but resets after logout/login
 */

/**
 * Check if onboarding has been completed for the current session
 */
export async function hasCompletedOnboardingForSession(
  sessionId: string | undefined
): Promise<boolean> {
  if (!sessionId) return false;

  try {
    const completedSessionId = await SecureStore.getItemAsync(
      ONBOARDING_SESSION_KEY
    );
    return completedSessionId === sessionId;
  } catch (error) {
    console.warn("[OnboardingTracker] Failed to check completion:", error);
    return false;
  }
}

/**
 * Mark onboarding as completed for the current session
 */
export async function markOnboardingComplete(
  sessionId: string | undefined
): Promise<void> {
  if (!sessionId) return;

  try {
    await SecureStore.setItemAsync(ONBOARDING_SESSION_KEY, sessionId);
  } catch (error) {
    console.warn("[OnboardingTracker] Failed to mark complete:", error);
  }
}

/**
 * Clear onboarding completion state (call on logout)
 */
export async function clearOnboardingState(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ONBOARDING_SESSION_KEY);
  } catch (error) {
    console.warn("[OnboardingTracker] Failed to clear state:", error);
  }
}
