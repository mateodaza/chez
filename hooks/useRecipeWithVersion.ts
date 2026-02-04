/**
 * useRecipeWithVersion - Simplified version management hook
 *
 * Implements the "Original vs My Version" model:
 * - Original (v1): The imported/source recipe, always preserved
 * - My Version (v2): User's customized version with their learnings
 *
 * For outsourced (imported) recipes: Toggle between Original and My Version
 * For forked recipes: Single version, no toggle needed
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
export type CreationMode =
  | "import"
  | "edit"
  | "cook_session"
  | "source_apply"
  | "fork";

export interface CreateVersionParams {
  ingredients: VersionIngredient[];
  steps: VersionStep[];
  mode: CreationMode;
  changeNotes?: string;
  createdFromSessionId?: string | null;
  createdFromTitle?: string;
  basedOnSourceId?: string | null; // Override source attribution (for source_apply mode)
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

// UI-friendly ingredient/step types
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
  user_notes?: { type: string; content: string; added_at: string }[];
}

interface UseRecipeWithVersionReturn {
  // Core data
  recipe: MasterRecipe | null;

  // Simple version model
  originalVersion: RecipeVersion | null; // v1, always preserved
  myVersion: RecipeVersion | null; // v2 or null if none
  currentVersion: RecipeVersion | null; // What user is currently viewing

  // Flags
  hasMyVersion: boolean;
  isViewingOriginal: boolean;
  isOutsourcedRecipe: boolean; // Has source links (not forked)
  isForkedRecipe: boolean; // forked_from_id is set

  // Derived display data (from current version)
  ingredients: DisplayIngredient[];
  steps: DisplayStep[];
  sourceLinks: SourceLinkWithVideo[];

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  viewOriginal: () => void;
  viewMyVersion: () => void;
  updateOrCreateMyVersion: (
    params: CreateVersionParams
  ) => Promise<string | null>;
  updateVersionDirectly: (params: {
    ingredients: VersionIngredient[];
    steps: VersionStep[];
    changeNotes?: string;
    prepTimeMinutes?: number | null;
    cookTimeMinutes?: number | null;
    servings?: number | null;
  }) => Promise<void>;
  updateRecipeMetadata: (params: {
    title?: string;
    description?: string | null;
    cuisine?: string | null;
  }) => Promise<void>;
  forkAsNewRecipe: () => Promise<string | null>;
  refetch: () => Promise<void>;

  // Legacy compatibility (deprecated - will be removed)
  /** @deprecated Use originalVersion or myVersion instead */
  activeVersion: RecipeVersion | null;
  /** @deprecated Use currentVersion instead */
  previewedVersion: RecipeVersion | null;
  /** @deprecated No longer needed with simplified model */
  allVersions: RecipeVersion[];
  /** @deprecated Use viewOriginal/viewMyVersion instead */
  previewVersion: (versionId: string) => Promise<void>;
  /** @deprecated No longer supported - use updateOrCreateMyVersion */
  makeActive: (versionId: string) => Promise<void>;
  /** @deprecated Use updateOrCreateMyVersion instead */
  createVersion: (
    params: CreateVersionParams & {
      parentVersionId: string;
      basedOnSourceId?: string | null;
    }
  ) => Promise<string | null>;
  /** @deprecated No longer supported in simplified model */
  deleteVersion: (versionId: string) => Promise<boolean>;
  /** @deprecated Use !isViewingOriginal instead */
  isPreviewingDifferentVersion: boolean;
}

export function useRecipeWithVersion(
  recipeId: string | undefined,
  initialVersionId?: string
): UseRecipeWithVersionReturn {
  // Core state
  const [recipe, setRecipe] = useState<MasterRecipe | null>(null);
  const [allVersions, setAllVersions] = useState<RecipeVersion[]>([]);
  const [sourceLinks, setSourceLinks] = useState<SourceLinkWithVideo[]>([]);
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
  // Track version NUMBER user chose (1 or 2) - survives refetch
  const [userSelectedVersionNumber, setUserSelectedVersionNumber] = useState<
    1 | 2 | null
  >(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if we've done initial fetch
  const hasFetchedRef = useRef(false);

  // Derived version data
  const originalVersion = useMemo(
    () => allVersions.find((v) => v.version_number === 1) || null,
    [allVersions]
  );

  const myVersion = useMemo(
    () => allVersions.find((v) => v.version_number === 2) || null,
    [allVersions]
  );

  const currentVersion = useMemo(() => {
    // Priority 1: User explicitly selected a version number (survives refetch)
    if (userSelectedVersionNumber === 1) return originalVersion;
    if (userSelectedVersionNumber === 2 && myVersion) return myVersion;

    // Priority 2: viewingVersionId (for initial load from params)
    if (viewingVersionId) {
      return (
        allVersions.find((v) => v.id === viewingVersionId) || originalVersion
      );
    }
    // Default to my version if it exists, otherwise original
    return myVersion || originalVersion;
  }, [
    userSelectedVersionNumber,
    viewingVersionId,
    allVersions,
    myVersion,
    originalVersion,
  ]);

  // Flags
  const hasMyVersion = myVersion !== null;
  // isViewingOriginal: check user selection first, then fall back to ID comparison
  const isViewingOriginal =
    userSelectedVersionNumber === 1 ||
    (userSelectedVersionNumber === null &&
      currentVersion?.id === originalVersion?.id);
  const isForkedRecipe = !!recipe?.forked_from_id;
  const isOutsourcedRecipe = sourceLinks.length > 0 && !isForkedRecipe;

  /**
   * Fetch all versions for a recipe
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
        learnings,
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
        .order("version_number", { ascending: true });

      if (error) {
        console.error(
          "[useRecipeWithVersion] Failed to fetch versions:",
          error
        );
        return [];
      }

      return (data as RecipeVersion[]) || [];
    },
    []
  );

  /**
   * Main fetch function
   */
  const refetch = useCallback(async () => {
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

      // 3. Determine which version to view
      if (initialVersionId) {
        const validVersion = versions.find((v) => v.id === initialVersionId);
        if (validVersion) {
          setViewingVersionId(initialVersionId);
        } else {
          // Fall back to current_version_id or latest
          setViewingVersionId(
            masterRecipe.current_version_id ||
              versions[versions.length - 1]?.id ||
              null
          );
        }
      } else if (masterRecipe.current_version_id) {
        setViewingVersionId(masterRecipe.current_version_id);
      } else if (versions.length > 0) {
        // Default to latest version (my version if exists, else original)
        const v2 = versions.find((v) => v.version_number === 2);
        const v1 = versions.find((v) => v.version_number === 1);
        setViewingVersionId(v2?.id || v1?.id || versions[0].id);
      }

      // Error state if no versions exist
      if (versions.length === 0) {
        setError("Recipe has no versions");
        return;
      }

      // 4. Fetch source links
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
  }, [recipeId, initialVersionId, fetchAllVersions]);

  /**
   * View the original version (v1)
   */
  const viewOriginal = useCallback(() => {
    if (originalVersion) {
      setUserSelectedVersionNumber(1);
      setViewingVersionId(originalVersion.id);
    }
  }, [originalVersion]);

  /**
   * View My Version (v2)
   */
  const viewMyVersion = useCallback(() => {
    if (myVersion) {
      setUserSelectedVersionNumber(2);
      setViewingVersionId(myVersion.id);
    }
  }, [myVersion]);

  /**
   * Create or update My Version (v2) - UPSERT operation
   * Always starts from Original (v1) + applies new learnings
   */
  const updateOrCreateMyVersion = useCallback(
    async (params: CreateVersionParams): Promise<string | null> => {
      if (!recipeId || !recipe || !originalVersion) {
        console.error(
          "[useRecipeWithVersion] Cannot create version: missing recipe or original version"
        );
        return null;
      }

      // Validate data
      if (!params.ingredients.length || !params.steps.length) {
        Alert.alert(
          "Cannot Save",
          "Recipe data is incomplete. Please try refreshing the page."
        );
        return null;
      }

      try {
        const createdFromTitle =
          params.createdFromTitle ||
          (params.mode === "cook_session"
            ? "From Cook Session"
            : params.mode === "edit"
              ? "Manual Edit"
              : "My Version");

        // UPSERT v2: Create if doesn't exist, replace if it does
        const versionData: TablesInsert<"master_recipe_versions"> = {
          master_recipe_id: recipeId,
          version_number: 2,
          title: originalVersion.title,
          description: originalVersion.description,
          mode: originalVersion.mode,
          cuisine: originalVersion.cuisine,
          category: originalVersion.category,
          prep_time_minutes: originalVersion.prep_time_minutes,
          cook_time_minutes: originalVersion.cook_time_minutes,
          servings: originalVersion.servings,
          servings_unit: originalVersion.servings_unit,
          ingredients: params.ingredients as unknown as Json,
          steps: params.steps as unknown as Json,
          change_notes: params.changeNotes || null,
          parent_version_id: originalVersion.id,
          // Use provided source ID, or preserve existing myVersion's source, or fall back to original's
          based_on_source_id:
            params.basedOnSourceId !== undefined
              ? params.basedOnSourceId
              : (myVersion?.based_on_source_id ??
                originalVersion.based_on_source_id),
          created_from_mode: params.mode,
          created_from_session_id: params.createdFromSessionId || null,
          created_from_title: createdFromTitle,
        };

        // Use upsert with onConflict for race condition safety
        const { data: upsertedVersion, error: upsertError } = await supabase
          .from("master_recipe_versions")
          .upsert(versionData, {
            onConflict: "master_recipe_id,version_number",
          })
          .select("id")
          .single();

        if (upsertError) throw upsertError;
        if (!upsertedVersion?.id) throw new Error("Failed to create version");

        // Update master recipe to point to v2
        const { error: updateError } = await supabase
          .from("master_recipes")
          .update({ current_version_id: upsertedVersion.id })
          .eq("id", recipeId);

        if (updateError) throw updateError;

        // Refetch to update all state
        await refetch();

        // Switch to viewing the new version (My Version = v2)
        setUserSelectedVersionNumber(2);
        setViewingVersionId(upsertedVersion.id);

        return upsertedVersion.id;
      } catch (err) {
        console.error(
          "[useRecipeWithVersion] Failed to create/update version:",
          err
        );
        Alert.alert("Error", "Failed to save changes");
        return null;
      }
    },
    [recipeId, recipe, originalVersion, myVersion, refetch]
  );

  /**
   * Directly update the current version (for forked recipes / My Cookbook edit mode)
   * Forked recipes only have v1, so we update it in place
   */
  const updateVersionDirectly = useCallback(
    async (params: {
      ingredients: VersionIngredient[];
      steps: VersionStep[];
      changeNotes?: string;
      prepTimeMinutes?: number | null;
      cookTimeMinutes?: number | null;
      servings?: number | null;
    }): Promise<void> => {
      if (!currentVersion) {
        throw new Error("No version to update");
      }

      // Validate data
      if (!params.ingredients.length || !params.steps.length) {
        Alert.alert(
          "Cannot Save",
          "Recipe data is incomplete. Please try refreshing the page."
        );
        return;
      }

      try {
        const updateData: Record<string, unknown> = {
          ingredients: params.ingredients as unknown as Json,
          steps: params.steps as unknown as Json,
          change_notes: params.changeNotes || null,
        };

        // Only include time/servings if explicitly provided
        if (params.prepTimeMinutes !== undefined) {
          updateData.prep_time_minutes = params.prepTimeMinutes;
        }
        if (params.cookTimeMinutes !== undefined) {
          updateData.cook_time_minutes = params.cookTimeMinutes;
        }
        if (params.servings !== undefined) {
          updateData.servings = params.servings;
        }

        const { error } = await supabase
          .from("master_recipe_versions")
          .update(updateData)
          .eq("id", currentVersion.id);

        if (error) throw error;

        // Refetch to update all state
        await refetch();
      } catch (err) {
        console.error(
          "[useRecipeWithVersion] Failed to update version directly:",
          err
        );
        Alert.alert("Error", "Failed to save changes");
        throw err;
      }
    },
    [currentVersion, refetch]
  );

  /**
   * Update recipe metadata (title, description, cuisine) on master_recipes table
   * Used in My Cookbook edit mode
   */
  const updateRecipeMetadata = useCallback(
    async (params: {
      title?: string;
      description?: string | null;
      cuisine?: string | null;
    }): Promise<void> => {
      if (!recipeId) {
        throw new Error("No recipe to update");
      }

      try {
        const updateData: Record<string, unknown> = {};

        if (params.title !== undefined) {
          updateData.title = params.title.trim();
        }
        if (params.description !== undefined) {
          updateData.description = params.description?.trim() || null;
        }
        if (params.cuisine !== undefined) {
          updateData.cuisine = params.cuisine?.trim() || null;
        }

        if (Object.keys(updateData).length === 0) return;

        const { error } = await supabase
          .from("master_recipes")
          .update(updateData)
          .eq("id", recipeId);

        if (error) throw error;

        // Refetch to update all state
        await refetch();
      } catch (err) {
        console.error(
          "[useRecipeWithVersion] Failed to update recipe metadata:",
          err
        );
        Alert.alert("Error", "Failed to save changes");
        throw err;
      }
    },
    [recipeId, refetch]
  );

  /**
   * Fork the current recipe as a new standalone recipe
   * Creates a copy without source links or version toggle
   */
  const forkAsNewRecipe = useCallback(async (): Promise<string | null> => {
    if (!recipe || !currentVersion) {
      console.error("[useRecipeWithVersion] Cannot fork: no recipe or version");
      return null;
    }

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in to save to your cookbook");
        return null;
      }

      // 1. Create new master_recipe
      const { data: newRecipe, error: recipeError } = await supabase
        .from("master_recipes")
        .insert({
          user_id: user.id,
          title: `${recipe.title} (Copy)`,
          description: recipe.description,
          mode: recipe.mode,
          cuisine: recipe.cuisine,
          category: recipe.category,
          forked_from_id: recipe.id,
          // NO cover_video_source_id - forked recipes have no sources
        })
        .select("id")
        .single();

      if (recipeError) throw recipeError;
      if (!newRecipe?.id) throw new Error("Failed to create forked recipe");

      // 2. Create v1 for forked recipe (its only version)
      const { data: newVersion, error: versionError } = await supabase
        .from("master_recipe_versions")
        .insert({
          master_recipe_id: newRecipe.id,
          version_number: 1,
          title: currentVersion.title,
          description: currentVersion.description,
          mode: currentVersion.mode,
          cuisine: currentVersion.cuisine,
          category: currentVersion.category,
          ingredients: currentVersion.ingredients,
          steps: currentVersion.steps,
          prep_time_minutes: currentVersion.prep_time_minutes,
          cook_time_minutes: currentVersion.cook_time_minutes,
          servings: currentVersion.servings,
          servings_unit: currentVersion.servings_unit,
          created_from_mode: "fork",
          created_from_title: `Saved from ${recipe.title}`,
          // NO based_on_source_id - forked recipes have no sources
        })
        .select("id")
        .single();

      if (versionError) throw versionError;
      if (!newVersion?.id)
        throw new Error("Failed to create version for forked recipe");

      // 3. Set current_version_id
      const { error: updateError } = await supabase
        .from("master_recipes")
        .update({ current_version_id: newVersion.id })
        .eq("id", newRecipe.id);

      if (updateError) throw updateError;

      return newRecipe.id;
    } catch (err) {
      console.error("[useRecipeWithVersion] Failed to fork recipe:", err);
      Alert.alert("Error", "Failed to create copy of recipe");
      return null;
    }
  }, [recipe, currentVersion]);

  // Initial fetch
  useEffect(() => {
    if (recipeId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      refetch();
    }
  }, [recipeId, refetch]);

  // Derive display data from current version
  const ingredients: DisplayIngredient[] =
    (currentVersion?.ingredients as unknown as VersionIngredient[])?.map(
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
    (currentVersion?.steps as unknown as VersionStep[])?.map((step, idx) => ({
      id: step.id || `step-${idx}`,
      step_number: step.step_number,
      instruction: step.instruction,
      duration_minutes: step.duration_minutes,
      temperature_value: step.temperature_value,
      temperature_unit: step.temperature_unit,
      equipment: step.equipment ?? [],
      techniques: step.techniques ?? [],
      timer_label: step.timer_label ?? null,
      user_notes: step.user_notes ?? [],
    })) || [];

  // ==========================================
  // Legacy compatibility layer (deprecated)
  // ==========================================

  const previewVersion = useCallback(
    async (versionId: string) => {
      const version = allVersions.find((v) => v.id === versionId);
      if (version) {
        setViewingVersionId(versionId);
      }
    },
    [allVersions]
  );

  const makeActive = useCallback(
    async (versionId: string) => {
      if (!recipeId) return;
      try {
        await supabase
          .from("master_recipes")
          .update({ current_version_id: versionId })
          .eq("id", recipeId);
        await refetch();
      } catch (err) {
        console.error("[useRecipeWithVersion] Failed to make active:", err);
      }
    },
    [recipeId, refetch]
  );

  const createVersion = useCallback(
    async (
      params: CreateVersionParams & {
        parentVersionId: string;
        basedOnSourceId?: string | null;
      }
    ): Promise<string | null> => {
      // Redirect to updateOrCreateMyVersion
      return updateOrCreateMyVersion(params);
    },
    [updateOrCreateMyVersion]
  );

  const deleteVersion = useCallback(
    async (_versionId: string): Promise<boolean> => {
      Alert.alert(
        "Not Supported",
        "Version deletion is not available in the simplified version model."
      );
      return false;
    },
    []
  );

  return {
    // Core
    recipe,

    // Simple version model
    originalVersion,
    myVersion,
    currentVersion,

    // Flags
    hasMyVersion,
    isViewingOriginal,
    isOutsourcedRecipe,
    isForkedRecipe,

    // Display data
    ingredients,
    steps,
    sourceLinks,

    // State
    isLoading,
    error,

    // Actions
    viewOriginal,
    viewMyVersion,
    updateOrCreateMyVersion,
    updateVersionDirectly,
    updateRecipeMetadata,
    forkAsNewRecipe,
    refetch,

    // Legacy compatibility (deprecated)
    activeVersion: myVersion || originalVersion,
    previewedVersion: currentVersion,
    allVersions,
    previewVersion,
    makeActive,
    createVersion,
    deleteVersion,
    isPreviewingDifferentVersion: !isViewingOriginal,
  };
}
