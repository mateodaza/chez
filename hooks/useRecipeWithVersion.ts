/**
 * useRecipeWithVersion - Centralized hook for recipe and version data
 *
 * This hook replaces duplicate fetch logic across recipe detail and cook mode screens.
 * It handles the FK join bug by fetching version data separately.
 *
 * State Persistence:
 * - activeVersionId = master_recipes.current_version_id (persisted in DB)
 * - previewedVersionId = UI state only (never persisted, resets on mount)
 *
 * Fallback Order:
 * 1. If versionId param provided -> fetch that specific version
 * 2. If invalid/missing -> fall back to recipe.current_version_id
 * 3. If current_version_id is null -> show error state
 * 4. On any fetch error -> show toast + fall back to latest
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import type {
  Json,
  MasterRecipe,
  MasterRecipeVersion,
  RecipeSourceLink,
  VideoSource,
  VersionIngredient,
  VersionStep,
  TablesInsert,
} from "@/types/database";

// Types for version creation
export type CreationMode = "import" | "edit" | "cook_session" | "source_apply";

export interface CreateVersionParams {
  ingredients: VersionIngredient[];
  steps: VersionStep[];
  mode: CreationMode;
  changeNotes?: string;
  parentVersionId: string;
  basedOnSourceId?: string | null;
  createdFromSessionId?: string | null;
  createdFromTitle?: string;
}

// Extended types
export interface RecipeVersion extends MasterRecipeVersion {
  parent_version_id: string | null;
  created_from_mode: string | null;
  created_from_session_id: string | null;
  created_from_title: string | null;
}

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

// UI-friendly ingredient/step types (includes all fields for version creation)
export interface DisplayIngredient {
  id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  is_optional: boolean | null;
  sort_order: number | null;
  original_text: string | null;
  confidence_status: string | null;
  user_verified: boolean | null;
  grocery_category: string | null;
  allergens: string[];
}

export interface DisplayStep {
  id: string;
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  temperature_value: number | null;
  temperature_unit: string | null;
  equipment: string[];
  techniques: string[];
  timer_label: string | null;
}

interface UseRecipeWithVersionReturn {
  // Core data
  recipe: MasterRecipe | null;
  activeVersion: RecipeVersion | null;
  previewedVersion: RecipeVersion | null;
  allVersions: RecipeVersion[];
  sourceLinks: SourceLinkWithVideo[];

  // Derived display data (from previewed version)
  ingredients: DisplayIngredient[];
  steps: DisplayStep[];

  // State
  isLoading: boolean;
  error: string | null;
  isPreviewingDifferentVersion: boolean;

  // Actions
  previewVersion: (versionId: string) => Promise<void>;
  makeActive: (versionId: string) => Promise<void>;
  createVersion: (params: CreateVersionParams) => Promise<string | null>;
  deleteVersion: (versionId: string) => Promise<boolean>;
  refetch: (showFallbackToast?: boolean) => Promise<void>;
}

export function useRecipeWithVersion(
  recipeId: string | undefined,
  initialVersionId?: string
): UseRecipeWithVersionReturn {
  // Core state
  const [recipe, setRecipe] = useState<MasterRecipe | null>(null);
  const [activeVersion, setActiveVersion] = useState<RecipeVersion | null>(
    null
  );
  const [previewedVersion, setPreviewedVersion] =
    useState<RecipeVersion | null>(null);
  const [allVersions, setAllVersions] = useState<RecipeVersion[]>([]);
  const [sourceLinks, setSourceLinks] = useState<SourceLinkWithVideo[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if we've done initial fetch
  const hasFetchedRef = useRef(false);

  /**
   * Fetch a single version by ID
   * Avoids FK join bug by direct query
   */
  const fetchVersion = useCallback(
    async (versionId: string): Promise<RecipeVersion | null> => {
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
        console.error("[useRecipeWithVersion] Failed to fetch version:", error);
        return null;
      }

      return data as RecipeVersion;
    },
    []
  );

  /**
   * Fetch all versions for a recipe (for dropdown)
   */
  const fetchAllVersions = useCallback(
    async (masterRecipeId: string): Promise<RecipeVersion[]> => {
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
        console.error(
          "[useRecipeWithVersion] Failed to fetch all versions:",
          error
        );
        return [];
      }

      return (data as RecipeVersion[]) || [];
    },
    []
  );

  /**
   * Main fetch function with fallback logic
   */
  const refetch = useCallback(
    async (showFallbackToast = false) => {
      if (!recipeId) return;

      try {
        setIsLoading(true);
        setError(null);

        // 1. Fetch master recipe
        const { data: masterRecipe, error: recipeError } = await supabase
          .from("master_recipes")
          .select("*")
          .eq("id", recipeId)
          .single();

        if (recipeError) throw recipeError;
        setRecipe(masterRecipe);

        // 2. Fetch all versions
        const versions = await fetchAllVersions(recipeId);
        setAllVersions(versions);

        // 3. Determine which version to show (fallback order)
        let targetVersionId = initialVersionId;
        let usedFallback = false;

        // If initialVersionId provided, validate it exists
        if (targetVersionId) {
          const validVersion = versions.find((v) => v.id === targetVersionId);
          if (!validVersion) {
            console.warn(
              "[useRecipeWithVersion] Provided versionId not found, falling back"
            );
            targetVersionId = undefined;
            usedFallback = true;
          }
        }

        // Fallback to current_version_id
        if (!targetVersionId && masterRecipe.current_version_id) {
          targetVersionId = masterRecipe.current_version_id;
        }

        // Final fallback: latest version
        if (!targetVersionId && versions.length > 0) {
          targetVersionId = versions[0].id;
          usedFallback = true;
        }

        // Error state if no versions exist
        if (!targetVersionId) {
          setError("Recipe has no versions");
          return;
        }

        // 4. Fetch the target version
        const version = await fetchVersion(targetVersionId);
        if (!version) {
          // Fallback to latest if target version fetch fails
          if (versions.length > 0) {
            const latestVersion = await fetchVersion(versions[0].id);
            if (latestVersion) {
              setActiveVersion(latestVersion);
              setPreviewedVersion(latestVersion);
              usedFallback = true;
            } else {
              setError("Failed to load recipe version");
              return;
            }
          } else {
            setError("Failed to load recipe version");
            return;
          }
        } else {
          // Set active version from DB (current_version_id)
          if (masterRecipe.current_version_id) {
            const active =
              versions.find((v) => v.id === masterRecipe.current_version_id) ||
              version;
            setActiveVersion(active);
          } else {
            setActiveVersion(version);
          }

          // Set previewed version (what user is viewing)
          setPreviewedVersion(version);
        }

        // Show fallback toast if needed
        if (usedFallback && showFallbackToast) {
          Alert.alert(
            "Version Notice",
            "Couldn't load that version \u2014 showing latest."
          );
        }

        // 5. Fetch source links
        const { data: links, error: linksError } = await supabase
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
          .eq("master_recipe_id", recipeId)
          .eq("link_status", "linked");

        if (!linksError) {
          setSourceLinks((links as SourceLinkWithVideo[]) || []);
        }
      } catch (err) {
        console.error("[useRecipeWithVersion] Fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setIsLoading(false);
      }
    },
    [recipeId, initialVersionId, fetchVersion, fetchAllVersions]
  );

  /**
   * Preview a different version (UI state only, not persisted)
   */
  const previewVersion = useCallback(
    async (versionId: string) => {
      const version = allVersions.find((v) => v.id === versionId);
      if (version) {
        setPreviewedVersion(version);
      } else {
        // Version not in cache, fetch it
        const fetchedVersion = await fetchVersion(versionId);
        if (fetchedVersion) {
          setPreviewedVersion(fetchedVersion);
        }
      }
    },
    [allVersions, fetchVersion]
  );

  /**
   * Make a version the active version (persisted to DB)
   */
  const makeActive = useCallback(
    async (versionId: string) => {
      if (!recipeId) return;

      try {
        const { error: updateError } = await supabase
          .from("master_recipes")
          .update({ current_version_id: versionId })
          .eq("id", recipeId);

        if (updateError) throw updateError;

        // Update local state
        const version = allVersions.find((v) => v.id === versionId);
        if (version) {
          setActiveVersion(version);
          setPreviewedVersion(version);
        }

        // Refetch to ensure consistency
        await refetch();
      } catch (err) {
        console.error(
          "[useRecipeWithVersion] Failed to make version active:",
          err
        );
        Alert.alert("Error", "Failed to set active version");
      }
    },
    [recipeId, allVersions, refetch]
  );

  /**
   * Create a new version with proper lineage tracking
   * Returns the new version ID or null on failure
   */
  const createVersion = useCallback(
    async (params: CreateVersionParams): Promise<string | null> => {
      if (!recipeId || !recipe) return null;

      // Validate data
      if (!params.ingredients.length || !params.steps.length) {
        Alert.alert(
          "Cannot Save",
          "Recipe data is incomplete. Please try refreshing the page."
        );
        return null;
      }

      try {
        // Get next version number
        const { data: nextVersionNum } = await supabase.rpc(
          "get_next_version_number",
          {
            p_master_recipe_id: recipeId,
          }
        );

        const versionNumber = nextVersionNum ?? allVersions.length + 1;

        // Auto-generate title if not provided
        const createdFromTitle =
          params.createdFromTitle ||
          (params.mode === "cook_session"
            ? "From Cook Session"
            : params.mode === "edit"
              ? "Manual Edit"
              : params.mode === "source_apply"
                ? "From Source"
                : "New Version");

        // Insert new version
        const versionInsert: TablesInsert<"master_recipe_versions"> = {
          master_recipe_id: recipeId,
          version_number: versionNumber,
          title: recipe.title,
          description: recipe.description,
          mode: recipe.mode,
          cuisine: recipe.cuisine,
          category: recipe.category,
          ingredients: params.ingredients as unknown as Json,
          steps: params.steps as unknown as Json,
          change_notes: params.changeNotes || null,
          parent_version_id: params.parentVersionId,
          based_on_source_id: params.basedOnSourceId || null,
          created_from_mode: params.mode,
          created_from_session_id: params.createdFromSessionId || null,
          created_from_title: createdFromTitle,
        };

        const { data: newVersion, error: insertError } = await supabase
          .from("master_recipe_versions")
          .insert(versionInsert)
          .select("id")
          .single();

        if (insertError) throw insertError;

        // Update master recipe to point to new version
        const { error: updateError } = await supabase
          .from("master_recipes")
          .update({ current_version_id: newVersion.id })
          .eq("id", recipeId);

        if (updateError) throw updateError;

        // Refetch to update all state
        await refetch();

        return newVersion.id;
      } catch (err) {
        console.error("[useRecipeWithVersion] Failed to create version:", err);
        Alert.alert("Error", "Failed to save changes");
        return null;
      }
    },
    [recipeId, recipe, allVersions, refetch]
  );

  /**
   * Delete a version (with safety checks)
   * Returns true if successful, false otherwise
   */
  const deleteVersion = useCallback(
    async (versionId: string): Promise<boolean> => {
      if (!recipeId) return false;

      // Safety check: Can't delete the only version
      if (allVersions.length <= 1) {
        Alert.alert(
          "Cannot Delete",
          "You can't delete the only version of this recipe."
        );
        return false;
      }

      // Safety check: Can't delete active version directly
      if (activeVersion?.id === versionId) {
        Alert.alert(
          "Cannot Delete",
          "You can't delete the active version. Please make another version active first."
        );
        return false;
      }

      // Safety check: Can't delete the original import (v1)
      const versionToDelete = allVersions.find((v) => v.id === versionId);
      if (versionToDelete?.version_number === 1) {
        Alert.alert(
          "Cannot Delete",
          "You can't delete the original import. Only versions created from cooking or editing can be deleted."
        );
        return false;
      }

      try {
        // Delete the version
        const { error: deleteError } = await supabase
          .from("master_recipe_versions")
          .delete()
          .eq("id", versionId);

        if (deleteError) throw deleteError;

        // Renumber remaining versions sequentially
        const remainingVersions = allVersions
          .filter((v) => v.id !== versionId)
          .sort(
            (a, b) =>
              new Date(a.created_at || 0).getTime() -
              new Date(b.created_at || 0).getTime()
          );

        for (let i = 0; i < remainingVersions.length; i++) {
          const expectedNumber = i + 1;
          if (remainingVersions[i].version_number !== expectedNumber) {
            await supabase
              .from("master_recipe_versions")
              .update({ version_number: expectedNumber })
              .eq("id", remainingVersions[i].id);
          }
        }

        // If we were previewing the deleted version, switch to active
        if (previewedVersion?.id === versionId && activeVersion) {
          setPreviewedVersion(activeVersion);
        }

        // Refetch to update all state
        await refetch();

        return true;
      } catch (err) {
        console.error("[useRecipeWithVersion] Failed to delete version:", err);
        Alert.alert("Error", "Failed to delete version");
        return false;
      }
    },
    [recipeId, allVersions, activeVersion, previewedVersion, refetch]
  );

  // Initial fetch
  useEffect(() => {
    if (recipeId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      refetch();
    }
  }, [recipeId, refetch]);

  // Derive display data from previewed version
  const ingredients: DisplayIngredient[] =
    (previewedVersion?.ingredients as unknown as VersionIngredient[])?.map(
      (ing, idx) => ({
        id: ing.id || `ing-${idx}`,
        item: ing.item,
        quantity: ing.quantity,
        unit: ing.unit,
        preparation: ing.preparation,
        is_optional: ing.is_optional,
        sort_order: ing.sort_order ?? idx,
        original_text: ing.original_text,
        confidence_status: ing.confidence_status,
        user_verified: ing.user_verified,
        grocery_category: ing.grocery_category ?? null,
        allergens: ing.allergens ?? [],
      })
    ) || [];

  const steps: DisplayStep[] =
    (previewedVersion?.steps as unknown as VersionStep[])?.map((step, idx) => ({
      id: step.id || `step-${idx}`,
      step_number: step.step_number,
      instruction: step.instruction,
      duration_minutes: step.duration_minutes,
      temperature_value: step.temperature_value,
      temperature_unit: step.temperature_unit,
      equipment: step.equipment ?? [],
      techniques: step.techniques ?? [],
      timer_label: step.timer_label ?? null,
    })) || [];

  // Check if previewing a different version than active
  const isPreviewingDifferentVersion =
    activeVersion?.id !== previewedVersion?.id;

  return {
    recipe,
    activeVersion,
    previewedVersion,
    allVersions,
    sourceLinks,
    ingredients,
    steps,
    isLoading,
    error,
    isPreviewingDifferentVersion,
    previewVersion,
    makeActive,
    createVersion,
    deleteVersion,
    refetch,
  };
}
