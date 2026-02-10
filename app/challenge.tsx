import { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Image,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { Text } from "@/components/ui";
import { Analytics } from "@/lib/analytics";
import { colors, spacing, layout, borderRadius } from "@/constants/theme";
import {
  CHALLENGE_CONFIG,
  getCurrentWeekStart,
  getCurrentWeekEnd,
  areChallengeRecipesConfigured,
} from "@/constants/challenge-config";

interface ChallengeRecipe {
  id: string;
  title: string;
  mode: string;
  completed: boolean;
  communityCount: number;
  thumbnail: string | null;
}

export default function ChallengeScreen() {
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<ChallengeRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  const completedCount = recipes.filter((r) => r.completed).length;

  // Track which recipe IDs we've already emitted completion events for this session
  // to avoid inflating KPIs on repeated focus events.
  const [_trackedCompletions, setTrackedCompletions] = useState<Set<string>>(
    new Set()
  );

  const fetchChallengeData = useCallback(async () => {
    try {
      if (!areChallengeRecipesConfigured()) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the 3 challenge recipes with thumbnails
      const { data: recipeData } = await supabase
        .from("master_recipes")
        .select(
          "id, title, mode, cover_video_source:video_sources!master_recipes_cover_video_source_id_fkey(source_thumbnail_url)"
        )
        .in("id", [...CHALLENGE_CONFIG.recipeIds]);

      if (!recipeData) {
        setLoading(false);
        return;
      }

      // Check completions for this week (UTC Monday-Sunday)
      const weekStart = getCurrentWeekStart().toISOString();
      const weekEnd = getCurrentWeekEnd().toISOString();

      const { data: completions } = await supabase
        .from("cook_sessions")
        .select("master_recipe_id")
        .eq("user_id", user.id)
        .eq("is_complete", true)
        .in("master_recipe_id", [...CHALLENGE_CONFIG.recipeIds])
        .gte("completed_at", weekStart)
        .lt("completed_at", weekEnd);

      const completedIds = new Set(
        completions?.map((c) => c.master_recipe_id).filter(Boolean) as string[]
      );

      // Fetch community completion counts (all users)
      const { data: communityData } = await supabase.rpc(
        "get_challenge_completion_counts",
        {
          p_recipe_ids: [...CHALLENGE_CONFIG.recipeIds],
          p_week_start: weekStart,
          p_week_end: weekEnd,
        }
      );

      const communityMap = new Map<string, number>(
        (communityData ?? []).map(
          (r: { recipe_id: string; completion_count: number }) => [
            r.recipe_id,
            r.completion_count,
          ]
        )
      );

      // Map recipes in order of challenge config
      const orderedRecipes: ChallengeRecipe[] = CHALLENGE_CONFIG.recipeIds
        .map((recipeId) => {
          const recipe = recipeData.find((r) => r.id === recipeId);
          if (!recipe) return null;
          const coverSource = recipe.cover_video_source as {
            source_thumbnail_url: string | null;
          } | null;
          return {
            id: recipe.id,
            title: recipe.title,
            mode: recipe.mode,
            completed: completedIds.has(recipe.id),
            communityCount: communityMap.get(recipe.id) ?? 0,
            thumbnail: coverSource?.source_thumbnail_url ?? null,
          };
        })
        .filter(Boolean) as ChallengeRecipe[];

      setRecipes(orderedRecipes);
      Analytics.creatorChallengeViewed();

      // Only emit completion events for recipes we haven't tracked yet this session
      setTrackedCompletions((prev) => {
        const newIds = [...completedIds].filter((id) => !prev.has(id));
        for (const id of newIds) {
          Analytics.creatorChallengeRecipeCompleted(id, completedIds.size);
        }
        if (newIds.length === 0) return prev;
        return new Set([...prev, ...newIds]);
      });
    } catch (err) {
      console.error("[Challenge] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // useFocusEffect fires on initial mount + every re-focus (coming back from cook flow)
  useFocusEffect(
    useCallback(() => {
      fetchChallengeData();
    }, [fetchChallengeData])
  );

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

  const progress = completedCount / CHALLENGE_CONFIG.totalRecipes;
  const allDone = completedCount === CHALLENGE_CONFIG.totalRecipes;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing[2],
          paddingBottom: insets.bottom + spacing[8],
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <Animated.View entering={FadeIn.duration(300)}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
      </Animated.View>

      {/* Hero Banner */}
      <Animated.View
        entering={FadeInDown.delay(60).springify()}
        style={styles.heroBanner}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIconCircle}>
            <Image
              source={require("@/assets/chez-only-hat.png")}
              style={styles.heroHat}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text variant="h3">{CHALLENGE_CONFIG.title}</Text>
            <Text variant="bodySmall" style={{ color: "#92400E" }}>
              {allDone
                ? "All done! Amazing work this week"
                : "Cook this week\u0027s curated picks"}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <Text variant="caption" style={{ color: "#92400E" }}>
              Progress
            </Text>
            <Text
              variant="label"
              style={{ color: "#92400E", fontVariant: ["tabular-nums"] }}
            >
              {completedCount}/{CHALLENGE_CONFIG.totalRecipes}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${Math.max(progress * 100, 4)}%` as `${number}%` },
                allDone && styles.progressFillComplete,
              ]}
            />
          </View>
        </View>
      </Animated.View>

      {/* Recipe Cards */}
      <View style={styles.sectionHeader}>
        <Text variant="h4">This Week&apos;s Recipes</Text>
        <Text variant="caption" color="textMuted">
          {CHALLENGE_CONFIG.totalRecipes} recipes to cook
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : recipes.length === 0 ? (
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.emptyCard}
        >
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={colors.textMuted}
          />
          <Text
            variant="body"
            color="textMuted"
            style={{ textAlign: "center" }}
          >
            Challenge recipes not available right now.
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.recipeList}>
          {recipes.map((recipe, index) => (
            <Animated.View
              key={recipe.id}
              entering={FadeInDown.delay(120 + index * 80).springify()}
            >
              <Pressable
                style={[
                  styles.recipeCard,
                  recipe.completed && styles.recipeCardCompleted,
                ]}
                onPress={() => router.push(`/recipe/${recipe.id}`)}
              >
                {/* Left: thumbnail */}
                <View style={styles.recipeThumbnailWrap}>
                  {recipe.thumbnail ? (
                    <Image
                      source={{ uri: recipe.thumbnail }}
                      style={styles.recipeThumbnail}
                    />
                  ) : (
                    <View
                      style={[
                        styles.recipeThumbnail,
                        styles.recipeThumbnailFallback,
                      ]}
                    >
                      <Ionicons
                        name={getModeIcon(recipe.mode)}
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  {/* Completion overlay */}
                  {recipe.completed && (
                    <View style={styles.thumbnailCheck}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#fff"
                      />
                    </View>
                  )}
                </View>

                {/* Center: title + meta */}
                <View style={styles.recipeInfo}>
                  <Text
                    variant="label"
                    numberOfLines={2}
                    style={recipe.completed ? { color: "#16A34A" } : undefined}
                  >
                    {recipe.title}
                  </Text>
                  <View style={styles.recipeMeta}>
                    {recipe.completed ? (
                      <View style={styles.completedBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#16A34A"
                        />
                        <Text variant="caption" style={{ color: "#16A34A" }}>
                          Completed
                        </Text>
                      </View>
                    ) : (
                      <Text variant="caption" color="textMuted">
                        Tap to start cooking
                      </Text>
                    )}
                    {recipe.communityCount > 0 && (
                      <View style={styles.communityBadge}>
                        <Ionicons
                          name="people"
                          size={11}
                          color={colors.textMuted}
                        />
                        <Text variant="caption" color="textMuted">
                          {recipe.communityCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Right: chevron */}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={recipe.completed ? "#16A34A" : colors.textMuted}
                />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Tip */}
      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        style={styles.tipRow}
      >
        <Ionicons name="bulb-outline" size={16} color={colors.textMuted} />
        <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
          Complete all {CHALLENGE_CONFIG.totalRecipes} recipes this week to
          finish the challenge. New picks every Monday.
        </Text>
      </Animated.View>
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
    paddingHorizontal: layout.screenPaddingHorizontal,
    gap: spacing[5],
  },

  // Back button
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Hero Banner
  heroBanner: {
    backgroundColor: "#FFFBEB",
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: spacing[5],
    gap: spacing[4],
  } as NativeStyle,
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroHat: {
    width: 52,
    height: 52,
  },
  progressSection: {
    gap: spacing[2],
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#FDE68A",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#CA8A04",
    borderRadius: 4,
  },
  progressFillComplete: {
    backgroundColor: "#16A34A",
  },

  // Section
  sectionHeader: {
    gap: spacing[1],
  },

  // Loading
  loadingContainer: {
    paddingVertical: spacing[8],
    alignItems: "center",
  },

  // Empty
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing[6],
    alignItems: "center",
    gap: spacing[3],
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  } as NativeStyle,

  // Recipe list
  recipeList: {
    gap: spacing[3],
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing[4],
    gap: spacing[3],
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  } as NativeStyle,
  recipeCardCompleted: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  recipeThumbnailWrap: {
    position: "relative",
  },
  recipeThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderCurve: "continuous",
  } as NativeStyle,
  recipeThumbnailFallback: {
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailCheck: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  recipeInfo: {
    flex: 1,
    gap: spacing[1],
  },
  recipeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  communityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  // Tip
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
});
