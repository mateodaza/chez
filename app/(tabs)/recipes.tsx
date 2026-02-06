import { useEffect, useState, useCallback, useMemo } from "react";
import { ScrollView, View, RefreshControl, StyleSheet } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useCookingModeWithLoading, useSubscription } from "@/hooks";
import { Text, Card, Button, SkeletonRecipeList } from "@/components/ui";
import {
  RecipeTypeToggle,
  type RecipeListType,
} from "@/components/RecipeTypeToggle";
import { colors, spacing, layout } from "@/constants/theme";
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
  const { isLoading: prefsLoading } = useCookingModeWithLoading();
  // Use subscription status for feature gating, not cooking mode preference
  const { isChef } = useSubscription();
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
    return total > 0 ? `${total} min` : null;
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

  const getPlatformColor = (platform: string | null): string => {
    switch (platform) {
      case "youtube":
        return "#EF4444";
      case "tiktok":
        return "#000000";
      case "instagram":
        return "#E1306C";
      default:
        return colors.textMuted;
    }
  };

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
            <Ionicons name="book-outline" size={48} color={colors.textMuted} />
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
              name={
                selectedType === "saved" ? "bookmark-outline" : "book-outline"
              }
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
            {filteredRecipes.map((recipe) => {
              const platform =
                recipe.cover_video_source?.source_platform || null;
              const isForked = !!recipe.forked_from_id;

              return (
                <Link key={recipe.id} href={`/recipe/${recipe.id}`} asChild>
                  <Card variant="elevated" padding={0}>
                    <View style={styles.recipeCard}>
                      {/* Mode Icon - Chef mode only */}
                      {isChef && (
                        <View style={styles.modeIconContainer}>
                          <Ionicons
                            name={getModeIcon(recipe.mode)}
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                      )}

                      {/* Content */}
                      <View style={styles.recipeContent}>
                        <Text variant="label" numberOfLines={2}>
                          {recipe.title}
                        </Text>

                        {recipe.description && (
                          <Text
                            variant="caption"
                            color="textSecondary"
                            numberOfLines={1}
                          >
                            {recipe.description}
                          </Text>
                        )}

                        {/* Meta row - simplified in casual mode */}
                        <View style={styles.metaRow}>
                          {/* Platform badge - Saved recipes in Chef mode */}
                          {isChef && selectedType === "saved" && platform && (
                            <View style={styles.platformBadge}>
                              <Ionicons
                                name={getPlatformIcon(platform)}
                                size={12}
                                color={getPlatformColor(platform)}
                              />
                              <Text variant="caption" color="textMuted">
                                {platform}
                              </Text>
                            </View>
                          )}

                          {/* Sources badge - Saved recipes with multiple sources in Chef mode */}
                          {isChef &&
                            selectedType === "saved" &&
                            recipe.source_count > 1 && (
                              <View style={styles.sourcesBadge}>
                                <Ionicons
                                  name="layers-outline"
                                  size={12}
                                  color={colors.primary}
                                />
                                <Text variant="caption" color="primary">
                                  {recipe.source_count} sources
                                </Text>
                              </View>
                            )}

                          {/* Saved from imported - Cookbook recipes that came from saved recipes */}
                          {selectedType === "cookbook" && isForked && (
                            <View style={styles.forkedBadge}>
                              <Ionicons
                                name="bookmark-outline"
                                size={12}
                                color={colors.textMuted}
                              />
                              <Text variant="caption" color="textMuted">
                                From saved
                              </Text>
                            </View>
                          )}

                          {/* Time - always shown */}
                          {getTotalTime(recipe) && (
                            <View style={styles.timeBadge}>
                              <Ionicons
                                name="time-outline"
                                size={12}
                                color={colors.textMuted}
                              />
                              <Text variant="caption" color="textMuted">
                                {getTotalTime(recipe)}
                              </Text>
                            </View>
                          )}

                          {/* Cuisine - always shown */}
                          {recipe.cuisine && (
                            <Text variant="caption" color="textMuted">
                              {recipe.cuisine}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Chevron */}
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colors.textMuted}
                      />
                    </View>
                  </Card>
                </Link>
              );
            })}
          </View>

          {/* Section-aware CTA */}
          <Link
            href={selectedType === "saved" ? "/import" : "/manual-entry"}
            asChild
          >
            <Card variant="outlined" style={styles.importCard}>
              <View style={styles.importContent}>
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={colors.primary}
                />
                <Text variant="label" color="primary">
                  {selectedType === "saved"
                    ? "Import another recipe"
                    : "Create a recipe"}
                </Text>
              </View>
            </Card>
          </Link>
        </>
      )}
    </ScrollView>
  );
}

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
    padding: spacing[4],
    gap: spacing[3],
  },
  modeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeContent: {
    flex: 1,
    gap: spacing[1],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginTop: spacing[1],
    flexWrap: "wrap",
  },
  platformBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  sourcesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  forkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  importCard: {
    borderStyle: "dashed",
  },
  importContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
});
