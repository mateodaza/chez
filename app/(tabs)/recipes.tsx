import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ScrollView,
  View,
  RefreshControl,
  StyleSheet,
  Pressable,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Link, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { formatTime } from "@/lib/format";
import { useCookingModeWithLoading, useSubscription } from "@/hooks";
import {
  Text,
  Card,
  Button,
  SkeletonRecipeList,
  RecipeThumbnail,
} from "@/components/ui";
import {
  RecipeTypeToggle,
  type RecipeListType,
} from "@/components/RecipeTypeToggle";
import { colors, spacing, layout, borderRadius } from "@/constants/theme";
import { CHALLENGE_CONFIG } from "@/constants/challenge-config";
import type {
  MasterRecipe,
  MasterRecipeVersion,
  VideoSource,
} from "@/types/database";

interface RecipeWithDetails extends MasterRecipe {
  current_version: Pick<
    MasterRecipeVersion,
    "id" | "prep_time_minutes" | "cook_time_minutes" | "ingredients" | "steps"
  > | null;
  cover_video_source: Pick<
    VideoSource,
    "source_platform" | "source_creator" | "source_thumbnail_url"
  > | null;
  source_count: number;
}

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const { isLoading: _prefsLoading } = useCookingModeWithLoading();
  // Use subscription status for feature gating, not cooking mode preference
  const { isChef: _isChef } = useSubscription();
  const [recipes, setRecipes] = useState<RecipeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<RecipeListType>("saved");

  // Classify and filter recipes
  const { savedRecipes, cookbookRecipes, filteredRecipes } = useMemo(() => {
    const saved = recipes.filter(
      (r) => !r.forked_from_id && r.source_count > 0
    );
    const cookbook = recipes.filter(
      (r) => r.forked_from_id || r.source_count === 0
    );
    return {
      savedRecipes: saved,
      cookbookRecipes: cookbook,
      filteredRecipes: selectedType === "saved" ? saved : cookbook,
    };
  }, [recipes, selectedType]);

  const fetchRecipes = useCallback(async () => {
    try {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      // Fetch master recipes with current version and cover video source
      const { data: masterRecipes, error: fetchError } = await supabase
        .from("master_recipes")
        .select(
          `
          *,
          current_version:master_recipe_versions!fk_current_version(
            id,
            prep_time_minutes,
            cook_time_minutes,
            ingredients,
            steps
          ),
          cover_video_source:video_sources(
            source_platform,
            source_creator,
            source_thumbnail_url
          )
        `
        )
        .eq("user_id", user.id)
        .not("id", "in", `(${CHALLENGE_CONFIG.recipeIds.join(",")})`)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Get source counts for each recipe
      const recipeIds = (masterRecipes || []).map((r) => r.id);
      let sourceCounts: Record<string, number> = {};

      if (recipeIds.length > 0) {
        const { data: linkCounts } = await supabase
          .from("recipe_source_links")
          .select("master_recipe_id")
          .in("master_recipe_id", recipeIds)
          .eq("link_status", "linked");

        // Count sources per recipe
        sourceCounts = (linkCounts || []).reduce(
          (acc, link) => {
            const id = link.master_recipe_id;
            if (id) {
              acc[id] = (acc[id] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>
        );
      }

      // Combine data
      // Supabase returns arrays for joined data even for single relations
      const recipesWithDetails: RecipeWithDetails[] = (masterRecipes || []).map(
        (recipe) => {
          const versionArray = recipe.current_version as unknown as
            | RecipeWithDetails["current_version"][]
            | null;
          return {
            ...recipe,
            current_version: versionArray?.[0] || null,
            cover_video_source: recipe.cover_video_source || null,
            source_count: sourceCounts[recipe.id] || 0,
          };
        }
      );

      setRecipes(recipesWithDetails);
    } catch (err) {
      console.error("Error fetching recipes:", err);
      setError(err instanceof Error ? err.message : "Failed to load recipes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [fetchRecipes])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecipes();
  }, [fetchRecipes]);

  const getTotalTime = (recipe: RecipeWithDetails) => {
    const prep = recipe.current_version?.prep_time_minutes || 0;
    const cook = recipe.current_version?.cook_time_minutes || 0;
    const total = prep + cook;
    return total > 0 ? formatTime(total) : null;
  };

  const getIngredientCount = (recipe: RecipeWithDetails) => {
    const ingredients = recipe.current_version?.ingredients;
    if (Array.isArray(ingredients)) return ingredients.length;
    return 0;
  };

  const getStepCount = (recipe: RecipeWithDetails) => {
    const steps = recipe.current_version?.steps;
    if (Array.isArray(steps)) return steps.length;
    return 0;
  };

  if (loading) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing[4],
            paddingBottom: insets.bottom + spacing[8],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="h1">Recipes</Text>
        </View>
        <SkeletonRecipeList count={6} />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing[4],
            paddingBottom: insets.bottom + spacing[8],
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Card variant="outlined" style={styles.errorCard}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={24} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text variant="label" color="error">
                Error loading recipes
              </Text>
              <Text variant="bodySmall" color="error">
                {error}
              </Text>
            </View>
          </View>
          <Button variant="secondary" size="sm" onPress={onRefresh}>
            Try Again
          </Button>
        </Card>
      </ScrollView>
    );
  }

  // Global empty state (no recipes at all)
  if (recipes.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.emptyContent,
          {
            paddingTop: insets.top + spacing[8],
            paddingBottom: insets.bottom + spacing[8],
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="book" size={48} color={colors.textMuted} />
          </View>
          <Text variant="h2">No recipes yet</Text>
          <Text variant="body" color="textSecondary" style={styles.emptyText}>
            Import your first recipe from TikTok, YouTube, or Instagram
          </Text>
          <Link href="/import" asChild>
            <Button>Import Recipe</Button>
          </Link>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing[4],
          paddingBottom: insets.bottom + spacing[8],
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="h1">Recipes</Text>
        <Text variant="bodySmall" color="textSecondary">
          {recipes.length} total
        </Text>
      </View>

      {/* Recipe Type Toggle */}
      <RecipeTypeToggle
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        savedCount={savedRecipes.length}
        cookbookCount={cookbookRecipes.length}
      />

      {/* Section-aware empty state */}
      {filteredRecipes.length === 0 ? (
        <View style={styles.sectionEmptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={selectedType === "saved" ? "bookmark" : "book"}
              size={40}
              color={colors.textMuted}
            />
          </View>
          <Text variant="h3">
            {selectedType === "saved"
              ? "No saved recipes yet"
              : "Your cookbook is empty"}
          </Text>
          <Text variant="body" color="textSecondary" style={styles.emptyText}>
            {selectedType === "saved"
              ? "Import recipes from YouTube, TikTok, or Instagram"
              : "Save a recipe to your cookbook or create one from scratch"}
          </Text>
          <Link
            href={selectedType === "saved" ? "/import" : "/manual-entry"}
            asChild
          >
            <Button>
              {selectedType === "saved" ? "Import Recipe" : "Create Recipe"}
            </Button>
          </Link>
        </View>
      ) : (
        <>
          {/* Recipe List */}
          <View style={styles.list}>
            {filteredRecipes.map((recipe, index) => {
              const _platform =
                recipe.cover_video_source?.source_platform || null;
              const _isForked = !!recipe.forked_from_id;

              const thumbnail = recipe.cover_video_source?.source_thumbnail_url;
              const ingredientCount = getIngredientCount(recipe);
              const stepCount = getStepCount(recipe);
              const totalTime = getTotalTime(recipe);

              return (
                <Animated.View
                  key={recipe.id}
                  entering={FadeInDown.delay(index * 60).springify()}
                >
                  <Link href={`/recipe/${recipe.id}`} asChild>
                    <Pressable>
                      <View style={styles.recipeCard}>
                        {/* Thumbnail or mode icon */}
                        <RecipeThumbnail uri={thumbnail} mode={recipe.mode} />

                        {/* Content */}
                        <View style={styles.recipeContent}>
                          <Text variant="label" numberOfLines={2}>
                            {recipe.title}
                          </Text>

                          {recipe.description ? (
                            <Text
                              variant="caption"
                              color="textSecondary"
                              numberOfLines={1}
                            >
                              {recipe.description}
                            </Text>
                          ) : null}

                          {/* Meta chips */}
                          <View style={styles.metaRow}>
                            {ingredientCount > 0 && (
                              <View style={styles.metaChip}>
                                <Ionicons
                                  name="leaf-outline"
                                  size={11}
                                  color={colors.textMuted}
                                />
                                <Text variant="caption" color="textMuted">
                                  {ingredientCount}
                                </Text>
                              </View>
                            )}
                            {stepCount > 0 && (
                              <View style={styles.metaChip}>
                                <Ionicons
                                  name="list-outline"
                                  size={11}
                                  color={colors.textMuted}
                                />
                                <Text variant="caption" color="textMuted">
                                  {stepCount} steps
                                </Text>
                              </View>
                            )}
                            {totalTime && (
                              <View style={styles.metaChip}>
                                <Ionicons
                                  name="time-outline"
                                  size={11}
                                  color={colors.textMuted}
                                />
                                <Text variant="caption" color="textMuted">
                                  {totalTime}
                                </Text>
                              </View>
                            )}
                            {(recipe.times_cooked ?? 0) > 0 && (
                              <View
                                style={[
                                  styles.metaChip,
                                  { backgroundColor: "#FFF7ED" },
                                ]}
                              >
                                <Ionicons
                                  name="flame"
                                  size={11}
                                  color={colors.primary}
                                />
                                <Text variant="caption" color="primary">
                                  Cooked {recipe.times_cooked}x
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.textMuted}
                        />
                      </View>
                    </Pressable>
                  </Link>
                </Animated.View>
              );
            })}
          </View>

          {/* Add recipe CTA */}
          <Link
            href={selectedType === "saved" ? "/import" : "/manual-entry"}
            asChild
          >
            <Pressable style={styles.importCard}>
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={colors.primary}
              />
              <Text variant="label" color="primary">
                {selectedType === "saved"
                  ? "Import another recipe"
                  : "Create a recipe"}
              </Text>
            </Pressable>
          </Link>
        </>
      )}
    </ScrollView>
  );
}

type NativeStyle = (ViewStyle & ImageStyle) & { boxShadow?: string };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: layout.screenPaddingHorizontal,
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  emptyContent: {
    padding: layout.screenPaddingHorizontal,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
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
  emptyState: {
    alignItems: "center",
    gap: spacing[4],
    paddingVertical: spacing[8],
  },
  sectionEmptyState: {
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[6],
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 280,
  },
  list: {
    gap: spacing[3],
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing[3],
    gap: spacing[3],
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  } as NativeStyle,
  recipeContent: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: 2,
    flexWrap: "wrap",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  importCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
  } as NativeStyle,
});
