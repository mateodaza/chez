import { useEffect, useState, useCallback, useRef } from "react";
import {
  Link,
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
  Alert,
  StyleSheet,
  Linking,
  TextInput,
  Modal,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Text, Card, Button } from "@/components/ui";
import {
  colors,
  spacing,
  layout,
  borderRadius,
  fontFamily,
  fontSize,
} from "@/constants/theme";
import type {
  MasterRecipe,
  MasterRecipeVersion,
  RecipeSourceLink,
  VideoSource,
  VersionIngredient,
  VersionStep,
} from "@/types/database";

// Extended types for fetched data with joins
interface RecipeWithVersion extends MasterRecipe {
  current_version:
    | (Pick<
        MasterRecipeVersion,
        | "id"
        | "prep_time_minutes"
        | "cook_time_minutes"
        | "servings"
        | "servings_unit"
        | "difficulty_score"
        | "ingredients"
        | "steps"
        | "version_number"
      > & {
        based_on_source_id?: string | null;
        change_notes?: string | null;
      })
    | null;
}

interface SourceLinkWithVideo extends RecipeSourceLink {
  video_sources: Pick<
    VideoSource,
    | "id"
    | "source_url"
    | "source_platform"
    | "source_creator"
    | "source_thumbnail_url"
  > | null;
}

// Tab types
type TabType = "my_version" | string; // string is source_link_id

interface Ingredient {
  id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  is_optional: boolean | null;
  sort_order: number | null;
  original_text: string | null;
  confidence_status: string | null;
  suggested_correction: string | null;
  user_verified: boolean | null;
}

interface Step {
  id: string;
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  temperature_value: number | null;
  temperature_unit: string | null;
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<RecipeWithVersion | null>(null);
  const [sourceLinks, setSourceLinks] = useState<SourceLinkWithVideo[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Tab state for My Version vs Sources
  const [activeTab, setActiveTab] = useState<TabType>("my_version");

  // Edit ingredient modal state
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [editItem, setEditItem] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPreparation, setEditPreparation] = useState("");
  const [saving, setSaving] = useState(false);

  // Track if this is the initial mount to control tab switching behavior
  const isInitialMount = useRef(true);

  const fetchRecipe = useCallback(
    async (isRefresh = false) => {
      if (!id) return;

      try {
        // Fetch master recipe with current version
        const { data: masterRecipe, error: recipeError } = await supabase
          .from("master_recipes")
          .select(
            `
          *,
          current_version:master_recipe_versions!fk_current_version(
            id,
            version_number,
            prep_time_minutes,
            cook_time_minutes,
            servings,
            servings_unit,
            difficulty_score,
            ingredients,
            steps,
            based_on_source_id,
            change_notes
          )
        `
          )
          .eq("id", id)
          .single();

        if (recipeError) throw recipeError;

        // Transform the nested array to single object
        // Supabase returns arrays for joined data even for single relations
        const currentVersionArray = masterRecipe.current_version as unknown as
          | RecipeWithVersion["current_version"][]
          | null;
        const recipeWithVersion: RecipeWithVersion = {
          ...masterRecipe,
          current_version: currentVersionArray?.[0] || null,
        };

        // Debug: Log version info to help diagnose My Version tab issues
        console.log("[RecipeDetail] Fetched recipe version info:", {
          recipeId: id,
          isRefresh,
          versionNumber: recipeWithVersion.current_version?.version_number,
          hasBasedOnSource:
            !!recipeWithVersion.current_version?.based_on_source_id,
          changeNotes:
            recipeWithVersion.current_version?.change_notes?.substring(0, 50),
        });

        setRecipe(recipeWithVersion);

        // Extract ingredients and steps from current version JSONB
        const versionIngredients =
          (recipeWithVersion.current_version
            ?.ingredients as unknown as VersionIngredient[]) || [];
        const versionSteps =
          (recipeWithVersion.current_version
            ?.steps as unknown as VersionStep[]) || [];

        // Map to UI format
        setIngredients(
          versionIngredients.map((ing, idx) => ({
            id: ing.id || `ing-${idx}`,
            item: ing.item,
            quantity: ing.quantity,
            unit: ing.unit,
            preparation: ing.preparation,
            is_optional: ing.is_optional,
            sort_order: ing.sort_order ?? idx,
            original_text: ing.original_text,
            confidence_status: ing.confidence_status,
            suggested_correction: null,
            user_verified: ing.user_verified,
          }))
        );

        setSteps(
          versionSteps.map((step, idx) => ({
            id: step.id || `step-${idx}`,
            step_number: step.step_number,
            instruction: step.instruction,
            duration_minutes: step.duration_minutes,
            temperature_value: step.temperature_value,
            temperature_unit: step.temperature_unit,
          }))
        );

        // Fetch source links for this master recipe
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
          .eq("master_recipe_id", id)
          .eq("link_status", "linked");

        if (linksError) {
          console.error("Error fetching source links:", linksError);
        } else {
          setSourceLinks(links || []);

          // Set default tab based on whether user has modified the recipe
          // If version > 1, user has made changes, so show "my_version"
          // Otherwise, show the first source directly
          const versionNumber =
            recipeWithVersion.current_version?.version_number ?? 1;

          // Debug: Log tab switching logic
          console.log("[RecipeDetail] Tab switching logic:", {
            isRefresh,
            versionNumber,
            linksCount: links?.length,
            currentActiveTab: activeTab,
          });

          if (!isRefresh) {
            if (versionNumber === 1 && links && links.length > 0) {
              setActiveTab(links[0].id);
            } else if (versionNumber > 1) {
              // If user has a version, show My Version tab
              setActiveTab("my_version");
            }
          } else if (isRefresh && versionNumber > 1) {
            // On refresh after cooking, if a new version was created, switch to My Version
            setActiveTab("my_version");
          }
        }
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  // Initial fetch
  useEffect(() => {
    fetchRecipe(false);
  }, [fetchRecipe]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecipe(true);
    setRefreshing(false);
  }, [fetchRecipe]);

  // Refetch when screen comes back into focus (e.g., after cooking)
  useFocusEffect(
    useCallback(() => {
      // Skip the initial mount - the useEffect above handles that
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      // Refetch data when returning to this screen
      fetchRecipe(true);
    }, [fetchRecipe])
  );

  // Get display data based on active tab
  const getDisplayData = useCallback(() => {
    if (activeTab === "my_version") {
      return { ingredients, steps };
    }

    // Find the source link for this tab
    const sourceLink = sourceLinks.find((link) => link.id === activeTab);
    if (!sourceLink) {
      return { ingredients, steps };
    }

    // Map source link extracted data to UI format
    const sourceIngredients =
      (sourceLink.extracted_ingredients as unknown as VersionIngredient[]) ||
      [];
    const sourceSteps =
      (sourceLink.extracted_steps as unknown as VersionStep[]) || [];

    return {
      ingredients: sourceIngredients.map((ing, idx) => ({
        id: ing.id || `src-ing-${idx}`,
        item: ing.item,
        quantity: ing.quantity,
        unit: ing.unit,
        preparation: ing.preparation,
        is_optional: ing.is_optional,
        sort_order: ing.sort_order ?? idx,
        original_text: ing.original_text,
        confidence_status: ing.confidence_status,
        suggested_correction: null,
        user_verified: ing.user_verified,
      })),
      steps: sourceSteps.map((step, idx) => ({
        id: step.id || `src-step-${idx}`,
        step_number: step.step_number,
        instruction: step.instruction,
        duration_minutes: step.duration_minutes,
        temperature_value: step.temperature_value,
        temperature_unit: step.temperature_unit,
      })),
    };
  }, [activeTab, ingredients, steps, sourceLinks]);

  const displayData = getDisplayData();

  // Get source info for the current active tab
  const getActiveSourceInfo = useCallback(() => {
    if (activeTab === "my_version") {
      // For "My Version", get cover video source info
      const coverSource = sourceLinks.find(
        (link) => link.video_source_id === recipe?.cover_video_source_id
      );
      return coverSource?.video_sources || null;
    }
    const sourceLink = sourceLinks.find((link) => link.id === activeTab);
    return sourceLink?.video_sources || null;
  }, [activeTab, sourceLinks, recipe?.cover_video_source_id]);

  // Get source attribution for "My Version" when it's based on a source
  const getVersionAttribution = useCallback(() => {
    if (activeTab !== "my_version") return null;

    const basedOnSourceId = recipe?.current_version?.based_on_source_id;
    if (!basedOnSourceId) return null;

    // Find the source link this version is based on
    const baseSource = sourceLinks.find((link) => link.id === basedOnSourceId);
    if (!baseSource?.video_sources?.source_creator) return null;

    return {
      creatorName: baseSource.video_sources.source_creator,
      changeNotes: recipe?.current_version?.change_notes,
    };
  }, [
    activeTab,
    recipe?.current_version?.based_on_source_id,
    recipe?.current_version?.change_notes,
    sourceLinks,
  ]);

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
    if (!editingIngredient || !editItem.trim() || !recipe || !id) return;

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

      // Update local state first for responsiveness
      const newIngredients = ingredients.map((ing) =>
        ing.id === editingIngredient.id ? updatedIngredient : ing
      );
      setIngredients(newIngredients);
      closeEditModal();

      // Get the current version number to create next version
      const { data: versions } = await supabase
        .from("master_recipe_versions")
        .select("version_number")
        .eq("master_recipe_id", id)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersionNumber = (versions?.[0]?.version_number || 0) + 1;

      // Convert ingredients back to JSONB format
      const ingredientsJsonb = newIngredients.map((ing) => ({
        id: ing.id,
        item: ing.item,
        quantity: ing.quantity,
        unit: ing.unit,
        preparation: ing.preparation,
        is_optional: ing.is_optional,
        sort_order: ing.sort_order,
        original_text: ing.original_text,
        confidence_status: ing.confidence_status,
        user_verified: ing.user_verified,
      }));

      // Convert steps back to JSONB format
      const stepsJsonb = steps.map((step) => ({
        id: step.id,
        step_number: step.step_number,
        instruction: step.instruction,
        duration_minutes: step.duration_minutes,
        temperature_value: step.temperature_value,
        temperature_unit: step.temperature_unit,
      }));

      // Create new version with updated ingredients
      const { data: newVersion, error: versionError } = await supabase
        .from("master_recipe_versions")
        .insert({
          master_recipe_id: id,
          version_number: nextVersionNumber,
          title: recipe.title,
          description: recipe.description,
          mode: recipe.mode,
          cuisine: recipe.cuisine,
          prep_time_minutes: recipe.current_version?.prep_time_minutes,
          cook_time_minutes: recipe.current_version?.cook_time_minutes,
          servings: recipe.current_version?.servings,
          servings_unit: recipe.current_version?.servings_unit,
          difficulty_score: recipe.current_version?.difficulty_score,
          ingredients: ingredientsJsonb,
          steps: stepsJsonb,
          change_notes: `Updated ingredient: ${updatedIngredient.item}`,
        })
        .select("id")
        .single();

      if (versionError) {
        console.error("Failed to create new version:", versionError);
        Alert.alert("Error", "Failed to save changes to the server");
        return;
      }

      // Update master recipe to point to new version
      const { error: updateError } = await supabase
        .from("master_recipes")
        .update({ current_version_id: newVersion.id })
        .eq("id", id);

      if (updateError) {
        console.error("Failed to update current version:", updateError);
        Alert.alert("Error", "Failed to update recipe version");
        return;
      }

      // Update local recipe state with new version to keep UI in sync
      setRecipe((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_version_id: newVersion.id,
          current_version: {
            id: newVersion.id,
            prep_time_minutes: prev.current_version?.prep_time_minutes ?? null,
            cook_time_minutes: prev.current_version?.cook_time_minutes ?? null,
            servings: prev.current_version?.servings ?? null,
            servings_unit: prev.current_version?.servings_unit ?? null,
            difficulty_score: prev.current_version?.difficulty_score ?? null,
            ingredients: ingredientsJsonb,
            steps: stepsJsonb,
            version_number: nextVersionNumber,
          },
        };
      });
    } catch (err) {
      console.error("Error saving ingredient:", err);
      Alert.alert("Error", "Failed to save changes");
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
    recipe,
    id,
    ingredients,
    steps,
  ]);

  const handleOpenSource = useCallback(async () => {
    const sourceInfo = getActiveSourceInfo();
    if (sourceInfo?.source_url) {
      try {
        await Linking.openURL(sourceInfo.source_url);
      } catch {
        Alert.alert("Error", "Could not open the video link");
      }
    }
  }, [getActiveSourceInfo]);

  const getPlatformIcon = (
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
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.primary} />
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
    (recipe.current_version?.prep_time_minutes || 0) +
    (recipe.current_version?.cook_time_minutes || 0);

  const activeSourceInfo = getActiveSourceInfo();
  const versionAttribution = getVersionAttribution();
  const hasMyVersion = (recipe.current_version?.version_number ?? 1) > 1;
  // Only show as read-only when viewing a source tab AND user has a My Version they can switch to
  const isReadOnly = activeTab !== "my_version" && hasMyVersion;

  return (
    <>
      <Stack.Screen options={{ title: "", headerShown: false }} />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top, paddingBottom: 100 }, // Extra padding for fixed button
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
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text variant="h1">{recipe.title}</Text>
            {recipe.description && (
              <Text variant="body" color="textSecondary">
                {recipe.description}
              </Text>
            )}
            {/* Creator info - only show on source tabs, not My Version */}
            {activeTab !== "my_version" && activeSourceInfo?.source_creator && (
              <View style={styles.creatorRow}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={colors.textMuted}
                />
                <Text variant="caption" color="textMuted">
                  {activeSourceInfo.source_creator}
                </Text>
              </View>
            )}
            {/* Source attribution for My Version */}
            {versionAttribution && (
              <View style={styles.attributionRow}>
                <Ionicons
                  name="git-branch-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text variant="caption" color="textSecondary">
                  Based on{" "}
                  <Text variant="caption" style={{ fontWeight: "600" }}>
                    {versionAttribution.creatorName}&apos;s
                  </Text>{" "}
                  recipe, with your modifications
                </Text>
              </View>
            )}
          </View>

          {/* Source Tabs - only show if user has modified the recipe (version > 1) or there are multiple sources */}
          {sourceLinks.length > 0 &&
            ((recipe.current_version?.version_number ?? 1) > 1 ||
              sourceLinks.length > 1) && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsContainer}
                contentContainerStyle={styles.tabsContent}
              >
                {/* My Version tab - only show if user has made modifications (version > 1) */}
                {(recipe.current_version?.version_number ?? 1) > 1 && (
                  <Pressable
                    style={[
                      styles.tab,
                      activeTab === "my_version" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("my_version")}
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={
                        activeTab === "my_version"
                          ? colors.textPrimary
                          : colors.textMuted
                      }
                    />
                    <Text
                      variant="label"
                      color={
                        activeTab === "my_version" ? "textPrimary" : "textMuted"
                      }
                    >
                      My Version
                    </Text>
                  </Pressable>
                )}

                {sourceLinks.map((link) => (
                  <Pressable
                    key={link.id}
                    style={[
                      styles.tab,
                      activeTab === link.id && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab(link.id)}
                  >
                    <Ionicons
                      name={getPlatformIcon(
                        link.video_sources?.source_platform || null
                      )}
                      size={16}
                      color={
                        activeTab === link.id
                          ? colors.textPrimary
                          : colors.textMuted
                      }
                    />
                    <Text
                      variant="label"
                      color={
                        activeTab === link.id ? "textPrimary" : "textMuted"
                      }
                      numberOfLines={1}
                      style={styles.tabLabel}
                    >
                      {link.video_sources?.source_creator || "Source"}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

          {/* Tags */}
          <View style={styles.tagsRow}>
            {/* Platform tag - clickable to open source */}
            {activeSourceInfo?.source_url && (
              <Pressable onPress={handleOpenSource} style={styles.tag}>
                <Ionicons
                  name={getPlatformIcon(activeSourceInfo.source_platform)}
                  size={12}
                  color={colors.textSecondary}
                />
                <Text variant="caption" color="textSecondary">
                  {activeSourceInfo.source_platform}
                </Text>
                <Ionicons
                  name="open-outline"
                  size={10}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
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

          {/* Stats Card */}
          {(recipe.current_version?.prep_time_minutes ||
            recipe.current_version?.cook_time_minutes ||
            recipe.current_version?.servings) && (
            <Card variant="elevated" padding={0}>
              <View style={styles.statsRow}>
                {recipe.current_version?.prep_time_minutes && (
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
                      {recipe.current_version.prep_time_minutes}m
                    </Text>
                  </View>
                )}
                {recipe.current_version?.cook_time_minutes && (
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
                      {recipe.current_version.cook_time_minutes}m
                    </Text>
                  </View>
                )}
                {totalTime > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text variant="caption" color="textMuted">
                      Total
                    </Text>
                    <Text variant="label" color="primary">
                      {totalTime}m
                    </Text>
                  </View>
                )}
                {recipe.current_version?.servings && (
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
                      {recipe.current_version.servings}
                      {recipe.current_version.servings_unit
                        ? ` ${recipe.current_version.servings_unit}`
                        : ""}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Read-only banner for source tabs */}
          {isReadOnly && (
            <View style={styles.readOnlyBanner}>
              <Ionicons name="eye-outline" size={18} color={colors.textMuted} />
              <Text variant="bodySmall" color="textMuted">
                Viewing original source. Switch to &quot;My Version&quot; to
                edit.
              </Text>
            </View>
          )}

          {/* Ingredients Section */}
          {displayData.ingredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons
                    name="list-outline"
                    size={20}
                    color={colors.textPrimary}
                  />
                  <Text variant="h3">Ingredients</Text>
                  <Text variant="caption" color="textMuted">
                    {displayData.ingredients.length}
                  </Text>
                </View>
                {!isReadOnly && needsReviewCount > 0 && (
                  <View style={styles.reviewBadge}>
                    <Ionicons name="alert-circle" size={14} color="#92400E" />
                    <Text variant="caption" style={{ color: "#92400E" }}>
                      {needsReviewCount} to review
                    </Text>
                  </View>
                )}
              </View>

              <Card variant="outlined" padding={0}>
                {displayData.ingredients.map((ing, index) => {
                  const status = getIngredientStatus(ing);
                  const needsAttention =
                    !isReadOnly &&
                    (status === "review" || status === "inferred");

                  return (
                    <Pressable
                      key={ing.id}
                      onPress={() => !isReadOnly && openEditModal(ing)}
                      disabled={isReadOnly}
                      style={[
                        styles.ingredientRow,
                        index < displayData.ingredients.length - 1 &&
                          styles.ingredientBorder,
                        !isReadOnly &&
                          status === "verified" &&
                          styles.ingredientVerified,
                        !isReadOnly &&
                          status === "review" &&
                          styles.ingredientReview,
                        !isReadOnly &&
                          status === "inferred" &&
                          styles.ingredientInferred,
                      ]}
                    >
                      <View
                        style={[
                          styles.ingredientIcon,
                          !isReadOnly &&
                            status === "verified" &&
                            styles.ingredientIconVerified,
                          !isReadOnly &&
                            status === "review" &&
                            styles.ingredientIconReview,
                          !isReadOnly &&
                            status === "inferred" &&
                            styles.ingredientIconInferred,
                        ]}
                      >
                        {!isReadOnly && status === "verified" ? (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : !isReadOnly && status === "review" ? (
                          <Ionicons name="help" size={12} color="#fff" />
                        ) : !isReadOnly && status === "inferred" ? (
                          <Ionicons name="sparkles" size={12} color="#fff" />
                        ) : (
                          <View style={styles.bulletDot} />
                        )}
                      </View>
                      <View style={styles.ingredientContent}>
                        <Text
                          variant="body"
                          color={ing.is_optional ? "textMuted" : "textPrimary"}
                        >
                          {formatQuantity(ing)}
                          {ing.is_optional && (
                            <Text variant="caption" color="textMuted">
                              {" "}
                              (optional)
                            </Text>
                          )}
                        </Text>
                        {needsAttention && (
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
                      {!isReadOnly && (
                        <Ionicons
                          name="pencil-outline"
                          size={16}
                          color={needsAttention ? "#92400E" : colors.textMuted}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </Card>

              {!isReadOnly && needsReviewCount > 0 && (
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

          {/* Steps Section */}
          {displayData.steps.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="reader-outline"
                  size={20}
                  color={colors.textPrimary}
                />
                <Text variant="h3">Instructions</Text>
                <Text variant="caption" color="textMuted">
                  {displayData.steps.length} steps
                </Text>
              </View>

              <View style={styles.stepsContainer}>
                {displayData.steps.map((step, index) => (
                  <View key={step.id} style={styles.stepItem}>
                    <View style={styles.stepNumberContainer}>
                      <View style={styles.stepNumber}>
                        <Text variant="label" color="textOnPrimary">
                          {step.step_number}
                        </Text>
                      </View>
                      {index < displayData.steps.length - 1 && (
                        <View style={styles.stepLine} />
                      )}
                    </View>
                    <Card variant="elevated" style={styles.stepCard}>
                      {(step.duration_minutes || step.temperature_value) && (
                        <View style={styles.stepMeta}>
                          {step.duration_minutes && (
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
                          {step.temperature_value && (
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
            </View>
          )}
        </ScrollView>

        {/* Fixed Start Cooking Button */}
        <View style={styles.fixedBottomContainer}>
          <Link
            href={`/cook/${id}${activeTab !== "my_version" ? `?source=${activeTab}` : ""}`}
            asChild
          >
            <Pressable style={styles.startButton}>
              <View style={styles.startButtonContent}>
                <Ionicons
                  name="play-circle"
                  size={28}
                  color={colors.textOnPrimary}
                />
                <View>
                  <Text variant="h4" color="textOnPrimary">
                    Cook this Recipe
                  </Text>
                  {isReadOnly && (
                    <Text variant="caption" style={styles.cookingHint}>
                      Uses My Version
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
            </Pressable>
          </Link>
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
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  attributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[2],
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  tabsContainer: {
    marginHorizontal: -layout.screenPaddingHorizontal,
  },
  tabsContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    gap: spacing[2],
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tabLabel: {
    maxWidth: 100,
  },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
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
  startButton: {
    backgroundColor: colors.primary,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
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
  ingredientContent: {
    flex: 1,
  },
  reviewHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[1],
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
});
