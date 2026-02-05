import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useFocusEffect } from "expo-router";
import {
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { Text, Card } from "@/components/ui";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { colors, spacing, layout } from "@/constants/theme";
import { SAMPLE_RECIPE, SAMPLE_RECIPE_TITLE } from "@/lib/sample-recipe";
import { hasDismissedSampleRecipe } from "@/lib/auth/sample-recipe-tracker";
import type { TablesInsert, Json } from "@/types/database";

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

  // Tutorial is now triggered via help icon instead of auto-showing
  const handleShowHelp = () => {
    setShowTutorial(true);
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  // Initialize sample recipe for new users
  const initializeSampleRecipe = useCallback(async (userId: string) => {
    if (sampleRecipeInitialized.current) return;

    try {
      // Check if user previously dismissed the sample recipe
      const wasDismissed = await hasDismissedSampleRecipe(userId);
      if (wasDismissed) {
        sampleRecipeInitialized.current = true;
        return;
      }

      // Check if sample recipe already exists for this user (by title)
      // Users can delete it if they don't want it
      const { data: existingSample } = await supabase
        .from("master_recipes")
        .select("id")
        .eq("user_id", userId)
        .eq("title", SAMPLE_RECIPE_TITLE)
        .maybeSingle();

      if (existingSample) {
        sampleRecipeInitialized.current = true;
        return;
      }

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
          status: "saved",
          times_cooked: 0,
        })
        .select()
        .single();

      if (masterError || !masterRecipe) {
        console.error("Error creating sample master recipe:", masterError);
        return; // Allow retry on next load
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
        // Cleanup orphaned master recipe
        await supabase
          .from("master_recipes")
          .delete()
          .eq("id", masterRecipe.id);
        return; // Allow retry on next load
      }

      // Update master recipe with current version
      const { error: updateError } = await supabase
        .from("master_recipes")
        .update({ current_version_id: version.id })
        .eq("id", masterRecipe.id);

      if (updateError) {
        console.error("Error linking version to master:", updateError);
        // Cleanup both records
        await supabase
          .from("master_recipes")
          .delete()
          .eq("id", masterRecipe.id);
        return; // Allow retry on next load
      }

      // Success - mark as initialized to prevent duplicate attempts
      sampleRecipeInitialized.current = true;
    } catch (err) {
      console.error("Error initializing sample recipe:", err);
      // Don't set ref - allow retry on next load
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
        <View style={styles.headerContent}>
          <Text variant="display" color="primary">
            CHEZ
          </Text>
          <Text variant="bodyLarge" color="textSecondary">
            Your AI cooking assistant
          </Text>
        </View>
        <Pressable
          onPress={handleShowHelp}
          style={styles.helpButton}
          hitSlop={8}
        >
          <Ionicons
            name="help-circle-outline"
            size={28}
            color={colors.textSecondary}
          />
        </Pressable>
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
                      <View style={styles.recipeTitleRow}>
                        <Text
                          variant="label"
                          numberOfLines={1}
                          style={styles.recipeTitle}
                        >
                          {recipe.title}
                        </Text>
                        {recipe.title === SAMPLE_RECIPE_TITLE && (
                          <View style={styles.sampleBadge}>
                            <Text style={styles.sampleBadgeText}>Sample</Text>
                          </View>
                        )}
                      </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerContent: {
    gap: spacing[1],
  },
  helpButton: {
    padding: spacing[1],
    marginTop: spacing[1],
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
  recipeTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  recipeTitle: {
    flex: 1,
  },
  sampleBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  sampleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6366F1",
    textTransform: "uppercase",
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
