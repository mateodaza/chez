import { supabase } from "@/lib/supabase";

/**
 * Track an analytics event via Edge Function
 * Fails silently - analytics should never break the app
 */
export const trackEvent = async (
  eventName: string,
  properties?: Record<string, unknown>
): Promise<void> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Skip if not logged in
    if (!session) return;

    await supabase.functions.invoke("track-event", {
      body: { event_name: eventName, properties },
    });
  } catch (error) {
    // Fail silently - analytics shouldn't break the app
    console.warn("Analytics error:", error);
  }
};

export const AnalyticsEvents = {
  // Auth events
  USER_SIGNED_UP: "user_signed_up",
  USER_SIGNED_IN: "user_signed_in",

  // Recipe events
  RECIPE_IMPORTED: "recipe_imported",
  RECIPE_VIEWED: "recipe_viewed",
  RECIPE_DELETED: "recipe_deleted",

  // Cooking events
  COOK_STARTED: "cook_started",
  COOK_COMPLETED: "cook_completed",
  COOK_ABANDONED: "cook_abandoned",

  // Chat events
  CHAT_MESSAGE_SENT: "chat_message_sent",

  // Learning events
  MY_VERSION_CREATED: "my_version_created",
  LEARNING_DETECTED: "learning_detected",

  // Subscription events
  PAYWALL_SHOWN: "paywall_shown",
  SUBSCRIPTION_STARTED: "subscription_started",

  // Onboarding events
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_SKIPPED: "onboarding_skipped",

  // Shipyard loop events
  SMART_SHARE_SENT: "smart_share_sent",
  COOK_PHOTO_UPLOADED: "cook_photo_uploaded",
  COMPLETED_MEALS_VIEWED: "completed_meals_viewed",
  CREATOR_CHALLENGE_VIEWED: "creator_challenge_viewed",
  CREATOR_CHALLENGE_RECIPE_COMPLETED: "creator_challenge_recipe_completed",
  MEAL_PLAN_STARTED: "meal_plan_started",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export const Analytics = {
  /** Generic event tracking */
  trackEvent,

  /** Track recipe import with source info */
  recipeImported: (source: "tiktok" | "instagram" | "youtube" | "manual") =>
    trackEvent(AnalyticsEvents.RECIPE_IMPORTED, { source }),

  /** Track cook session start */
  cookStarted: (recipeId: string, mode: "casual" | "chef") =>
    trackEvent(AnalyticsEvents.COOK_STARTED, { recipe_id: recipeId, mode }),

  /** Track cook session completion */
  cookCompleted: (recipeId: string, durationMinutes: number) =>
    trackEvent(AnalyticsEvents.COOK_COMPLETED, {
      recipe_id: recipeId,
      duration_minutes: durationMinutes,
    }),

  /** Track chat message with intent type */
  chatMessageSent: (intentType: string) =>
    trackEvent(AnalyticsEvents.CHAT_MESSAGE_SENT, { intent_type: intentType }),

  /** Track My Version creation */
  myVersionCreated: (recipeId: string, learningType: string) =>
    trackEvent(AnalyticsEvents.MY_VERSION_CREATED, {
      recipe_id: recipeId,
      learning_type: learningType,
    }),

  /** Track paywall view */
  paywallShown: (trigger: string) =>
    trackEvent(AnalyticsEvents.PAYWALL_SHOWN, { trigger }),

  /** Track subscription start */
  subscriptionStarted: (plan: string) =>
    trackEvent(AnalyticsEvents.SUBSCRIPTION_STARTED, { plan }),

  /** Track smart share sent */
  smartShareSent: (
    recipeId: string,
    context: "recipe_detail" | "post_completion"
  ) =>
    trackEvent(AnalyticsEvents.SMART_SHARE_SENT, {
      recipe_id: recipeId,
      context,
    }),

  /** Track cook photo uploaded */
  cookPhotoUploaded: (sessionId: string, recipeId: string) =>
    trackEvent(AnalyticsEvents.COOK_PHOTO_UPLOADED, {
      session_id: sessionId,
      recipe_id: recipeId,
    }),

  /** Track completed meals viewed */
  completedMealsViewed: () =>
    trackEvent(AnalyticsEvents.COMPLETED_MEALS_VIEWED),

  /** Track creator challenge viewed */
  creatorChallengeViewed: () =>
    trackEvent(AnalyticsEvents.CREATOR_CHALLENGE_VIEWED),

  /** Track creator challenge recipe completed */
  creatorChallengeRecipeCompleted: (recipeId: string, completedCount: number) =>
    trackEvent(AnalyticsEvents.CREATOR_CHALLENGE_RECIPE_COMPLETED, {
      recipe_id: recipeId,
      completed_count: completedCount,
    }),
};
