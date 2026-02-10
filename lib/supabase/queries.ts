/**
 * Centralized query helpers for recipe data
 *
 * These helpers avoid the FK join bug with PostgREST by using
 * separate queries instead of !fk_name syntax.
 *
 * FK Join Bug:
 * PostgREST's !fk_name syntax doesn't work correctly for parent->child FK relationships
 * (e.g., master_recipes.current_version_id -> master_recipe_versions.id)
 * It returns undefined/null even when the data exists.
 *
 * Solution: Use separate queries and combine in application code.
 */

import { supabase } from "./client";
import type {
  Database,
  MasterRecipe,
  MasterRecipeVersion,
  RecipeSourceLink,
  VideoSource,
} from "@/types/database";

// Extended version type with lineage columns
export interface RecipeVersionWithLineage extends MasterRecipeVersion {
  parent_version_id: string | null;
  created_from_mode: string | null;
  created_from_session_id: string | null;
  created_from_title: string | null;
}

// Source link with joined video data
export interface SourceLinkWithVideo extends RecipeSourceLink {
  video_sources: Pick<
    VideoSource,
    | "id"
    | "source_url"
    | "source_platform"
    | "source_creator"
    | "source_thumbnail_url"
  > | null;
}

/**
 * Fetch a single recipe version by ID
 * Use this instead of FK join from master_recipes
 */
export async function fetchRecipeVersion(
  versionId: string
): Promise<RecipeVersionWithLineage | null> {
  const { data, error } = await supabase
    .from("master_recipe_versions")
    .select(
      `
      id,
      version_number,
      title,
      description,
      mode,
      cuisine,
      category,
      prep_time_minutes,
      cook_time_minutes,
      servings,
      servings_unit,
      difficulty_score,
      ingredients,
      steps,
      change_notes,
      based_on_source_id,
      parent_version_id,
      created_from_mode,
      created_from_session_id,
      created_from_title,
      outcome_rating,
      outcome_notes,
      created_at,
      master_recipe_id
    `
    )
    .eq("id", versionId)
    .single();

  if (error) {
    console.error("[queries] fetchRecipeVersion error:", error);
    return null;
  }

  return data as RecipeVersionWithLineage;
}

/**
 * Fetch all versions for a master recipe
 * Ordered by version_number descending (newest first)
 */
export async function fetchAllVersions(
  masterRecipeId: string
): Promise<RecipeVersionWithLineage[]> {
  const { data, error } = await supabase
    .from("master_recipe_versions")
    .select(
      `
      id,
      version_number,
      title,
      description,
      mode,
      cuisine,
      category,
      prep_time_minutes,
      cook_time_minutes,
      servings,
      servings_unit,
      difficulty_score,
      ingredients,
      steps,
      change_notes,
      based_on_source_id,
      parent_version_id,
      created_from_mode,
      created_from_session_id,
      created_from_title,
      outcome_rating,
      outcome_notes,
      created_at,
      master_recipe_id
    `
    )
    .eq("master_recipe_id", masterRecipeId)
    .order("version_number", { ascending: false });

  if (error) {
    console.error("[queries] fetchAllVersions error:", error);
    return [];
  }

  return (data as RecipeVersionWithLineage[]) || [];
}

/**
 * Fetch a master recipe with its current version
 * This is the safe replacement for the FK join pattern
 */
export async function fetchRecipeWithCurrentVersion(recipeId: string): Promise<{
  recipe: MasterRecipe | null;
  currentVersion: RecipeVersionWithLineage | null;
  error: string | null;
}> {
  // 1. Fetch master recipe
  const { data: recipe, error: recipeError } = await supabase
    .from("master_recipes")
    .select("*")
    .eq("id", recipeId)
    .single();

  if (recipeError) {
    console.error(
      "[queries] fetchRecipeWithCurrentVersion error:",
      recipeError
    );
    return { recipe: null, currentVersion: null, error: recipeError.message };
  }

  // 2. Fetch current version separately (avoids FK join bug)
  let currentVersion: RecipeVersionWithLineage | null = null;
  if (recipe.current_version_id) {
    currentVersion = await fetchRecipeVersion(recipe.current_version_id);
  }

  return { recipe, currentVersion, error: null };
}

/**
 * Fetch source links for a recipe with video data
 * Only returns linked sources (not pending or rejected)
 */
export async function fetchSourceLinks(
  masterRecipeId: string
): Promise<SourceLinkWithVideo[]> {
  const { data, error } = await supabase
    .from("recipe_source_links")
    .select(
      `
      *,
      video_sources(
        id,
        source_url,
        source_platform,
        source_creator,
        source_thumbnail_url
      )
    `
    )
    .eq("master_recipe_id", masterRecipeId)
    .eq("link_status", "linked");

  if (error) {
    console.error("[queries] fetchSourceLinks error:", error);
    return [];
  }

  return (data as SourceLinkWithVideo[]) || [];
}

/**
 * Fetch a specific source link by ID with video data
 */
export async function fetchSourceLink(
  sourceLinkId: string
): Promise<SourceLinkWithVideo | null> {
  const { data, error } = await supabase
    .from("recipe_source_links")
    .select(
      `
      *,
      video_sources(
        id,
        source_url,
        source_platform,
        source_creator,
        source_thumbnail_url
      )
    `
    )
    .eq("id", sourceLinkId)
    .single();

  if (error) {
    console.error("[queries] fetchSourceLink error:", error);
    return null;
  }

  return data as SourceLinkWithVideo;
}

/**
 * Get the next version number for a recipe
 * Uses the RPC function for atomicity
 */
export async function getNextVersionNumber(
  masterRecipeId: string
): Promise<number> {
  const { data, error } = await supabase.rpc("get_next_version_number", {
    p_master_recipe_id: masterRecipeId,
  });

  if (error) {
    console.error("[queries] getNextVersionNumber error:", error);
    // Fallback: count existing versions + 1
    const versions = await fetchAllVersions(masterRecipeId);
    return versions.length + 1;
  }

  return data ?? 1;
}

/**
 * Update the active version for a recipe
 */
export async function setActiveVersion(
  recipeId: string,
  versionId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from("master_recipes")
    .update({ current_version_id: versionId })
    .eq("id", recipeId);

  if (error) {
    console.error("[queries] setActiveVersion error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Validate that version data is complete before creating
 */
export function validateVersionData(
  ingredients: unknown[],
  steps: unknown[]
): { valid: boolean; message: string | null } {
  if (!ingredients || ingredients.length === 0) {
    return {
      valid: false,
      message: "Cannot create version with no ingredients",
    };
  }

  if (!steps || steps.length === 0) {
    return { valid: false, message: "Cannot create version with no steps" };
  }

  return { valid: true, message: null };
}

// ============================================================================
// User Preferences Queries
// ============================================================================

export type UserPreferences =
  Database["public"]["Tables"]["user_preferences"]["Row"];
export type UserPreferencesInsert =
  Database["public"]["Tables"]["user_preferences"]["Insert"];

/**
 * Fetch user preferences by user ID
 * Returns null if no preferences exist (new user)
 */
export async function fetchUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[queries] fetchUserPreferences error:", error);
    throw error;
  }

  return data as UserPreferences | null;
}

/**
 * Upsert user preferences (create or update)
 * Uses user_id as the conflict key
 */
export async function upsertUserPreferences(
  userId: string,
  updates: Partial<UserPreferencesInsert> & { cooking_mode?: string }
): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[queries] upsertUserPreferences error:", error);
    throw error;
  }

  return data as UserPreferences;
}

/**
 * Ensure user exists in public.users table
 * This is needed because auth.users and public.users are separate,
 * and many tables have FK constraints to public.users
 */
export async function ensureUserExists(
  userId: string,
  email?: string
): Promise<void> {
  const { error } = await supabase.from("users").upsert(
    {
      id: userId,
      email: email || `user-${userId.substring(0, 8)}@temp.local`,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (error && error.code !== "23505") {
    // Ignore duplicate key errors
    console.error("[queries] ensureUserExists error:", error);
    throw error;
  }
}

// ============================================================================
// Completed Meals Queries
// ============================================================================

export interface CompletedMeal {
  sessionId: string;
  recipeId: string;
  recipeTitle: string;
  completedAt: string;
  photoPath: string | null;
  recipeThumbnailUrl: string | null;
  rating: number | null;
  notes: string | null;
  tags: string[];
}

/**
 * Fetch completed cook sessions for a user with optional photo
 * Only includes sessions where is_complete = true AND completed_at IS NOT NULL
 */
export async function fetchCompletedMeals(
  userId: string,
  limit = 20
): Promise<CompletedMeal[]> {
  const { data, error } = await supabase
    .from("cook_sessions")
    .select(
      `
      id,
      master_recipe_id,
      completed_at,
      outcome_rating,
      outcome_notes,
      outcome_tags,
      master_recipes!cook_sessions_master_recipe_id_fkey(title, cover_video_source_id),
      cook_session_photos(storage_path)
    `
    )
    .eq("user_id", userId)
    .eq("is_complete", true)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[queries] fetchCompletedMeals error:", error);
    return [];
  }

  // Collect cover_video_source_ids for batch thumbnail lookup
  const coverSourceIds = new Set<string>();
  (data || []).forEach((session) => {
    const recipe = session.master_recipes as unknown as {
      cover_video_source_id: string | null;
    } | null;
    if (recipe?.cover_video_source_id) {
      coverSourceIds.add(recipe.cover_video_source_id);
    }
  });

  // Batch fetch thumbnails from video_sources
  let thumbnailMap: Record<string, string> = {};
  if (coverSourceIds.size > 0) {
    const { data: videoData } = await supabase
      .from("video_sources")
      .select("id, source_thumbnail_url")
      .in("id", Array.from(coverSourceIds));
    if (videoData) {
      thumbnailMap = Object.fromEntries(
        videoData
          .filter((v) => v.source_thumbnail_url)
          .map((v) => [v.id, v.source_thumbnail_url!])
      );
    }
  }

  return (data || []).map((session) => {
    const recipe = session.master_recipes as unknown as {
      title: string;
      cover_video_source_id: string | null;
    } | null;
    const photos = session.cook_session_photos as unknown as
      | { storage_path: string }[]
      | null;
    const thumbnailUrl = recipe?.cover_video_source_id
      ? thumbnailMap[recipe.cover_video_source_id] || null
      : null;
    const raw = session as Record<string, unknown>;
    return {
      sessionId: session.id,
      recipeId: session.master_recipe_id || "",
      recipeTitle: recipe?.title || "Unknown Recipe",
      completedAt: session.completed_at || "",
      photoPath: photos?.[0]?.storage_path || null,
      recipeThumbnailUrl: thumbnailUrl,
      rating: raw.outcome_rating as number | null,
      notes: (raw.outcome_notes as string) || null,
      tags: (raw.outcome_tags as string[]) || [],
    };
  });
}
