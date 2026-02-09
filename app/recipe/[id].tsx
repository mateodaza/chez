import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Stack,
  useLocalSearchParams,
  router,
  useFocusEffect,
} from "expo-router";
import {
  ScrollView,
  View,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Linking,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Button, SkeletonRecipeDetail } from "@/components/ui";
import { CompareModal } from "@/components/CompareModal";
import { VersionToggle } from "@/components/VersionToggle";
import { SourceBrowserModal } from "@/components/SourceBrowserModal";
import { AddToGroceryModal } from "@/components/AddToGroceryModal";
import {
  colors,
  spacing,
  layout,
  borderRadius,
  fontFamily,
  fontSize,
} from "@/constants/theme";
import {
  useRecipeWithVersion,
  useGroceryList,
  useCookingModeWithLoading,
  useSubscription,
  type DisplayIngredient,
  type DisplayStep,
  type SourceLinkWithVideo,
} from "@/hooks";
import type {
  VersionIngredient,
  VersionStep,
  VersionLearning,
} from "@/types/database";
import { markSampleRecipeDismissed } from "@/lib/auth/sample-recipe-tracker";
import { SAMPLE_RECIPE_TITLE } from "@/lib/sample-recipe";
import { Analytics } from "@/lib/analytics";
import { shareRecipe } from "@/lib/share";

// Alias types from hook for local use
type Ingredient = DisplayIngredient;
type _Step = DisplayStep;

export default function RecipeDetailScreen() {
  const {
    id,
    edit,
    versionId: rawVersionId,
    source,
  } = useLocalSearchParams<{
    id: string;
    edit?: string;
    versionId?: string | string[];
    source?: string;
  }>();
  // Normalize versionId - could be string or string[] from deep links
  const versionId = Array.isArray(rawVersionId)
    ? rawVersionId[0]
    : rawVersionId;
  const insets = useSafeAreaInsets();
  const { isLoading: prefsLoading } = useCookingModeWithLoading();
  // Use subscription status for feature gating, not cooking mode preference
  const { isChef, isLoading: subLoading } = useSubscription();
  const isLoadingPrefs = prefsLoading || subLoading;
  const [refreshing, setRefreshing] = useState(false);

  // Use the centralized hook for recipe + version data
  const {
    recipe,
    originalVersion,
    myVersion, // Used for Compare modal - always compare My Version vs Source
    currentVersion,
    sourceLinks,
    ingredients,
    steps,
    isLoading: loading,
    error,
    hasMyVersion,
    isViewingOriginal,
    isOutsourcedRecipe,
    isForkedRecipe,
    viewOriginal,
    viewMyVersion,
    updateOrCreateMyVersion,
    updateVersionDirectly,
    updateRecipeMetadata,
    forkAsNewRecipe,
    refetch,
  } = useRecipeWithVersion(id, versionId);

  // Edit mode classification (My Cookbook = forked or manual entry)
  const isMyCookbookRecipe = useMemo(() => {
    if (!recipe) return false;
    return recipe.forked_from_id !== null || sourceLinks.length === 0;
  }, [recipe, sourceLinks.length]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCuisine, setEditCuisine] = useState("");
  const [editPrepTime, setEditPrepTime] = useState("");
  const [editCookTime, setEditCookTime] = useState("");
  const [editServings, setEditServings] = useState("");
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);
  const [editSteps, setEditSteps] = useState<DisplayStep[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit ingredient modal state
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [editItem, setEditItem] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPreparation, setEditPreparation] = useState("");
  const [saving, setSaving] = useState(false);

  // Compare modal state
  const [compareModalVisible, setCompareModalVisible] = useState(false);

  // Source browser modal state
  const [sourceBrowserVisible, setSourceBrowserVisible] = useState(false);
  const [compareSourceOverride, setCompareSourceOverride] =
    useState<SourceLinkWithVideo | null>(null);

  // Track share source on first load
  useEffect(() => {
    if (source === "share" && id) {
      Analytics.trackEvent("recipe_opened_from_share", {
        recipe_id: id,
        version_id: versionId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShareRecipe = useCallback(() => {
    if (!recipe) return;
    shareRecipe(recipe.title, recipe.id, currentVersion?.id);
  }, [recipe, currentVersion?.id]);

  // Instructions collapsed by default in Pro mode, expanded in Casual for simpler UX
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [hasSetInitialExpanded, setHasSetInitialExpanded] = useState(false);

  // Expand instructions by default in Casual mode once prefs load
  useEffect(() => {
    if (!isLoadingPrefs && !hasSetInitialExpanded) {
      setInstructionsExpanded(!isChef);
      setHasSetInitialExpanded(true);
    }
  }, [prefsLoading, isChef, hasSetInitialExpanded]);

  // Grocery list modal state and hook
  const [groceryModalVisible, setGroceryModalVisible] = useState(false);
  const { addIngredientsToGroceryList } = useGroceryList();

  // Delete recipe state
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete recipe with double confirmation
  const handleDeleteRecipe = useCallback(() => {
    if (!recipe) return;

    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Second confirmation
            Alert.alert(
              "Confirm Delete",
              "This action cannot be undone. Delete this recipe permanently?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      // If deleting sample recipe, mark as dismissed so it won't recreate
                      if (recipe.title === SAMPLE_RECIPE_TITLE) {
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (user) {
                          await markSampleRecipeDismissed(user.id);
                        }
                      }

                      const { error } = await supabase
                        .from("master_recipes")
                        .delete()
                        .eq("id", recipe.id);

                      if (error) throw error;

                      router.back();
                    } catch (err) {
                      console.error("Failed to delete recipe:", err);
                      Alert.alert("Error", "Failed to delete recipe");
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [recipe]);

  // Enter edit mode - populate all editable fields from current data
  const enterEditMode = useCallback(() => {
    if (!recipe || !currentVersion) return;
    setEditTitle(recipe.title || "");
    setEditDescription(recipe.description || "");
    setEditCuisine(recipe.cuisine || "");
    setEditPrepTime(currentVersion.prep_time_minutes?.toString() || "");
    setEditCookTime(currentVersion.cook_time_minutes?.toString() || "");
    setEditServings(currentVersion.servings?.toString() || "");
    setEditIngredients([...ingredients]);
    setEditSteps([...steps]);
    setIsEditing(true);
  }, [recipe, currentVersion, ingredients, steps]);

  // Cancel edit mode - discard changes
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditTitle("");
    setEditDescription("");
    setEditCuisine("");
    setEditPrepTime("");
    setEditCookTime("");
    setEditServings("");
    setEditIngredients([]);
    setEditSteps([]);
  }, []);

  // Auto-enter edit mode when navigating with ?edit=true (e.g., after creating a recipe)
  useEffect(() => {
    if (edit === "true" && recipe && currentVersion && !loading && !isEditing) {
      enterEditMode();
    }
  }, [edit, recipe, currentVersion, loading, isEditing, enterEditMode]);

  // Save edit mode changes
  const saveEdit = useCallback(async () => {
    if (
      !recipe ||
      !currentVersion ||
      editIngredients.length === 0 ||
      editSteps.length === 0
    )
      return;

    setSavingEdit(true);
    try {
      // 1. Update master_recipes (title, description, cuisine)
      await updateRecipeMetadata({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        cuisine: editCuisine.trim() || null,
      });

      // 2. Update version (ingredients, steps, times, servings)
      const ingredientData = editIngredients.map((ing) => ({
        id: ing.id,
        item: ing.item,
        quantity: ing.quantity,
        unit: ing.unit,
        preparation: ing.preparation,
        is_optional: ing.is_optional ?? false,
        sort_order: ing.sort_order ?? 0,
        original_text: ing.original_text,
        confidence_status:
          (ing.confidence_status as
            | "confirmed"
            | "needs_review"
            | "inferred") ?? "confirmed",
        user_verified: ing.user_verified ?? false,
        grocery_category: ing.grocery_category ?? null,
        allergens: ing.allergens ?? [],
      }));

      // Build a map of user_notes from myVersion (v2) to preserve them when editing from Original
      // user_notes in JSONB come as generic objects, so we cast to any[] for assignment
      const myVersionNotesMap = new Map<number, DisplayStep["user_notes"]>();
      if (myVersion?.steps) {
        const myVersionSteps = myVersion.steps as unknown as VersionStep[];
        for (const step of myVersionSteps) {
          if (step.user_notes && step.user_notes.length > 0) {
            myVersionNotesMap.set(
              step.step_number,
              step.user_notes as DisplayStep["user_notes"]
            );
          }
        }
      }

      const stepData = editSteps.map((step) => ({
        id: step.id,
        step_number: step.step_number,
        instruction: step.instruction,
        duration_minutes: step.duration_minutes,
        temperature_value: step.temperature_value,
        temperature_unit: step.temperature_unit,
        equipment: step.equipment ?? [],
        techniques: step.techniques ?? [],
        timer_label: step.timer_label ?? null,
        // Preserve user_notes: use editStep's notes if present, otherwise use myVersion's notes
        user_notes: step.user_notes?.length
          ? step.user_notes
          : (myVersionNotesMap.get(step.step_number) ?? []),
      }));

      await updateVersionDirectly({
        ingredients: ingredientData,
        steps: stepData as VersionStep[],
        prepTimeMinutes: editPrepTime ? parseInt(editPrepTime, 10) : null,
        cookTimeMinutes: editCookTime ? parseInt(editCookTime, 10) : null,
        servings: editServings ? parseInt(editServings, 10) : null,
        changeNotes: "Edited recipe",
      });

      setIsEditing(false);
    } catch (err) {
      console.error("Error saving edit:", err);
    } finally {
      setSavingEdit(false);
    }
  }, [
    recipe,
    currentVersion,
    myVersion,
    editTitle,
    editDescription,
    editCuisine,
    editPrepTime,
    editCookTime,
    editServings,
    editIngredients,
    editSteps,
    updateRecipeMetadata,
    updateVersionDirectly,
  ]);

  // Ingredient CRUD operations for edit mode
  const addIngredient = useCallback(() => {
    const newIngredient: Ingredient = {
      id: `new-${Date.now()}`,
      item: "",
      quantity: null,
      unit: null,
      preparation: null,
      is_optional: false,
      sort_order: editIngredients.length,
      original_text: null,
      confidence_status: "confirmed",
      user_verified: true,
      grocery_category: null,
      allergens: [],
    };
    setEditIngredients([...editIngredients, newIngredient]);
  }, [editIngredients]);

  const deleteIngredient = useCallback((id: string) => {
    setEditIngredients((prev) => prev.filter((ing) => ing.id !== id));
  }, []);

  const updateEditIngredient = useCallback(
    (id: string, updates: Partial<Ingredient>) => {
      setEditIngredients((prev) =>
        prev.map((ing) => (ing.id === id ? { ...ing, ...updates } : ing))
      );
    },
    []
  );

  // Step CRUD operations for edit mode
  const addStep = useCallback(() => {
    const newStep: DisplayStep = {
      id: `new-${Date.now()}`,
      step_number: editSteps.length + 1,
      instruction: "",
      duration_minutes: null,
      temperature_value: null,
      temperature_unit: null,
      equipment: [],
      techniques: [],
      timer_label: null,
    };
    setEditSteps([...editSteps, newStep]);
  }, [editSteps]);

  const deleteStep = useCallback((id: string) => {
    setEditSteps((prev) => {
      const filtered = prev.filter((step) => step.id !== id);
      // Renumber steps
      return filtered.map((step, index) => ({
        ...step,
        step_number: index + 1,
      }));
    });
  }, []);

  const updateEditStep = useCallback(
    (id: string, updates: Partial<DisplayStep>) => {
      setEditSteps((prev) =>
        prev.map((step) => (step.id === id ? { ...step, ...updates } : step))
      );
    },
    []
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Refetch when screen comes back into focus (e.g., after cooking)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Auto-reset to original version when in casual mode
  // Casual users always see original (simpler UX)
  useEffect(() => {
    if (!isChef && !isLoadingPrefs && !isViewingOriginal && originalVersion) {
      viewOriginal();
    }
  }, [isChef, prefsLoading, isViewingOriginal, originalVersion, viewOriginal]);

  // Get source attribution for the current version
  const getVersionAttribution = useCallback(() => {
    const basedOnSourceId = currentVersion?.based_on_source_id;
    if (!basedOnSourceId) return null;

    const baseSource = sourceLinks.find((link) => link.id === basedOnSourceId);
    if (!baseSource?.video_sources?.source_creator) return null;

    return {
      creatorName: baseSource.video_sources.source_creator,
      sourceLink: baseSource,
    };
  }, [currentVersion?.based_on_source_id, sourceLinks]);

  // Get cover video source for attribution
  const getCoverSourceInfo = useCallback(() => {
    const coverSource = sourceLinks.find(
      (link) => link.video_source_id === recipe?.cover_video_source_id
    );
    return coverSource?.video_sources || null;
  }, [sourceLinks, recipe?.cover_video_source_id]);

  // Determine if Compare button should be visible (beginner guard)
  // Show Compare only if My Version exists OR 2+ sources exist
  const canShowCompare = useMemo(() => {
    return hasMyVersion || sourceLinks.length >= 2;
  }, [hasMyVersion, sourceLinks.length]);

  // Get source for comparison - simplified with Original vs My Version model
  const getCompareSource = useCallback(() => {
    // Helper to check if a source has valid extracted data (both ingredients AND steps)
    const hasValidExtractedData = (source: SourceLinkWithVideo): boolean => {
      const hasIngredients = Boolean(
        source.extracted_ingredients &&
        Array.isArray(source.extracted_ingredients) &&
        source.extracted_ingredients.length > 0
      );
      const hasSteps = Boolean(
        source.extracted_steps &&
        Array.isArray(source.extracted_steps) &&
        source.extracted_steps.length > 0
      );
      return hasIngredients && hasSteps;
    };

    // 1. Check if current version has based_on_source_id
    if (currentVersion?.based_on_source_id) {
      const source = sourceLinks.find(
        (link) => link.id === currentVersion.based_on_source_id
      );
      if (source && hasValidExtractedData(source)) {
        return source;
      }
    }

    // 2. Check original version's source (My Version's parent)
    if (originalVersion?.based_on_source_id) {
      const source = sourceLinks.find(
        (link) => link.id === originalVersion.based_on_source_id
      );
      if (source && hasValidExtractedData(source)) {
        return source;
      }
    }

    // 3. Fallback to cover video source
    if (recipe?.cover_video_source_id) {
      const coverSource = sourceLinks.find(
        (link) => link.video_source_id === recipe.cover_video_source_id
      );
      if (coverSource && hasValidExtractedData(coverSource)) {
        return coverSource;
      }
    }

    return null;
  }, [
    currentVersion,
    originalVersion,
    sourceLinks,
    recipe?.cover_video_source_id,
  ]);

  // Get the active compare source (override or default)
  const getActiveCompareSource = useCallback(() => {
    return compareSourceOverride || getCompareSource();
  }, [compareSourceOverride, getCompareSource]);

  // Handle applying original source data as My Version
  const _handleApplyOriginal = useCallback(async () => {
    const source = getActiveCompareSource();
    if (!source || !currentVersion) return;

    const sourceIngredients =
      source.extracted_ingredients as unknown as VersionIngredient[];
    const sourceSteps =
      (source.extracted_steps as unknown as VersionStep[]) || [];

    // Create/update My Version with source data
    const creatorName = source.video_sources?.source_creator || "Original";
    await updateOrCreateMyVersion({
      ingredients: sourceIngredients,
      steps: sourceSteps,
      mode: "source_apply",
      changeNotes: `Applied source (${creatorName})`,
      createdFromTitle: `From ${creatorName}`,
      basedOnSourceId: source.id, // Track which source was applied
    });
    setCompareSourceOverride(null);
  }, [getActiveCompareSource, currentVersion, updateOrCreateMyVersion]);

  // Handle comparing with a specific source (from source browser)
  const handleCompareWithSource = useCallback((source: SourceLinkWithVideo) => {
    setCompareSourceOverride(source);
    setCompareModalVisible(true);
  }, []);

  // Handle applying a source from source browser
  const handleApplySourceFromBrowser = useCallback(
    async (source: SourceLinkWithVideo) => {
      if (!currentVersion) return;

      const sourceIngredients =
        source.extracted_ingredients as unknown as VersionIngredient[];
      const sourceSteps =
        (source.extracted_steps as unknown as VersionStep[]) || [];

      const creatorName = source.video_sources?.source_creator || "Original";
      await updateOrCreateMyVersion({
        ingredients: sourceIngredients,
        steps: sourceSteps,
        mode: "source_apply",
        changeNotes: `Applied source (${creatorName})`,
        createdFromTitle: `From ${creatorName}`,
        basedOnSourceId: source.id, // Track which source was applied
      });
    },
    [currentVersion, updateOrCreateMyVersion]
  );

  const openEditModal = useCallback((ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setEditItem(ingredient.item);
    setEditQuantity(ingredient.quantity?.toString() || "");
    setEditUnit(ingredient.unit || "");
    setEditPreparation(ingredient.preparation || "");
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingIngredient(null);
    setEditItem("");
    setEditQuantity("");
    setEditUnit("");
    setEditPreparation("");
  }, []);

  const handleSaveIngredient = useCallback(async () => {
    if (!editingIngredient || !editItem.trim() || !currentVersion) return;

    // Guard: Prevent creating versions with empty data
    if (ingredients.length === 0 || steps.length === 0) {
      return;
    }

    setSaving(true);
    try {
      // Build updated ingredient
      const updatedIngredient: Ingredient = {
        ...editingIngredient,
        item: editItem.trim(),
        quantity: editQuantity ? parseFloat(editQuantity) : null,
        unit: editUnit.trim() || null,
        preparation: editPreparation.trim() || null,
        user_verified: true,
        confidence_status: "confirmed",
      };

      // Build new ingredients array with the update
      const newIngredients = ingredients.map((ing) =>
        ing.id === editingIngredient.id ? updatedIngredient : ing
      );

      closeEditModal();

      // Build ingredient and step data for save
      const ingredientData = newIngredients.map((ing) => ({
        id: ing.id,
        item: ing.item,
        quantity: ing.quantity,
        unit: ing.unit,
        preparation: ing.preparation,
        is_optional: ing.is_optional ?? false,
        sort_order: ing.sort_order ?? 0,
        original_text: ing.original_text,
        confidence_status:
          (ing.confidence_status as
            | "confirmed"
            | "needs_review"
            | "inferred") ?? "confirmed",
        user_verified: ing.user_verified ?? false,
        grocery_category: ing.grocery_category ?? null,
        allergens: ing.allergens ?? [],
      }));

      const stepData = steps.map((step) => ({
        id: step.id,
        step_number: step.step_number,
        instruction: step.instruction,
        duration_minutes: step.duration_minutes,
        temperature_value: step.temperature_value,
        temperature_unit: step.temperature_unit,
        equipment: step.equipment ?? [],
        techniques: step.techniques ?? [],
        timer_label: step.timer_label ?? null,
        user_notes: step.user_notes ?? [], // Preserve user notes
      }));

      if (isForkedRecipe) {
        // Forked recipes: direct update to v1 (no v2 creation)
        await updateVersionDirectly({
          ingredients: ingredientData,
          steps: stepData as VersionStep[],
          changeNotes: `Updated ingredient: ${updatedIngredient.item}`,
        });
      } else {
        // Outsourced recipes: UPSERT v2
        await updateOrCreateMyVersion({
          ingredients: ingredientData,
          steps: stepData as VersionStep[],
          mode: "edit",
          changeNotes: `Updated ingredient: ${updatedIngredient.item}`,
        });
      }
    } catch (err) {
      console.error("Error saving ingredient:", err);
    } finally {
      setSaving(false);
    }
  }, [
    editingIngredient,
    editItem,
    editQuantity,
    editUnit,
    editPreparation,
    closeEditModal,
    currentVersion,
    ingredients,
    steps,
    isForkedRecipe,
    updateVersionDirectly,
    updateOrCreateMyVersion,
  ]);

  // Open source URL - prioritize version's based_on_source, fall back to cover source
  const handleOpenSource = useCallback(async () => {
    const versionAttr = getVersionAttribution();
    const sourceUrl =
      versionAttr?.sourceLink?.video_sources?.source_url ??
      getCoverSourceInfo()?.source_url;

    if (sourceUrl) {
      try {
        await Linking.openURL(sourceUrl);
      } catch {
        // Ignore error
      }
    }
  }, [getVersionAttribution, getCoverSourceInfo]);

  // Handle cooking - navigate to cook screen with current version
  const handleStartCooking = useCallback(() => {
    // Pass which version to cook via query param
    const versionId = currentVersion?.id;
    if (versionId) {
      router.push(`/cook/${id}?versionId=${versionId}`);
    } else {
      router.push(`/cook/${id}`);
    }
  }, [id, currentVersion?.id]);

  // Handle fork - create standalone copy
  const handleForkRecipe = useCallback(async () => {
    const newRecipeId = await forkAsNewRecipe();
    if (newRecipeId) {
      router.replace(`/recipe/${newRecipeId}`);
    }
  }, [forkAsNewRecipe]);

  const _getPlatformIcon = (
    platform: string | null
  ): keyof typeof Ionicons.glyphMap => {
    switch (platform) {
      case "youtube":
        return "logo-youtube";
      case "tiktok":
        return "logo-tiktok";
      case "instagram":
        return "logo-instagram";
      default:
        return "globe-outline";
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerShown: false }} />
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <SkeletonRecipeDetail />
        </View>
      </>
    );
  }

  if (error || !recipe) {
    return (
      <>
        <Stack.Screen options={{ title: "Error", headerShown: true }} />
        <View style={[styles.errorContainer, { paddingTop: spacing[4] }]}>
          <Card variant="outlined" style={styles.errorCard}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle" size={24} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text variant="label" color="error">
                  Error loading recipe
                </Text>
                <Text variant="bodySmall" color="error">
                  {error || "Recipe not found"}
                </Text>
              </View>
            </View>
            <Button variant="secondary" size="sm" onPress={() => router.back()}>
              Go Back
            </Button>
          </Card>
        </View>
      </>
    );
  }

  const formatQuantity = (ing: Ingredient) => {
    const parts: string[] = [];

    // Handle "to taste" specially - put item first
    if (ing.unit === "to taste") {
      parts.push(ing.item);
      if (ing.preparation) parts.push(`(${ing.preparation})`);
      parts.push("to taste");
      return parts.join(" ");
    }

    if (ing.quantity) parts.push(String(ing.quantity));
    if (ing.unit) parts.push(ing.unit);
    parts.push(ing.item);
    if (ing.preparation) parts.push(`(${ing.preparation})`);
    return parts.join(" ");
  };

  const needsReviewCount = ingredients.filter(
    (ing) => ing.confidence_status === "needs_review" && !ing.user_verified
  ).length;

  const getIngredientStatus = (ing: Ingredient) => {
    if (ing.user_verified) return "verified";
    if (ing.confidence_status === "needs_review") return "review";
    if (ing.confidence_status === "inferred") return "inferred";
    return "default";
  };

  const totalTime =
    (currentVersion?.prep_time_minutes || 0) +
    (currentVersion?.cook_time_minutes || 0);

  const versionAttribution = getVersionAttribution();
  const coverSourceInfo = getCoverSourceInfo();

  return (
    <>
      <Stack.Screen options={{ title: "", headerShown: false }} />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top, paddingBottom: 140 }, // Extra padding for fixed button
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Edit Mode Header Bar - My Cookbook recipes only */}
          {isMyCookbookRecipe && (
            <View style={styles.editHeaderBar}>
              {isEditing ? (
                <>
                  <Pressable
                    style={styles.editHeaderButton}
                    onPress={cancelEdit}
                    disabled={savingEdit}
                  >
                    <Text variant="label" color="textSecondary">
                      Cancel
                    </Text>
                  </Pressable>
                  <Text variant="label" color="textMuted">
                    Editing
                  </Text>
                  <Pressable
                    style={[
                      styles.editHeaderButton,
                      styles.editHeaderSaveButton,
                    ]}
                    onPress={saveEdit}
                    disabled={savingEdit || !editTitle.trim()}
                  >
                    {savingEdit ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.textOnPrimary}
                      />
                    ) : (
                      <Text variant="label" color="textOnPrimary">
                        Save
                      </Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={styles.editHeaderButton}
                    onPress={handleDeleteRecipe}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.error}
                        />
                        <Text variant="label" style={{ color: colors.error }}>
                          Delete
                        </Text>
                      </>
                    )}
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Pressable
                    style={styles.editHeaderButton}
                    onPress={enterEditMode}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text variant="label" color="primary">
                      Edit
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* Title Section */}
          <View style={styles.titleSection}>
            {isEditing ? (
              <>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Recipe title"
                  placeholderTextColor={colors.textMuted}
                  style={styles.editTitleInput}
                  autoFocus
                />
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.editDescriptionInput}
                  multiline
                  numberOfLines={2}
                />
              </>
            ) : (
              <>
                <Text variant="h1">{recipe.title}</Text>
                {recipe.description && (
                  <Text variant="body" color="textSecondary">
                    {recipe.description}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Version Toggle - Chef mode only, outsourced recipes only */}
          {!isLoadingPrefs &&
            isChef &&
            isOutsourcedRecipe &&
            !isForkedRecipe && (
              <VersionToggle
                hasMyVersion={hasMyVersion}
                isViewingOriginal={isViewingOriginal}
                onViewOriginal={viewOriginal}
                onViewMyVersion={viewMyVersion}
                learningsCount={
                  myVersion?.learnings
                    ? (myVersion.learnings as unknown as VersionLearning[])
                        .length
                    : 0
                }
              />
            )}

          {/* Forked Recipe Badge */}
          {isForkedRecipe && (
            <View style={styles.forkedBadge}>
              <Ionicons
                name="git-branch-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text variant="label" color="textSecondary">
                Your recipe
              </Text>
            </View>
          )}

          {/* Save to My Cookbook - Chef mode only, outsourced recipes */}
          {!isLoadingPrefs && isChef && isOutsourcedRecipe && (
            <View style={{ alignItems: "center" }}>
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing[2],
                  paddingVertical: spacing[2],
                  paddingHorizontal: spacing[4],
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.full,
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                }}
                onPress={handleForkRecipe}
              >
                <Ionicons
                  name="book-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  variant="caption"
                  color="primary"
                  style={{ fontWeight: "600" }}
                >
                  Save to My Cookbook
                </Text>
              </Pressable>
              <Text
                variant="caption"
                color="textMuted"
                style={{ fontSize: 11, textAlign: "center", marginTop: 4 }}
              >
                Create your own editable copy
              </Text>
            </View>
          )}

          {/* Source Attribution - Clickable to open source */}
          {(versionAttribution || coverSourceInfo) && (
            <Pressable
              style={styles.attributionContainer}
              onPress={handleOpenSource}
            >
              <View style={styles.attributionLine1}>
                <Ionicons
                  name="videocam-outline"
                  size={18}
                  color={colors.primaryDark}
                />
                <View style={styles.attributionTextContainer}>
                  <Text variant="caption" style={styles.attributionLabel}>
                    {isViewingOriginal ? "Source" : "Based on"}
                  </Text>
                  <Text variant="label" style={styles.attributionCreator}>
                    {versionAttribution?.creatorName ||
                      coverSourceInfo?.source_creator ||
                      (coverSourceInfo?.source_platform
                        ? coverSourceInfo.source_platform
                            .charAt(0)
                            .toUpperCase() +
                          coverSourceInfo.source_platform.slice(1) +
                          " video"
                        : "Video source")}
                  </Text>
                </View>
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={colors.primary}
                />
              </View>

              {/* Action buttons - show if 2+ sources or can compare */}
              {!isLoadingPrefs &&
                (sourceLinks.length >= 2 ||
                  (canShowCompare && getCompareSource())) && (
                  <View style={styles.attributionLine2}>
                    {sourceLinks.length >= 2 && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          setSourceBrowserVisible(true);
                        }}
                        style={styles.attributionActionButton}
                      >
                        <Ionicons
                          name="layers-outline"
                          size={14}
                          color={colors.primary}
                        />
                        <Text variant="caption" color="primary">
                          {sourceLinks.length} Sources
                        </Text>
                      </Pressable>
                    )}
                    {canShowCompare &&
                      !isViewingOriginal &&
                      getCompareSource() && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setCompareModalVisible(true);
                          }}
                          style={styles.attributionActionButton}
                        >
                          <Ionicons
                            name="git-compare-outline"
                            size={14}
                            color={colors.primary}
                          />
                          <Text variant="caption" color="primary">
                            Compare
                          </Text>
                        </Pressable>
                      )}
                  </View>
                )}
            </Pressable>
          )}

          {/* Tags - Editable cuisine in edit mode */}
          {isEditing ? (
            <View style={styles.editTagsRow}>
              <View style={styles.editTagInputGroup}>
                <Text variant="caption" color="textMuted">
                  Cuisine
                </Text>
                <TextInput
                  value={editCuisine}
                  onChangeText={setEditCuisine}
                  placeholder="e.g., Italian, Mexican"
                  placeholderTextColor={colors.textMuted}
                  style={styles.editTagInput}
                />
              </View>
            </View>
          ) : (
            <View style={styles.tagsRow}>
              {recipe.cuisine && (
                <View style={[styles.tag, styles.tagCuisine]}>
                  <Text variant="caption" style={styles.tagCuisineText}>
                    {recipe.cuisine}
                  </Text>
                </View>
              )}
              {recipe.mode && (
                <View style={[styles.tag, styles.tagMode]}>
                  <Text variant="caption" color="textSecondary">
                    {recipe.mode}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Stats Card - Editable in edit mode */}
          {isEditing ? (
            <Card variant="outlined" padding={0}>
              <View style={styles.editStatsRow}>
                <View style={styles.editStatItem}>
                  <View style={styles.editStatHeader}>
                    <Ionicons
                      name="hourglass-outline"
                      size={16}
                      color={colors.textMuted}
                    />
                    <Text variant="caption" color="textMuted">
                      Prep (min)
                    </Text>
                  </View>
                  <TextInput
                    value={editPrepTime}
                    onChangeText={setEditPrepTime}
                    placeholder="--"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.editStatInput}
                  />
                </View>
                <View style={styles.editStatItem}>
                  <View style={styles.editStatHeader}>
                    <Ionicons
                      name="flame-outline"
                      size={16}
                      color={colors.textMuted}
                    />
                    <Text variant="caption" color="textMuted">
                      Cook (min)
                    </Text>
                  </View>
                  <TextInput
                    value={editCookTime}
                    onChangeText={setEditCookTime}
                    placeholder="--"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.editStatInput}
                  />
                </View>
                <View style={styles.editStatItem}>
                  <View style={styles.editStatHeader}>
                    <Ionicons
                      name="people-outline"
                      size={16}
                      color={colors.textMuted}
                    />
                    <Text variant="caption" color="textMuted">
                      Servings
                    </Text>
                  </View>
                  <TextInput
                    value={editServings}
                    onChangeText={setEditServings}
                    placeholder="--"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.editStatInput}
                  />
                </View>
              </View>
            </Card>
          ) : (
            (currentVersion?.prep_time_minutes ||
              currentVersion?.cook_time_minutes ||
              currentVersion?.servings) && (
              <Card variant="elevated" padding={0}>
                <View style={styles.statsRow}>
                  {/* Prep time - Pro mode only */}
                  {!isLoadingPrefs &&
                    isChef &&
                    currentVersion?.prep_time_minutes && (
                      <View style={styles.statItem}>
                        <Ionicons
                          name="hourglass-outline"
                          size={18}
                          color={colors.textMuted}
                        />
                        <Text variant="caption" color="textMuted">
                          Prep
                        </Text>
                        <Text variant="label">
                          {currentVersion.prep_time_minutes}m
                        </Text>
                      </View>
                    )}
                  {/* Cook time - Pro mode only */}
                  {!isLoadingPrefs &&
                    isChef &&
                    currentVersion?.cook_time_minutes && (
                      <View style={styles.statItem}>
                        <Ionicons
                          name="flame-outline"
                          size={18}
                          color={colors.textMuted}
                        />
                        <Text variant="caption" color="textMuted">
                          Cook
                        </Text>
                        <Text variant="label">
                          {currentVersion.cook_time_minutes}m
                        </Text>
                      </View>
                    )}
                  {/* Total time - always shown */}
                  {totalTime > 0 && (
                    <View style={styles.statItem}>
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text variant="caption" color="textMuted">
                        {!isLoadingPrefs && isChef ? "Total" : "Time"}
                      </Text>
                      <Text variant="label" color="primary">
                        {totalTime}m
                      </Text>
                    </View>
                  )}
                  {/* Servings - always shown */}
                  {currentVersion?.servings && (
                    <View style={styles.statItem}>
                      <Ionicons
                        name="people-outline"
                        size={18}
                        color={colors.textMuted}
                      />
                      <Text variant="caption" color="textMuted">
                        Serves
                      </Text>
                      <Text variant="label">
                        {currentVersion.servings}
                        {currentVersion.servings_unit
                          ? ` ${currentVersion.servings_unit}`
                          : ""}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            )
          )}

          {/* Ingredients Section */}
          {(isEditing
            ? editIngredients.length > 0 || true
            : ingredients.length > 0) && (
            <View style={styles.section}>
              {/* Header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons
                    name="list-outline"
                    size={20}
                    color={colors.textPrimary}
                  />
                  <Text variant="h3">Ingredients</Text>
                  <Text variant="caption" color="textMuted">
                    {isEditing ? editIngredients.length : ingredients.length}
                  </Text>
                  {/* Review badge - Pro mode only, not in edit mode */}
                  {!isEditing &&
                    !isLoadingPrefs &&
                    isChef &&
                    needsReviewCount > 0 && (
                      <View style={styles.reviewBadge}>
                        <Ionicons
                          name="alert-circle"
                          size={14}
                          color="#92400E"
                        />
                        <Text variant="caption" style={{ color: "#92400E" }}>
                          {needsReviewCount} to verify
                        </Text>
                      </View>
                    )}
                </View>
              </View>

              {/* Add to Grocery button - not in edit mode */}
              {!isEditing && (
                <Pressable
                  style={styles.groceryButton}
                  onPress={() => setGroceryModalVisible(true)}
                >
                  <Ionicons
                    name="cart-outline"
                    size={18}
                    color={colors.primaryDark}
                  />
                  <Text variant="caption" style={styles.groceryButtonText}>
                    Add to Grocery
                  </Text>
                </Pressable>
              )}

              {/* Edit mode ingredients list */}
              {isEditing ? (
                <View style={styles.editIngredientsContainer}>
                  {editIngredients.map((ing) => (
                    <View key={ing.id} style={styles.editIngredientRow}>
                      <View style={styles.editIngredientInputs}>
                        <TextInput
                          value={ing.quantity?.toString() || ""}
                          onChangeText={(text) =>
                            updateEditIngredient(ing.id, {
                              quantity: text ? parseFloat(text) : null,
                            })
                          }
                          placeholder="Qty"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                          style={[
                            styles.editIngredientInput,
                            styles.editIngredientQty,
                          ]}
                        />
                        <TextInput
                          value={ing.unit || ""}
                          onChangeText={(text) =>
                            updateEditIngredient(ing.id, { unit: text || null })
                          }
                          placeholder="Unit"
                          placeholderTextColor={colors.textMuted}
                          style={[
                            styles.editIngredientInput,
                            styles.editIngredientUnit,
                          ]}
                        />
                        <TextInput
                          value={ing.item}
                          onChangeText={(text) =>
                            updateEditIngredient(ing.id, { item: text })
                          }
                          placeholder="Ingredient name"
                          placeholderTextColor={colors.textMuted}
                          style={[
                            styles.editIngredientInput,
                            styles.editIngredientName,
                          ]}
                        />
                      </View>
                      <Pressable
                        style={styles.editDeleteButton}
                        onPress={() => deleteIngredient(ing.id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.error}
                        />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    style={styles.addItemButton}
                    onPress={addIngredient}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={colors.primary}
                    />
                    <Text variant="label" color="primary">
                      Add Ingredient
                    </Text>
                  </Pressable>
                </View>
              ) : (
                /* Normal view mode */
                <Card variant="outlined" padding={0}>
                  {ingredients.map((ing, index) => {
                    const status = getIngredientStatus(ing);
                    const needsAttention =
                      status === "review" || status === "inferred";
                    const showStatus = !isLoadingPrefs && isChef;

                    return (
                      <Pressable
                        key={ing.id}
                        onPress={() => openEditModal(ing)}
                        style={[
                          styles.ingredientRow,
                          index < ingredients.length - 1 &&
                            styles.ingredientBorder,
                          showStatus &&
                            status === "verified" &&
                            styles.ingredientVerified,
                          showStatus &&
                            status === "review" &&
                            styles.ingredientReview,
                          showStatus &&
                            status === "inferred" &&
                            styles.ingredientInferred,
                        ]}
                      >
                        {showStatus ? (
                          <View
                            style={[
                              styles.ingredientIcon,
                              status === "verified" &&
                                styles.ingredientIconVerified,
                              status === "review" &&
                                styles.ingredientIconReview,
                              status === "inferred" &&
                                styles.ingredientIconInferred,
                            ]}
                          >
                            {status === "verified" ? (
                              <Ionicons
                                name="checkmark"
                                size={12}
                                color="#fff"
                              />
                            ) : status === "review" ? (
                              <Ionicons name="help" size={12} color="#fff" />
                            ) : status === "inferred" ? (
                              <Ionicons
                                name="sparkles"
                                size={12}
                                color="#fff"
                              />
                            ) : (
                              <View style={styles.bulletDot} />
                            )}
                          </View>
                        ) : (
                          <View style={styles.casualBullet}>
                            <View style={styles.bulletDot} />
                          </View>
                        )}
                        <View style={styles.ingredientContent}>
                          <Text
                            variant="body"
                            color={
                              ing.is_optional ? "textMuted" : "textPrimary"
                            }
                          >
                            {formatQuantity(ing)}
                            {ing.is_optional && (
                              <Text variant="caption" color="textMuted">
                                {" "}
                                (optional)
                              </Text>
                            )}
                          </Text>
                          {showStatus && needsAttention && (
                            <Text
                              variant="caption"
                              style={{ color: "#92400E", marginTop: 2 }}
                            >
                              {status === "inferred"
                                ? "AI inferred - tap to edit"
                                : "Tap to verify or edit"}
                            </Text>
                          )}
                        </View>
                        {showStatus && (
                          <Ionicons
                            name="pencil-outline"
                            size={16}
                            color={
                              needsAttention ? "#92400E" : colors.textMuted
                            }
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </Card>
              )}

              {/* Review hint - Pro mode only, not in edit mode */}
              {!isEditing &&
                !isLoadingPrefs &&
                isChef &&
                needsReviewCount > 0 && (
                  <View style={styles.reviewHint}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.textMuted}
                    />
                    <Text variant="caption" color="textMuted">
                      Yellow items were auto-corrected. Tap to verify.
                    </Text>
                  </View>
                )}
            </View>
          )}

          {/* Steps Section - Collapsed by default, always visible in edit mode */}
          {(isEditing ? editSteps.length > 0 || true : steps.length > 0) && (
            <View style={styles.section}>
              {/* Header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons
                    name="reader-outline"
                    size={20}
                    color={colors.textPrimary}
                  />
                  <Text variant="h3">Instructions</Text>
                  <Text variant="caption" color="textMuted">
                    {isEditing ? editSteps.length : steps.length} steps
                  </Text>
                </View>
                {!isEditing && (
                  <Pressable
                    style={styles.expandButton}
                    onPress={() =>
                      setInstructionsExpanded(!instructionsExpanded)
                    }
                  >
                    <Text variant="caption" color="primary">
                      {instructionsExpanded ? "Hide" : "Show"}
                    </Text>
                    <Ionicons
                      name={
                        instructionsExpanded ? "chevron-up" : "chevron-down"
                      }
                      size={18}
                      color={colors.primary}
                    />
                  </Pressable>
                )}
              </View>

              {/* Edit mode steps list */}
              {isEditing ? (
                <View style={styles.editStepsContainer}>
                  {editSteps.map((step) => (
                    <View key={step.id} style={styles.editStepRow}>
                      <View style={styles.editStepNumber}>
                        <Text variant="label" color="textOnPrimary">
                          {step.step_number}
                        </Text>
                      </View>
                      <TextInput
                        value={step.instruction}
                        onChangeText={(text) =>
                          updateEditStep(step.id, { instruction: text })
                        }
                        placeholder="Enter step instruction..."
                        placeholderTextColor={colors.textMuted}
                        style={styles.editStepInput}
                        multiline
                        numberOfLines={3}
                      />
                      <Pressable
                        style={styles.editDeleteButton}
                        onPress={() => deleteStep(step.id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.error}
                        />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={styles.addItemButton} onPress={addStep}>
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={colors.primary}
                    />
                    <Text variant="label" color="primary">
                      Add Step
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* Collapsed preview - show first step summary */}
                  {!instructionsExpanded && steps.length > 0 && (
                    <Pressable
                      style={styles.collapsedPreview}
                      onPress={() => setInstructionsExpanded(true)}
                    >
                      <View style={styles.collapsedStep}>
                        <View style={styles.collapsedStepNumber}>
                          <Text variant="caption" color="textOnPrimary">
                            1
                          </Text>
                        </View>
                        <Text
                          variant="bodySmall"
                          color="textSecondary"
                          numberOfLines={2}
                          style={{ flex: 1 }}
                        >
                          {steps[0].instruction}
                        </Text>
                      </View>
                      <View style={styles.collapsedHint}>
                        <Text variant="caption" color="textMuted">
                          Tap to see all {steps.length} steps
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={14}
                          color={colors.textMuted}
                        />
                      </View>
                    </Pressable>
                  )}

                  {/* Expanded steps */}
                  {instructionsExpanded && (
                    <View style={styles.stepsContainer}>
                      {steps.map((step, index) => (
                        <View key={step.id} style={styles.stepItem}>
                          <View style={styles.stepNumberContainer}>
                            <View style={styles.stepNumber}>
                              <Text variant="label" color="textOnPrimary">
                                {step.step_number}
                              </Text>
                            </View>
                            {index < steps.length - 1 && (
                              <View style={styles.stepLine} />
                            )}
                          </View>
                          <Card variant="elevated" style={styles.stepCard}>
                            {!isLoadingPrefs &&
                              isChef &&
                              (step.duration_minutes != null ||
                                step.temperature_value != null) && (
                                <View style={styles.stepMeta}>
                                  {step.duration_minutes != null &&
                                    step.duration_minutes > 0 && (
                                      <View style={styles.stepMetaItem}>
                                        <Ionicons
                                          name="time-outline"
                                          size={14}
                                          color={colors.primary}
                                        />
                                        <Text variant="caption" color="primary">
                                          {step.duration_minutes} min
                                        </Text>
                                      </View>
                                    )}
                                  {step.temperature_value != null && (
                                    <View style={styles.stepMetaItem}>
                                      <Ionicons
                                        name="thermometer-outline"
                                        size={14}
                                        color={colors.primary}
                                      />
                                      <Text variant="caption" color="primary">
                                        {step.temperature_value}°
                                        {step.temperature_unit || "F"}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            <Text
                              variant="body"
                              color="textSecondary"
                              style={styles.stepInstruction}
                            >
                              {step.instruction}
                            </Text>
                          </Card>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom Bar - Cook + Share */}
        <View style={styles.fixedBottomContainer}>
          <View style={styles.bottomBarRow}>
            <Pressable
              style={styles.shareButton}
              onPress={handleShareRecipe}
              hitSlop={8}
            >
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            </Pressable>
            <Pressable
              style={[
                styles.startButton,
                !isLoadingPrefs && !isChef && styles.startButtonCasual,
              ]}
              onPress={handleStartCooking}
            >
              <View style={styles.startButtonContent}>
                <Ionicons
                  name="play-circle"
                  size={28}
                  color={colors.textOnPrimary}
                />
                <Text variant="h4" color="textOnPrimary">
                  Cook this Recipe
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Edit Ingredient Modal */}
      <Modal
        visible={!!editingIngredient}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditModal}
      >
        <View
          style={[
            styles.modalContainer,
            { paddingTop: insets.top + spacing[4] },
          ]}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={closeEditModal} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text variant="h3">Edit Ingredient</Text>
            <View style={{ width: 44 }} />
          </View>

          {editingIngredient?.confidence_status === "inferred" && (
            <View style={styles.inferredBanner}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text variant="bodySmall" style={{ color: "#9A3412", flex: 1 }}>
                This ingredient was inferred by AI based on the recipe name.
                Please verify or correct it.
              </Text>
            </View>
          )}

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text variant="label" color="textSecondary">
                Ingredient
              </Text>
              <TextInput
                value={editItem}
                onChangeText={setEditItem}
                placeholder="e.g., pasta"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text variant="label" color="textSecondary">
                  Quantity
                </Text>
                <TextInput
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  placeholder="e.g., 200"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={styles.textInput}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text variant="label" color="textSecondary">
                  Unit
                </Text>
                <TextInput
                  value={editUnit}
                  onChangeText={setEditUnit}
                  placeholder="e.g., g, cups"
                  placeholderTextColor={colors.textMuted}
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text variant="label" color="textSecondary">
                Preparation (optional)
              </Text>
              <TextInput
                value={editPreparation}
                onChangeText={setEditPreparation}
                placeholder="e.g., grated, diced"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button
              variant="secondary"
              onPress={closeEditModal}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSaveIngredient}
              loading={saving}
              disabled={!editItem.trim()}
              style={{ flex: 1 }}
            >
              Save
            </Button>
          </View>
        </View>
      </Modal>

      {/* Compare Modal - Always compares My Version vs Source */}
      {getActiveCompareSource() && myVersion && (
        <CompareModal
          visible={compareModalVisible}
          onClose={() => {
            setCompareModalVisible(false);
            setCompareSourceOverride(null);
          }}
          sourceLabel={
            getActiveCompareSource()?.video_sources?.source_creator ||
            "Original Source"
          }
          originalIngredients={
            (getActiveCompareSource()
              ?.extracted_ingredients as unknown as VersionIngredient[]) || []
          }
          originalSteps={
            (getActiveCompareSource()
              ?.extracted_steps as unknown as VersionStep[]) || []
          }
          currentIngredients={(
            (myVersion.ingredients as unknown as VersionIngredient[]) || []
          ).map((ing) => ({
            id: ing.id,
            item: ing.item,
            quantity: ing.quantity,
            unit: ing.unit,
            preparation: ing.preparation,
            is_optional: ing.is_optional ?? false,
            sort_order: ing.sort_order ?? 0,
            original_text: ing.original_text,
            confidence_status: ing.confidence_status ?? "confirmed",
            user_verified: ing.user_verified ?? false,
            grocery_category: ing.grocery_category,
            allergens: ing.allergens ?? [],
          }))}
          currentSteps={(
            (myVersion.steps as unknown as VersionStep[]) || []
          ).map((step) => ({
            id: step.id,
            step_number: step.step_number,
            instruction: step.instruction,
            duration_minutes: step.duration_minutes,
            temperature_value: step.temperature_value,
            temperature_unit: step.temperature_unit,
            equipment: step.equipment ?? [],
            techniques: step.techniques ?? [],
            timer_label: step.timer_label,
            user_notes: step.user_notes ?? [],
          }))}
          versionLabel="My Version"
          versionLearnings={
            (myVersion.learnings as unknown as VersionLearning[]) || []
          }
        />
      )}

      {/* Source Browser Modal */}
      <SourceBrowserModal
        visible={sourceBrowserVisible}
        onClose={() => {
          setSourceBrowserVisible(false);
          setCompareSourceOverride(null);
        }}
        sources={sourceLinks}
        currentSourceId={currentVersion?.based_on_source_id ?? null}
        onCompareWithSource={handleCompareWithSource}
        onApplySource={handleApplySourceFromBrowser}
      />

      {/* Add to Grocery Modal */}
      <AddToGroceryModal
        visible={groceryModalVisible}
        onClose={() => setGroceryModalVisible(false)}
        ingredients={ingredients}
        recipeId={id || ""}
        recipeTitle={recipe?.title || "Recipe"}
        onAddToGrocery={(selectedIngredients) =>
          addIngredientsToGroceryList(
            selectedIngredients,
            id || "",
            recipe?.title || "Recipe"
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: layout.screenPaddingHorizontal,
    gap: spacing[5],
  },
  fixedBottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: layout.screenPaddingHorizontal,
    paddingBottom: spacing[6],
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: layout.screenPaddingHorizontal,
    gap: spacing[4],
  },
  errorCard: {
    backgroundColor: "#FEE2E2",
    borderColor: colors.error,
    gap: spacing[3],
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  titleSection: {
    gap: spacing[2],
    marginTop: spacing[6],
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[1],
  },
  attributionContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  attributionLine1: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: "#FFF7ED", // Orange 50 - light bg for good contrast
  },
  attributionTextContainer: {
    flex: 1,
    gap: 2,
  },
  attributionLabel: {
    color: colors.primaryDark,
  },
  attributionCreator: {
    color: colors.textPrimary,
  },
  attributionLine2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attributionActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  versionSection: {
    gap: spacing[2],
  },
  versionDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  versionDropdownLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginRight: spacing[2],
  },
  activeBadge: {
    backgroundColor: "#FFF7ED", // Orange 50 - light bg
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeBadgeText: {
    color: colors.primaryDark,
    fontSize: fontSize.xs,
  },
  activeBadgePrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  activeBadgePrimaryText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
  versionList: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  versionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  versionItemActive: {
    backgroundColor: "#FFF7ED", // Orange 50 - light bg for good contrast
  },
  viewHistoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  versionItemLeft: {
    flex: 1,
    gap: spacing[1],
  },
  versionItemTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  previewingBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  previewingBadgeText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
  },
  previewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: "#FFF7ED", // Orange 50 - light bg for good contrast
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  previewBannerTextContainer: {
    flex: 1,
    gap: 2,
  },
  previewBannerText: {
    color: colors.primary,
  },
  makeActiveButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  tagCuisine: {
    backgroundColor: "#FEF3C7",
  },
  tagCuisineText: {
    color: "#92400E",
  },
  tagMode: {
    backgroundColor: colors.surfaceElevated,
  },
  statsRow: {
    flexDirection: "row",
    padding: spacing[4],
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing[1],
  },
  bottomBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  startButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  startButtonCasual: {
    padding: spacing[5],
    borderRadius: borderRadius["2xl"],
  },
  startButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  cookingHint: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  section: {
    gap: spacing[3],
  },
  sectionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  groceryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    backgroundColor: "#FFF7ED", // Orange 50 - light background for good contrast
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  groceryButtonText: {
    color: colors.primaryDark,
    fontFamily: fontFamily.medium,
  },
  reviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing[4],
    gap: spacing[3],
  },
  ingredientBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingredientVerified: {
    backgroundColor: "#F0FDF4",
  },
  ingredientReview: {
    backgroundColor: "#FFFBEB",
  },
  ingredientInferred: {
    backgroundColor: "#FFF7ED",
  },
  ingredientIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  ingredientIconVerified: {
    backgroundColor: "#22C55E",
  },
  ingredientIconReview: {
    backgroundColor: "#F59E0B",
  },
  ingredientIconInferred: {
    backgroundColor: colors.primary,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  casualBullet: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  ingredientContent: {
    flex: 1,
  },
  reviewHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[1],
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  collapsedPreview: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  collapsedStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    padding: spacing[4],
  },
  collapsedStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  collapsedHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  stepsContainer: {
    gap: spacing[0],
  },
  stepItem: {
    flexDirection: "row",
    gap: spacing[3],
  },
  stepNumberContainer: {
    alignItems: "center",
    width: 32,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.primaryLight,
    marginVertical: spacing[2],
  },
  stepCard: {
    flex: 1,
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  stepMeta: {
    flexDirection: "row",
    gap: spacing[4],
  },
  stepMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  stepInstruction: {
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: layout.screenPaddingHorizontal,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  inferredBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    backgroundColor: "#FFF7ED",
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  modalContent: {
    gap: spacing[4],
    flex: 1,
  },
  inputGroup: {
    gap: spacing[2],
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  forkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  forkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  // Edit mode styles
  editHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing[4],
  },
  editHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  editHeaderSaveButton: {
    backgroundColor: colors.primary,
    minWidth: 70,
    justifyContent: "center",
  },
  editTitleInput: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize["2xl"],
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  editDescriptionInput: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    minHeight: 60,
    textAlignVertical: "top",
  },
  editTagsRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  editTagInputGroup: {
    flex: 1,
    gap: spacing[1],
  },
  editTagInput: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  editStatsRow: {
    flexDirection: "row",
    padding: spacing[3],
    gap: spacing[2],
  },
  editStatItem: {
    flex: 1,
    gap: spacing[2],
  },
  editStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  editStatInput: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    textAlign: "center",
  },
  // Edit ingredients styles
  editIngredientsContainer: {
    gap: spacing[2],
  },
  editIngredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  editIngredientInputs: {
    flex: 1,
    flexDirection: "row",
    gap: spacing[2],
  },
  editIngredientInput: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  editIngredientQty: {
    width: 55,
    textAlign: "center",
  },
  editIngredientUnit: {
    width: 65,
  },
  editIngredientName: {
    flex: 1,
  },
  editDeleteButton: {
    padding: spacing[2],
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    borderStyle: "dashed",
  },
  // Edit steps styles
  editStepsContainer: {
    gap: spacing[3],
  },
  editStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
  },
  editStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing[2],
  },
  editStepInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    minHeight: 80,
    textAlignVertical: "top",
  },
});
