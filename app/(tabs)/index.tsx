import { useEffect, useState, useCallback } from "react";
import { Link, useFocusEffect } from "expo-router";
import { ScrollView, View, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Text, Card } from "@/components/ui";
import { colors, spacing, layout } from "@/constants/theme";

interface Recipe {
  id: string;
  title: string;
  mode: string;
  source_platform: string | null;
  created_at: string | null;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data } = await supabase
        .from("recipes")
        .select("id, title, mode, source_platform, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentRecipes(data || []);
    } catch (err) {
      console.error("Error fetching recent recipes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

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

      {/* Primary CTA */}
      <Link href="/import" asChild>
        <Card variant="elevated" style={styles.primaryCard} padding={0}>
          <View style={styles.primaryCardContent}>
            <View style={styles.primaryCardIcon}>
              <Ionicons name="add" size={32} color={colors.primary} />
            </View>
            <View style={styles.primaryCardText}>
              <Text variant="h3" color="textOnPrimary">
                Import Recipe
              </Text>
              <Text variant="body" style={styles.primaryCardSubtext}>
                From TikTok, YouTube, or Instagram
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color="rgba(255,255,255,0.7)"
            />
          </View>
        </Card>
      </Link>

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
          <Card variant="elevated" padding={8}>
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="restaurant-outline"
                  size={32}
                  color={colors.textMuted}
                />
              </View>
              <Text
                variant="body"
                color="textSecondary"
                style={styles.emptyText}
              >
                No recipes yet
              </Text>
              <Text
                variant="caption"
                color="textMuted"
                style={styles.emptyText}
              >
                Import your first recipe to see it here
              </Text>
            </View>
          </Card>
        ) : (
          <View style={styles.recipesList}>
            {recentRecipes.map((recipe) => (
              <Link key={recipe.id} href={`/recipe/${recipe.id}`} asChild>
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
  primaryCard: {
    backgroundColor: colors.primary,
    overflow: "hidden",
  },
  primaryCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[5],
    gap: spacing[4],
  },
  primaryCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCardText: {
    flex: 1,
    gap: spacing[1],
  },
  primaryCardSubtext: {
    color: "rgba(255,255,255,0.85)",
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
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[2],
  },
  emptyText: {
    textAlign: "center",
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
