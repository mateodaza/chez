import { useEffect, useState, useCallback } from "react";
import { Link, Stack, useLocalSearchParams, router } from "expo-router";
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

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  category: string | null;
  cuisine: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  servings_unit: string | null;
  difficulty_score: number | null;
  source_platform: string | null;
  source_creator: string | null;
  source_url: string | null;
}

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
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit ingredient modal state
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [editItem, setEditItem] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPreparation, setEditPreparation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      if (!id) return;

      try {
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", id)
          .single();

        if (recipeError) throw recipeError;
        setRecipe(recipeData);

        const { data: ingredientsData, error: ingredientsError } =
          await supabase
            .from("recipe_ingredients")
            .select("*")
            .eq("recipe_id", id)
            .order("sort_order");

        if (ingredientsError) throw ingredientsError;
        setIngredients(ingredientsData || []);

        const { data: stepsData, error: stepsError } = await supabase
          .from("recipe_steps")
          .select("*")
          .eq("recipe_id", id)
          .order("step_number");

        if (stepsError) throw stepsError;
        setSteps(stepsData || []);
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    }

    fetchRecipe();
  }, [id]);

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
    if (!editingIngredient || !editItem.trim()) return;

    setSaving(true);
    try {
      const updates = {
        item: editItem.trim(),
        quantity: editQuantity ? parseFloat(editQuantity) : null,
        unit: editUnit.trim() || null,
        preparation: editPreparation.trim() || null,
        user_verified: true,
      };

      const { error } = await supabase
        .from("recipe_ingredients")
        .update(updates)
        .eq("id", editingIngredient.id);

      if (!error) {
        setIngredients((prev) =>
          prev.map((ing) =>
            ing.id === editingIngredient.id ? { ...ing, ...updates } : ing
          )
        );
        closeEditModal();
      } else {
        Alert.alert("Error", "Failed to save changes");
      }
    } catch {
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
  ]);

  const handleOpenSource = useCallback(async () => {
    if (recipe?.source_url) {
      try {
        await Linking.openURL(recipe.source_url);
      } catch {
        Alert.alert("Error", "Could not open the video link");
      }
    }
  }, [recipe?.source_url]);

  const getModeIcon = (mode: string): keyof typeof Ionicons.glyphMap => {
    switch (mode) {
      case "cooking":
        return "flame-outline";
      case "mixology":
        return "wine-outline";
      case "pastry":
        return "cafe-outline";
      default:
        return "restaurant-outline";
    }
  };

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
    (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <>
      <Stack.Screen options={{ title: "", headerShown: false }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: insets.bottom + spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with source button */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          {recipe.source_url && (
            <Pressable onPress={handleOpenSource} style={styles.sourceButton}>
              <Ionicons
                name={getPlatformIcon(recipe.source_platform)}
                size={20}
                color={colors.textSecondary}
              />
              <Text variant="caption" color="textSecondary">
                View original
              </Text>
              <Ionicons
                name="open-outline"
                size={14}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.modeIconLarge}>
            <Ionicons
              name={getModeIcon(recipe.mode)}
              size={24}
              color={colors.primary}
            />
          </View>
          <Text variant="h1">{recipe.title}</Text>
          {recipe.description && (
            <Text variant="body" color="textSecondary">
              {recipe.description}
            </Text>
          )}
          {recipe.source_creator && (
            <View style={styles.creatorRow}>
              <Ionicons
                name="person-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text variant="caption" color="textMuted">
                {recipe.source_creator}
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {recipe.source_platform && (
            <View style={styles.tag}>
              <Ionicons
                name={getPlatformIcon(recipe.source_platform)}
                size={12}
                color={colors.textSecondary}
              />
              <Text variant="caption" color="textSecondary">
                {recipe.source_platform}
              </Text>
            </View>
          )}
          {recipe.cuisine && (
            <View style={[styles.tag, styles.tagCuisine]}>
              <Text variant="caption" style={{ color: "#9A3412" }}>
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
        {(recipe.prep_time_minutes ||
          recipe.cook_time_minutes ||
          recipe.servings) && (
          <Card variant="elevated" padding={0}>
            <View style={styles.statsRow}>
              {recipe.prep_time_minutes && (
                <View style={styles.statItem}>
                  <Ionicons
                    name="hourglass-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                  <Text variant="caption" color="textMuted">
                    Prep
                  </Text>
                  <Text variant="label">{recipe.prep_time_minutes}m</Text>
                </View>
              )}
              {recipe.cook_time_minutes && (
                <View style={styles.statItem}>
                  <Ionicons
                    name="flame-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                  <Text variant="caption" color="textMuted">
                    Cook
                  </Text>
                  <Text variant="label">{recipe.cook_time_minutes}m</Text>
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
              {recipe.servings && (
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
                    {recipe.servings}
                    {recipe.servings_unit ? ` ${recipe.servings_unit}` : ""}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Start Cooking CTA */}
        <Link href={`/cook/${id}`} asChild>
          <Pressable style={styles.startButton}>
            <View style={styles.startButtonContent}>
              <Ionicons
                name="play-circle"
                size={28}
                color={colors.textOnPrimary}
              />
              <Text variant="h4" color="textOnPrimary">
                Start Cooking
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color="rgba(255,255,255,0.7)"
            />
          </Pressable>
        </Link>

        {/* Ingredients Section */}
        {ingredients.length > 0 && (
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
                  {ingredients.length}
                </Text>
              </View>
              {needsReviewCount > 0 && (
                <View style={styles.reviewBadge}>
                  <Ionicons name="alert-circle" size={14} color="#92400E" />
                  <Text variant="caption" style={{ color: "#92400E" }}>
                    {needsReviewCount} to review
                  </Text>
                </View>
              )}
            </View>

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
                      index < ingredients.length - 1 && styles.ingredientBorder,
                      status === "verified" && styles.ingredientVerified,
                      status === "review" && styles.ingredientReview,
                      status === "inferred" && styles.ingredientInferred,
                    ]}
                  >
                    <View
                      style={[
                        styles.ingredientIcon,
                        status === "verified" && styles.ingredientIconVerified,
                        status === "review" && styles.ingredientIconReview,
                        status === "inferred" && styles.ingredientIconInferred,
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

        {/* Steps Section */}
        {steps.length > 0 && (
          <View style={styles.section}>
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
          </View>
        )}
      </ScrollView>

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
  content: {
    padding: layout.screenPaddingHorizontal,
    gap: spacing[5],
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing[2],
  },
  headerLeft: {
    width: 44,
  },
  sourceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  titleSection: {
    gap: spacing[2],
  },
  modeIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[1],
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
    backgroundColor: colors.primaryLight,
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
