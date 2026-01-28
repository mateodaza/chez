import { useState, useCallback, useMemo } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Button } from "@/components/ui";
import { CompareModal } from "@/components/CompareModal";
import { VersionHistoryModal } from "@/components/VersionHistoryModal";
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
  type DisplayIngredient,
  type DisplayStep,
  type SourceLinkWithVideo,
} from "@/hooks";
import type { VersionIngredient, VersionStep } from "@/types/database";

// Alias types from hook for local use
type Ingredient = DisplayIngredient;
type _Step = DisplayStep;

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

  // Use the centralized hook for recipe + version data
  const {
    recipe,
    activeVersion,
    previewedVersion,
    allVersions,
    sourceLinks,
    ingredients,
    steps,
    isLoading: loading,
    error,
    isPreviewingDifferentVersion,
    previewVersion,
    makeActive,
    createVersion,
    deleteVersion,
    refetch,
  } = useRecipeWithVersion(id);

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

  // Version history modal state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Source browser modal state
  const [sourceBrowserVisible, setSourceBrowserVisible] = useState(false);
  const [compareSourceOverride, setCompareSourceOverride] =
    useState<SourceLinkWithVideo | null>(null);

  // Instructions collapsed by default - focus on ingredients first
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);

  // Grocery list modal state and hook
  const [groceryModalVisible, setGroceryModalVisible] = useState(false);
  const { addIngredientsToGroceryList } = useGroceryList();

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

  // Derived values
  const hasMultipleVersions = allVersions.length > 1;
  const currentVersionNumber = previewedVersion?.version_number ?? 1;

  // Get source attribution for the current version
  const getVersionAttribution = useCallback(() => {
    const basedOnSourceId = previewedVersion?.based_on_source_id;
    if (!basedOnSourceId) return null;

    const baseSource = sourceLinks.find((link) => link.id === basedOnSourceId);
    if (!baseSource?.video_sources?.source_creator) return null;

    return {
      creatorName: baseSource.video_sources.source_creator,
      sourceLink: baseSource,
    };
  }, [previewedVersion?.based_on_source_id, sourceLinks]);

  // Get cover video source for attribution
  const getCoverSourceInfo = useCallback(() => {
    const coverSource = sourceLinks.find(
      (link) => link.video_source_id === recipe?.cover_video_source_id
    );
    return coverSource?.video_sources || null;
  }, [sourceLinks, recipe?.cover_video_source_id]);

  // Determine if Compare button should be visible (beginner guard)
  // Show Compare only after 2+ versions OR 2+ sources exist
  const canShowCompare = useMemo(() => {
    return allVersions.length >= 2 || sourceLinks.length >= 2;
  }, [allVersions.length, sourceLinks.length]);

  // Get source for comparison - walks version lineage to find nearest ancestor with source
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
    if (previewedVersion?.based_on_source_id) {
      const source = sourceLinks.find(
        (link) => link.id === previewedVersion.based_on_source_id
      );
      if (source && hasValidExtractedData(source)) {
        return source;
      }
    }

    // 2. Walk version lineage to find nearest ancestor with based_on_source_id
    let currentVersionId = previewedVersion?.parent_version_id;
    const visitedIds = new Set<string>();

    while (currentVersionId && !visitedIds.has(currentVersionId)) {
      visitedIds.add(currentVersionId);
      const ancestorVersion = allVersions.find(
        (v) => v.id === currentVersionId
      );

      if (ancestorVersion?.based_on_source_id) {
        const source = sourceLinks.find(
          (link) => link.id === ancestorVersion.based_on_source_id
        );
        if (source && hasValidExtractedData(source)) {
          return source;
        }
      }

      currentVersionId = ancestorVersion?.parent_version_id ?? null;
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
    previewedVersion,
    allVersions,
    sourceLinks,
    recipe?.cover_video_source_id,
  ]);

  // Get the active compare source (override or default)
  const getActiveCompareSource = useCallback(() => {
    return compareSourceOverride || getCompareSource();
  }, [compareSourceOverride, getCompareSource]);

  // Handle applying original source data as a new version
  const handleApplyOriginal = useCallback(async () => {
    const source = getActiveCompareSource();
    if (!source || !previewedVersion) return;

    const originalIngredients =
      source.extracted_ingredients as unknown as VersionIngredient[];
    const originalSteps =
      (source.extracted_steps as unknown as VersionStep[]) || [];

    // Create new version with original source data
    const creatorName = source.video_sources?.source_creator || "Original";
    await createVersion({
      ingredients: originalIngredients,
      steps: originalSteps,
      mode: "source_apply",
      changeNotes: `Applied original source (${creatorName}) as new version`,
      parentVersionId: previewedVersion.id,
      basedOnSourceId: source.id,
      createdFromTitle: `From ${creatorName}`,
    });
    setCompareSourceOverride(null);
  }, [getActiveCompareSource, previewedVersion, createVersion]);

  // Handle comparing with a specific source (from source browser)
  const handleCompareWithSource = useCallback((source: SourceLinkWithVideo) => {
    setCompareSourceOverride(source);
    setCompareModalVisible(true);
  }, []);

  // Handle applying a source from source browser
  const handleApplySourceFromBrowser = useCallback(
    async (source: SourceLinkWithVideo) => {
      if (!previewedVersion) return;

      const originalIngredients =
        source.extracted_ingredients as unknown as VersionIngredient[];
      const originalSteps =
        (source.extracted_steps as unknown as VersionStep[]) || [];

      const creatorName = source.video_sources?.source_creator || "Original";
      await createVersion({
        ingredients: originalIngredients,
        steps: originalSteps,
        mode: "source_apply",
        changeNotes: `Applied source (${creatorName}) as new version`,
        parentVersionId: previewedVersion.id,
        basedOnSourceId: source.id,
        createdFromTitle: `From ${creatorName}`,
      });
    },
    [previewedVersion, createVersion]
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
    if (!editingIngredient || !editItem.trim() || !previewedVersion) return;

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

      // Use hook's createVersion with proper lineage
      await createVersion({
        ingredients: newIngredients.map((ing) => ({
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
        })),
        steps: steps.map((step) => ({
          id: step.id,
          step_number: step.step_number,
          instruction: step.instruction,
          duration_minutes: step.duration_minutes,
          temperature_value: step.temperature_value,
          temperature_unit: step.temperature_unit,
          equipment: step.equipment ?? [],
          techniques: step.techniques ?? [],
          timer_label: step.timer_label ?? null,
        })),
        mode: "edit",
        changeNotes: `Updated ingredient: ${updatedIngredient.item}`,
        parentVersionId: previewedVersion.id,
      });
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
    previewedVersion,
    ingredients,
    steps,
    createVersion,
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

  // Handle cooking - auto-promote previewed version to active
  const handleStartCooking = useCallback(async () => {
    if (isPreviewingDifferentVersion && previewedVersion) {
      await makeActive(previewedVersion.id);
    }
    router.push(`/cook/${id}`);
  }, [isPreviewingDifferentVersion, previewedVersion, makeActive, id]);

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
    (previewedVersion?.prep_time_minutes || 0) +
    (previewedVersion?.cook_time_minutes || 0);

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
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text variant="h1">{recipe.title}</Text>
            {recipe.description && (
              <Text variant="body" color="textSecondary">
                {recipe.description}
              </Text>
            )}
          </View>

          {/* Version Dropdown - only show if multiple versions exist */}
          {hasMultipleVersions && (
            <View style={styles.versionSection}>
              <Pressable
                style={styles.versionDropdown}
                onPress={() => setVersionDropdownOpen(!versionDropdownOpen)}
              >
                <View style={styles.versionDropdownLeft}>
                  <Ionicons
                    name="git-branch-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
                    v{currentVersionNumber}
                    {previewedVersion?.created_from_title
                      ? ` - ${previewedVersion.created_from_title}`
                      : ""}
                  </Text>
                  {activeVersion?.id === previewedVersion?.id && (
                    <View style={styles.activeBadgePrimary}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color={colors.textOnPrimary}
                      />
                      <Text
                        variant="caption"
                        style={styles.activeBadgePrimaryText}
                      >
                        Active
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={versionDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>

              {versionDropdownOpen && (
                <View style={styles.versionList}>
                  {allVersions.map((version) => {
                    const isActive = activeVersion?.id === version.id;
                    const isPreviewing = previewedVersion?.id === version.id;
                    const isPreviewingNonActive = isPreviewing && !isActive;

                    return (
                      <Pressable
                        key={version.id}
                        style={[
                          styles.versionItem,
                          isPreviewing && styles.versionItemActive,
                        ]}
                        onPress={() => {
                          previewVersion(version.id);
                          setVersionDropdownOpen(false);
                        }}
                      >
                        <View style={styles.versionItemLeft}>
                          <View style={styles.versionItemTitleRow}>
                            <Text
                              variant="body"
                              color={isPreviewing ? "primary" : "textPrimary"}
                              numberOfLines={1}
                              style={{ flex: 1 }}
                            >
                              v{version.version_number}
                              {version.created_from_title
                                ? ` - ${version.created_from_title}`
                                : ""}
                            </Text>
                            {isPreviewingNonActive && (
                              <View style={styles.previewingBadge}>
                                <Text
                                  variant="caption"
                                  style={styles.previewingBadgeText}
                                >
                                  Previewing
                                </Text>
                              </View>
                            )}
                          </View>
                          {version.created_at && (
                            <Text variant="caption" color="textMuted">
                              {new Date(
                                version.created_at
                              ).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                        {isActive ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={colors.primary}
                          />
                        ) : allVersions.length > 1 &&
                          version.version_number !== 1 ? (
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              deleteVersion(version.id);
                            }}
                            hitSlop={8}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color={colors.error}
                            />
                          </Pressable>
                        ) : null}
                      </Pressable>
                    );
                  })}

                  {/* View History button */}
                  <Pressable
                    style={styles.viewHistoryButton}
                    onPress={() => {
                      setVersionDropdownOpen(false);
                      setHistoryModalVisible(true);
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text variant="label" color="primary">
                      View Full History
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Preview Banner - shown when viewing non-active version */}
          {isPreviewingDifferentVersion && previewedVersion && (
            <View style={styles.previewBanner}>
              <Ionicons name="eye-outline" size={18} color={colors.primary} />
              <View style={styles.previewBannerTextContainer}>
                <Text variant="bodySmall" style={styles.previewBannerText}>
                  Previewing v{previewedVersion.version_number}
                </Text>
                <Text variant="caption" color="textMuted">
                  Cooking will make this active
                </Text>
              </View>
              <Pressable
                style={styles.makeActiveButton}
                onPress={() => makeActive(previewedVersion.id)}
              >
                <Text variant="label" color="primary">
                  Make Active
                </Text>
              </Pressable>
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
                    {versionAttribution ? "Based on" : "Inspired by"}
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

              {/* Action buttons - only show if 2+ sources or can compare */}
              {(sourceLinks.length >= 2 ||
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
                  {canShowCompare && getCompareSource() && (
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

          {/* Tags */}
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

          {/* Stats Card */}
          {(previewedVersion?.prep_time_minutes ||
            previewedVersion?.cook_time_minutes ||
            previewedVersion?.servings) && (
            <Card variant="elevated" padding={0}>
              <View style={styles.statsRow}>
                {previewedVersion?.prep_time_minutes && (
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
                      {previewedVersion.prep_time_minutes}m
                    </Text>
                  </View>
                )}
                {previewedVersion?.cook_time_minutes && (
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
                      {previewedVersion.cook_time_minutes}m
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
                {previewedVersion?.servings && (
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
                      {previewedVersion.servings}
                      {previewedVersion.servings_unit
                        ? ` ${previewedVersion.servings_unit}`
                        : ""}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Ingredients Section */}
          {ingredients.length > 0 && (
            <View style={styles.section}>
              {/* Line 1: Title + count + review badge */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons
                    name="list-outline"
                    size={20}
                    color={colors.textPrimary}
                  />
                  <Text variant="h3">Ingredients</Text>
                  <Text variant="caption" color="textMuted">
                    {ingredients.length}
                  </Text>
                  {needsReviewCount > 0 && (
                    <View style={styles.reviewBadge}>
                      <Ionicons name="alert-circle" size={14} color="#92400E" />
                      <Text variant="caption" style={{ color: "#92400E" }}>
                        {needsReviewCount} to verify
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Line 2: Add to Grocery button */}
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

              <Card variant="outlined" padding={0}>
                {ingredients.map((ing, index) => {
                  const status = getIngredientStatus(ing);
                  const needsAttention =
                    status === "review" || status === "inferred";

                  return (
                    <Pressable
                      key={ing.id}
                      onPress={() => openEditModal(ing)}
                      style={[
                        styles.ingredientRow,
                        index < ingredients.length - 1 &&
                          styles.ingredientBorder,
                        status === "verified" && styles.ingredientVerified,
                        status === "review" && styles.ingredientReview,
                        status === "inferred" && styles.ingredientInferred,
                      ]}
                    >
                      <View
                        style={[
                          styles.ingredientIcon,
                          status === "verified" &&
                            styles.ingredientIconVerified,
                          status === "review" && styles.ingredientIconReview,
                          status === "inferred" &&
                            styles.ingredientIconInferred,
                        ]}
                      >
                        {status === "verified" ? (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : status === "review" ? (
                          <Ionicons name="help" size={12} color="#fff" />
                        ) : status === "inferred" ? (
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
                      <Ionicons
                        name="pencil-outline"
                        size={16}
                        color={needsAttention ? "#92400E" : colors.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </Card>

              {needsReviewCount > 0 && (
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

          {/* Steps Section - Collapsed by default */}
          {steps.length > 0 && (
            <View style={styles.section}>
              <Pressable
                style={styles.instructionsHeader}
                onPress={() => setInstructionsExpanded(!instructionsExpanded)}
              >
                <View style={styles.sectionTitleRow}>
                  <Ionicons
                    name="reader-outline"
                    size={20}
                    color={colors.textPrimary}
                  />
                  <Text variant="h3">Instructions</Text>
                  <Text variant="caption" color="textMuted">
                    {steps.length} steps
                  </Text>
                </View>
                <View style={styles.expandButton}>
                  <Text variant="caption" color="primary">
                    {instructionsExpanded ? "Hide" : "Show"}
                  </Text>
                  <Ionicons
                    name={instructionsExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.primary}
                  />
                </View>
              </Pressable>

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
              )}
            </View>
          )}
        </ScrollView>

        {/* Fixed Start Cooking Button */}
        <View style={styles.fixedBottomContainer}>
          <Pressable style={styles.startButton} onPress={handleStartCooking}>
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
                {isPreviewingDifferentVersion && previewedVersion && (
                  <Text variant="caption" style={styles.cookingHint}>
                    Will cook v{previewedVersion.version_number}
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

      {/* Compare Modal */}
      {getActiveCompareSource() && (
        <CompareModal
          visible={compareModalVisible}
          onClose={() => {
            setCompareModalVisible(false);
            setCompareSourceOverride(null);
          }}
          onApplyOriginal={handleApplyOriginal}
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
          currentIngredients={ingredients.map((ing) => ({
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
            grocery_category: ing.grocery_category,
            allergens: ing.allergens ?? [],
          }))}
          currentSteps={steps.map((step) => ({
            id: step.id,
            step_number: step.step_number,
            instruction: step.instruction,
            duration_minutes: step.duration_minutes,
            temperature_value: step.temperature_value,
            temperature_unit: step.temperature_unit,
            equipment: step.equipment ?? [],
            techniques: step.techniques ?? [],
            timer_label: step.timer_label,
          }))}
          versionLabel={`v${previewedVersion?.version_number || 1}`}
        />
      )}

      {/* Version History Modal */}
      <VersionHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        versions={allVersions}
        activeVersionId={activeVersion?.id ?? null}
        previewedVersionId={previewedVersion?.id ?? null}
        onPreviewVersion={previewVersion}
        onDeleteVersion={deleteVersion}
      />

      {/* Source Browser Modal */}
      <SourceBrowserModal
        visible={sourceBrowserVisible}
        onClose={() => {
          setSourceBrowserVisible(false);
          setCompareSourceOverride(null);
        }}
        sources={sourceLinks}
        currentSourceId={previewedVersion?.based_on_source_id ?? null}
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
});
