import { useEffect, useState, useCallback } from "react";
import { Link, useRouter, useFocusEffect } from "expo-router";
import {
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { formatTime } from "@/lib/format";
import { Text, RecipeThumbnail } from "@/components/ui";
import { colors, spacing, layout, borderRadius } from "@/constants/theme";
import {
  CHALLENGE_CONFIG,
  getCurrentWeekStart,
  getCurrentWeekEnd,
  areChallengeRecipesConfigured,
} from "@/constants/challenge-config";

interface RecentRecipe {
  id: string;
  title: string;
  mode: string;
  times_cooked: number | null;
  created_at: string | null;
  cover_video_source: {
    source_thumbnail_url: string | null;
    source_platform: string | null;
  } | null;
  current_version: {
    ingredients: unknown;
    steps: unknown;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
  } | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Pressable with a subtle spring scale animation */
function SpringPressable({
  onPress,
  style,
  children,
}: {
  onPress?: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const homeRouter = useRouter();
  const [recentRecipes, setRecentRecipes] = useState<RecentRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [challengeCompleted, setChallengeCompleted] = useState(0);

  const handleShowHelp = () =>
    homeRouter.push("/(onboarding)/welcome?fromHelp=1");

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
        .from("master_recipes")
        .select(
          `id, title, mode, times_cooked, created_at,
          cover_video_source:video_sources!master_recipes_cover_video_source_id_fkey(source_thumbnail_url, source_platform),
          current_version:master_recipe_versions!fk_current_version(ingredients, steps, prep_time_minutes, cook_time_minutes)`
        )
        .eq("user_id", user.id)
        .not("id", "in", `(${CHALLENGE_CONFIG.recipeIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentRecipes((data as unknown as RecentRecipe[]) || []);

      if (areChallengeRecipesConfigured()) {
        const { data: completions } = await supabase
          .from("cook_sessions")
          .select("master_recipe_id")
          .eq("user_id", user.id)
          .eq("is_complete", true)
          .in("master_recipe_id", [...CHALLENGE_CONFIG.recipeIds])
          .gte("completed_at", getCurrentWeekStart().toISOString())
          .lt("completed_at", getCurrentWeekEnd().toISOString());

        const uniqueCompleted = new Set(
          completions?.map((c) => c.master_recipe_id) || []
        );
        setChallengeCompleted(uniqueCompleted.size);
      }
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

  const getRecipeMeta = (recipe: RecentRecipe) => {
    const parts: string[] = [];
    const ing = recipe.current_version?.ingredients;
    if (Array.isArray(ing) && ing.length > 0)
      parts.push(`${ing.length} ingredients`);
    const prep = recipe.current_version?.prep_time_minutes || 0;
    const cook = recipe.current_version?.cook_time_minutes || 0;
    const total = prep + cook;
    if (total > 0) parts.push(formatTime(total));
    return parts.join(" \u00B7 ");
  };

  const challengeProgress = challengeCompleted / CHALLENGE_CONFIG.totalRecipes;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing[6],
          paddingBottom: insets.bottom + spacing[8],
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("@/assets/chez-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="h3">{getGreeting()}</Text>
          <Text variant="body" color="textSecondary">
            What are we cooking today?
          </Text>
        </View>
        <Pressable
          onPress={handleShowHelp}
          style={styles.helpButton}
          hitSlop={8}
        >
          <Ionicons
            name="help-circle-outline"
            size={26}
            color={colors.textMuted}
          />
        </Pressable>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View
        entering={FadeInDown.delay(60).springify()}
        style={styles.quickActionsRow}
      >
        <View style={{ flex: 1 }}>
          <Link href="/import" asChild>
            <SpringPressable
              style={{
                ...styles.quickCard,
                backgroundColor: "#FFF7ED",
                borderColor: "rgba(234, 88, 12, 0.1)",
              }}
            >
              <View
                style={[styles.quickCardIcon, { backgroundColor: "#FFEDD5" }]}
              >
                <Ionicons name="link" size={24} color="#EA580C" />
              </View>
              <Text variant="label">Import</Text>
              <Text variant="caption" color="textMuted">
                From a video link
              </Text>
            </SpringPressable>
          </Link>
        </View>
        <View style={{ flex: 1 }}>
          <Link href="/manual-entry" asChild>
            <SpringPressable
              style={{
                ...styles.quickCard,
                backgroundColor: "#F0FDF4",
                borderColor: "rgba(22, 163, 106, 0.12)",
              }}
            >
              <View
                style={[styles.quickCardIcon, { backgroundColor: "#DCFCE7" }]}
              >
                <Ionicons name="document-text" size={24} color="#16A34A" />
              </View>
              <Text variant="label">Create</Text>
              <Text variant="caption" color="textMuted">
                Type or paste text
              </Text>
            </SpringPressable>
          </Link>
        </View>
      </Animated.View>

      {/* Weekly Challenge */}
      {areChallengeRecipesConfigured() && (
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Pressable
            style={styles.challengeCard}
            onPress={() => homeRouter.push("/challenge")}
          >
            <View style={styles.challengeTop}>
              <View style={styles.challengeIconBg}>
                <Ionicons name="trophy" size={20} color="#CA8A04" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ color: "#92400E" }}>
                  {CHALLENGE_CONFIG.title}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: "#A16207", marginTop: 1 }}
                >
                  {challengeCompleted === CHALLENGE_CONFIG.totalRecipes
                    ? "All done! Great work this week"
                    : `${challengeCompleted} of ${CHALLENGE_CONFIG.totalRecipes} cooked this week`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CA8A04" />
            </View>
            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      `${Math.max(challengeProgress * 100, 4)}%` as `${number}%`,
                  },
                ]}
              />
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* Recent Recipes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h4">Recent</Text>
          {recentRecipes.length > 0 && (
            <Link href="/recipes" asChild>
              <Pressable hitSlop={8}>
                <Text variant="label" color="primary">
                  See all
                </Text>
              </Pressable>
            </Link>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : recentRecipes.length === 0 ? (
          <Animated.View
            entering={FadeInDown.delay(180).springify()}
            style={styles.emptyCard}
          >
            <View style={styles.emptyIconBg}>
              <Ionicons name="restaurant" size={32} color={colors.primary} />
            </View>
            <Text variant="h4">Ready to cook?</Text>
            <Text
              variant="bodySmall"
              color="textSecondary"
              style={styles.emptySub}
            >
              Import a recipe from TikTok or YouTube, or create your own above.
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.recipeList}>
            {recentRecipes.map((recipe, index) => {
              const thumbnail = recipe.cover_video_source?.source_thumbnail_url;
              const meta = getRecipeMeta(recipe);

              return (
                <Animated.View
                  key={recipe.id}
                  entering={FadeInDown.delay(140 + index * 60).springify()}
                >
                  <Link href={`/recipe/${recipe.id}`} asChild>
                    <SpringPressable style={styles.recipeRow}>
                      <RecipeThumbnail uri={thumbnail} mode={recipe.mode} />
                      <View style={{ flex: 1 }}>
                        <Text variant="label" numberOfLines={1}>
                          {recipe.title}
                        </Text>
                        {meta ? (
                          <Text
                            variant="caption"
                            color="textMuted"
                            style={{ marginTop: 2 }}
                          >
                            {meta}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                    </SpringPressable>
                  </Link>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>

      {/* Pro Tip */}
      <Animated.View
        entering={FadeInDown.delay(300).springify()}
        style={styles.tipRow}
      >
        <Ionicons name="bulb-outline" size={16} color={colors.textMuted} />
        <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
          Copy a recipe video link before opening the app — we&apos;ll detect it
          automatically
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    gap: spacing[1],
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: spacing[2],
    marginLeft: "-5%",
  },
  helpButton: {
    padding: spacing[1],
    marginTop: 4,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  quickCard: {
    alignItems: "center",
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    borderWidth: 1,
  } as NativeStyle,
  quickCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[1],
  } as NativeStyle,

  // Challenge
  challengeCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: spacing[4],
    gap: spacing[3],
  } as NativeStyle,
  challengeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  challengeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  } as NativeStyle,
  progressTrack: {
    height: 6,
    backgroundColor: "#FDE68A",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#CA8A04",
    borderRadius: 3,
  },

  // Section
  section: {
    gap: spacing[3],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Loading
  loadingState: {
    paddingVertical: spacing[8],
    alignItems: "center",
  },

  // Empty state
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing[6],
    alignItems: "center",
    gap: spacing[2],
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  } as NativeStyle,
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[1],
  } as NativeStyle,
  emptySub: {
    textAlign: "center" as const,
    maxWidth: 260,
  },

  // Recipe list
  recipeList: {
    gap: spacing[2],
  },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing[3],
    gap: spacing[3],
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  } as NativeStyle,

  // Tip
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
});
