import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useFocusEffect } from "expo-router";
import { ScrollView, View, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { Text, Card } from "@/components/ui";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { colors, spacing, layout } from "@/constants/theme";
import { SAMPLE_RECIPE, SAMPLE_RECIPE_TITLE } from "@/lib/sample-recipe";
import type { TablesInsert, Json } from "@/types/database";

const TUTORIAL_COMPLETED_KEY = "@chez_tutorial_completed";

interface Recipe {
  id: string;
  title: string;
  mode: string;
  created_at: string | null;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const sampleRecipeInitialized = useRef(false);
  const tutorialChecked = useRef(false);

  // Check if tutorial should be shown (first launch only)
  useEffect(() => {
    const checkTutorial = async () => {
      if (tutorialChecked.current) return;
      tutorialChecked.current = true;

      try {
        const completed = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
        if (!completed) {
          // Small delay for smoother experience after app loads
          setTimeout(() => setShowTutorial(true), 500);
        }
      } catch (err) {
        console.error("Error checking tutorial status:", err);
      }
    };

    checkTutorial();
  }, []);

  const handleTutorialComplete = async () => {
    setShowTutorial(false);
    try {
      await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
    } catch (err) {
      console.error("Error saving tutorial status:", err);
    }
  };

  // Initialize sample recipe for new users
  const initializeSampleRecipe = useCallback(async (userId: string) => {
    if (sampleRecipeInitialized.current) return;
    sampleRecipeInitialized.current = true;

    try {
      // Check if user already has any recipes
      const { count } = await supabase
        .from("master_recipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (count && count > 0) return; // User already has recipes

      // Check if sample recipe already exists for this user
      const { data: existingSample } = await supabase
        .from("master_recipes")
        .select("id")
        .eq("user_id", userId)
        .eq("title", SAMPLE_RECIPE_TITLE)
        .maybeSingle();

      if (existingSample) return; // Sample already exists

      // Create master recipe
      const { data: masterRecipe, error: masterError } = await supabase
        .from("master_recipes")
        .insert({
          user_id: userId,
          title: SAMPLE_RECIPE.title,
          description: SAMPLE_RECIPE.description,
          mode: SAMPLE_RECIPE.mode,
          cuisine: SAMPLE_RECIPE.cuisine,
          category: SAMPLE_RECIPE.category,
          status: "active",
          times_cooked: 0,
        })
        .select()
        .single();

      if (masterError || !masterRecipe) {
        console.error("Error creating sample master recipe:", masterError);
        return;
      }

      // Create version with full recipe content
      const versionData: TablesInsert<"master_recipe_versions"> = {
        master_recipe_id: masterRecipe.id,
        version_number: 1,
        title: SAMPLE_RECIPE.title,
        description: SAMPLE_RECIPE.description,
        mode: SAMPLE_RECIPE.mode,
        cuisine: SAMPLE_RECIPE.cuisine,
        category: SAMPLE_RECIPE.category,
        prep_time_minutes: SAMPLE_RECIPE.prep_time_minutes,
        cook_time_minutes: SAMPLE_RECIPE.cook_time_minutes,
        servings: SAMPLE_RECIPE.servings,
        servings_unit: SAMPLE_RECIPE.servings_unit,
        difficulty_score: SAMPLE_RECIPE.difficulty_score,
        ingredients: SAMPLE_RECIPE.ingredients as unknown as Json,
        steps: SAMPLE_RECIPE.steps as unknown as Json,
      };
      const { data: version, error: versionError } = await supabase
        .from("master_recipe_versions")
        .insert(versionData)
        .select()
        .single();

      if (versionError || !version) {
        console.error("Error creating sample version:", versionError);
        return;
      }

      // Update master recipe with current version
      await supabase
        .from("master_recipes")
        .update({ current_version_id: version.id })
        .eq("id", masterRecipe.id);

      // Sample recipe created successfully
    } catch (err) {
      console.error("Error initializing sample recipe:", err);
    }
  }, []);

  const fetchRecentRecipes = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRecentRecipes([]);
        setLoading(false);
        return;
      }

      // Initialize sample recipe for new users (runs once)
      await initializeSampleRecipe(user.id);

      const { data } = await supabase
        .from("master_recipes")
        .select("id, title, mode, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentRecipes(data || []);
    } catch (err) {
      console.error("Error fetching recent recipes:", err);
    } finally {
      setLoading(false);
    }
  }, [initializeSampleRecipe]);

  useEffect(() => {
    fetchRecentRecipes();
  }, [fetchRecentRecipes]);

  useFocusEffect(
    useCallback(() => {
      fetchRecentRecipes();
    }, [fetchRecentRecipes])
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
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text variant="display" color="primary">
          CHEZ
        </Text>
        <Text variant="bodyLarge" color="textSecondary">
          Your AI cooking assistant
        </Text>
      </View>

      {/* Add Recipe CTAs */}
      <View style={styles.addSection}>
        <Text
          variant="label"
          color="textSecondary"
          style={styles.addSectionLabel}
        >
          Add a recipe
        </Text>
        <View style={styles.addCardsRow}>
          {/* Import from Video */}
          <Link href="/import" asChild>
            <Card variant="elevated" style={styles.addCard} padding={0}>
              <View style={styles.addCardContent}>
                <View
                  style={[styles.addCardIcon, { backgroundColor: "#FEE2E2" }]}
                >
                  <Ionicons name="videocam" size={24} color="#DC2626" />
                </View>
                <Text variant="label">Import</Text>
                <Text variant="caption" color="textSecondary">
                  From video
                </Text>
              </View>
            </Card>
          </Link>

          {/* Create Recipe */}
          <Link href="/manual-entry" asChild>
            <Card variant="elevated" style={styles.addCard} padding={0}>
              <View style={styles.addCardContent}>
                <View
                  style={[styles.addCardIcon, { backgroundColor: "#DCFCE7" }]}
                >
                  <Ionicons name="create" size={24} color="#16A34A" />
                </View>
                <Text variant="label">Create</Text>
                <Text variant="caption" color="textSecondary">
                  From text
                </Text>
              </View>
            </Card>
          </Link>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h4">Recent Activity</Text>
          {recentRecipes.length > 0 && (
            <Link href="/recipes" asChild>
              <Text variant="bodySmall" color="primary">
                See all
              </Text>
            </Link>
          )}
        </View>

        {loading ? (
          <Card variant="elevated" padding={8}>
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </Card>
        ) : recentRecipes.length === 0 ? (
          <Card variant="elevated" padding={6}>
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyEmoji}>👨‍🍳</Text>
              </View>
              <Text variant="h4" style={styles.emptyText}>
                Ready to cook something amazing?
              </Text>
              <Text
                variant="body"
                color="textSecondary"
                style={styles.emptyText}
              >
                Here&apos;s how to get started:
              </Text>
              <View style={styles.emptySteps}>
                <View style={styles.emptyStep}>
                  <View
                    style={[
                      styles.emptyStepIcon,
                      { backgroundColor: "#FEE2E2" },
                    ]}
                  >
                    <Ionicons name="videocam" size={16} color="#DC2626" />
                  </View>
                  <Text variant="bodySmall" color="textSecondary">
                    Import a recipe from TikTok or YouTube
                  </Text>
                </View>
                <View style={styles.emptyStep}>
                  <View
                    style={[
                      styles.emptyStepIcon,
                      { backgroundColor: "#DCFCE7" },
                    ]}
                  >
                    <Ionicons name="create" size={16} color="#16A34A" />
                  </View>
                  <Text variant="bodySmall" color="textSecondary">
                    Or type/paste your own recipe
                  </Text>
                </View>
                <View style={styles.emptyStep}>
                  <View
                    style={[
                      styles.emptyStepIcon,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Ionicons name="flame" size={16} color={colors.primary} />
                  </View>
                  <Text variant="bodySmall" color="textSecondary">
                    Cook hands-free with voice guidance
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        ) : (
          <View style={styles.recipesList}>
            {recentRecipes.map((recipe, index) => (
              <Animated.View
                key={recipe.id}
                entering={FadeInDown.delay(index * 80).springify()}
              >
                <Link href={`/recipe/${recipe.id}`} asChild>
                  <Card variant="elevated" padding={0}>
                    <View style={styles.recipeCard}>
                      <View style={styles.recipeIcon}>
                        <Ionicons
                          name={getModeIcon(recipe.mode)}
                          size={18}
                          color={colors.primary}
                        />
                      </View>
                      <Text
                        variant="label"
                        numberOfLines={1}
                        style={styles.recipeTitle}
                      >
                        {recipe.title}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textMuted}
                      />
                    </View>
                  </Card>
                </Link>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* Tips Card */}
      <Card variant="outlined" style={styles.tipsCard}>
        <View style={styles.tipsContent}>
          <Ionicons name="bulb-outline" size={20} color="#CA8A04" />
          <View style={{ flex: 1 }}>
            <Text variant="label" color="#CA8A04">
              Pro tip
            </Text>
            <Text variant="bodySmall" color="#A16207">
              Copy a recipe video link before opening the app - we&apos;ll
              detect it automatically
            </Text>
          </View>
        </View>
      </Card>

      {/* First-launch tutorial overlay */}
      <TutorialOverlay
        visible={showTutorial}
        onComplete={handleTutorialComplete}
      />
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
    gap: spacing[6],
    paddingBottom: spacing[8],
  },
  header: {
    gap: spacing[1],
  },
  addSection: {
    gap: spacing[2],
  },
  addSectionLabel: {
    marginLeft: spacing[1],
  },
  addCardsRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  addCard: {
    flex: 1,
  },
  addCardContent: {
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[2],
  },
  addCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    gap: spacing[3],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: spacing[1],
    marginRight: spacing[1],
  },
  loadingState: {
    paddingVertical: spacing[6],
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyText: {
    textAlign: "center",
  },
  emptySteps: {
    width: "100%",
    gap: spacing[2],
    marginTop: spacing[2],
  },
  emptyStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
  },
  emptyStepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  recipesList: {
    gap: spacing[2],
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
  },
  recipeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeTitle: {
    flex: 1,
  },
  tipsCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  tipsContent: {
    flexDirection: "row",
    gap: spacing[3],
    alignItems: "flex-start",
  },
});
