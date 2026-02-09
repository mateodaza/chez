import { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Text, Card } from "@/components/ui";
import { Analytics } from "@/lib/analytics";
import { colors, spacing, layout } from "@/constants/theme";
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

      // Fetch the 3 challenge recipes
      const { data: recipeData } = await supabase
        .from("master_recipes")
        .select("id, title, mode")
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

      // Map recipes in order of challenge config
      const orderedRecipes: ChallengeRecipe[] = CHALLENGE_CONFIG.recipeIds
        .map((recipeId) => {
          const recipe = recipeData.find((r) => r.id === recipeId);
          if (!recipe) return null;
          return {
            id: recipe.id,
            title: recipe.title,
            mode: recipe.mode,
            completed: completedIds.has(recipe.id),
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
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text variant="h1">{CHALLENGE_CONFIG.title}</Text>
          <Text variant="body" color="textSecondary">
            Cook all 3 recipes this week
          </Text>
        </View>
      </View>

      {/* Progress Counter */}
      <Card variant="elevated" padding={5}>
        <View style={styles.counterContainer}>
          <View style={styles.counterCircle}>
            <Image
              source={require("@/assets/chez-only-hat.png")}
              style={{
                width: 60,
                height: 60,
                marginBottom: -22,
                marginTop: -10,
              }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color:
                  completedCount === CHALLENGE_CONFIG.totalRecipes
                    ? "#16A34A"
                    : colors.primary,
              }}
            >
              {completedCount}/{CHALLENGE_CONFIG.totalRecipes}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h4">
              {completedCount === CHALLENGE_CONFIG.totalRecipes
                ? "Challenge Complete!"
                : `Cooked ${completedCount}/${CHALLENGE_CONFIG.totalRecipes} recipes this week`}
            </Text>
            <Text variant="bodySmall" color="textSecondary">
              {completedCount === CHALLENGE_CONFIG.totalRecipes
                ? "Amazing work! You completed the weekly challenge."
                : "Resets every Monday at midnight UTC"}
            </Text>
          </View>
        </View>
      </Card>

      {/* Recipe Cards */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : recipes.length === 0 ? (
        <Card variant="outlined" padding={6}>
          <View style={{ alignItems: "center", gap: spacing[3] }}>
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
              Challenge recipes not found. Make sure the recipe IDs in the
              config point to real recipes in Supabase.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={styles.recipeList}>
          {recipes.map((recipe, index) => (
            <Pressable
              key={recipe.id}
              onPress={() => router.push(`/recipe/${recipe.id}`)}
            >
              <Card variant="elevated" padding={0}>
                <View style={styles.recipeCard}>
                  {/* Completion checkmark or number */}
                  <View
                    style={[
                      styles.recipeNumber,
                      recipe.completed && styles.recipeNumberCompleted,
                    ]}
                  >
                    {recipe.completed ? (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: colors.textSecondary,
                        }}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  {/* Recipe info */}
                  <View style={styles.recipeInfo}>
                    <Text
                      variant="label"
                      numberOfLines={1}
                      style={
                        recipe.completed
                          ? styles.recipeCompleteTitle
                          : undefined
                      }
                    >
                      {recipe.title}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {recipe.completed
                        ? "Completed this week"
                        : "Tap to view recipe"}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={recipe.completed ? "#16A34A" : colors.textMuted}
                  />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
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
    gap: spacing[5],
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  backButton: {
    padding: spacing[2],
    marginTop: spacing[1],
  },
  headerText: {
    flex: 1,
    gap: spacing[1],
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  counterCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    paddingVertical: spacing[8],
    alignItems: "center",
  },
  recipeList: {
    gap: spacing[3],
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
  },
  recipeNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeNumberCompleted: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  recipeInfo: {
    flex: 1,
    gap: 2,
  },
  recipeCompleteTitle: {
    color: "#16A34A",
  },
});
