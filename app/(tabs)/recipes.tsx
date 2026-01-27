import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  View,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Text, Card, Button } from "@/components/ui";
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
  const [recipes, setRecipes] = useState<RecipeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
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
          {recipes.length} saved
        </Text>
      </View>

      {/* Recipe List */}
      <View style={styles.list}>
        {recipes.map((recipe) => {
          const platform = recipe.cover_video_source?.source_platform || null;

          return (
            <Link key={recipe.id} href={`/recipe/${recipe.id}`} asChild>
              <Card variant="elevated" padding={0}>
                <View style={styles.recipeCard}>
                  {/* Mode Icon */}
                  <View style={styles.modeIconContainer}>
                    <Ionicons
                      name={getModeIcon(recipe.mode)}
                      size={20}
                      color={colors.primary}
                    />
                  </View>

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

                    {/* Meta row */}
                    <View style={styles.metaRow}>
                      {platform && (
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

                      {recipe.source_count > 1 && (
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

      {/* Import more CTA */}
      <Link href="/import" asChild>
        <Card variant="outlined" style={styles.importCard}>
          <View style={styles.importContent}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={colors.primary}
            />
            <Text variant="label" color="primary">
              Import another recipe
            </Text>
          </View>
        </Card>
      </Link>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
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
