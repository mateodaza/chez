import { useState, useEffect, useCallback, type ComponentProps } from "react";
import {
  ScrollView,
  View,
  Alert,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
  Image,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useSubscription } from "@/hooks";
import { useAuth } from "@/lib/auth/AuthContext";
import { Text, Card } from "@/components/ui";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { colors, spacing, layout, borderRadius } from "@/constants/theme";
import {
  fetchCompletedMeals,
  type CompletedMeal,
} from "@/lib/supabase/queries";
import { getCookPhotoUrl } from "@/lib/cook-photos";
import { Analytics } from "@/lib/analytics";

const ADMIN_USER_ID = (process.env.EXPO_PUBLIC_ADMIN_USER_ID || "").trim();

interface RateLimitStatus {
  current: number;
  limit: number;
  remaining: number;
  tier: "free" | "chef";
}

function getCookingStreak(meals: CompletedMeal[]): number {
  if (meals.length === 0) return 0;
  const dates = [
    ...new Set(meals.map((m) => new Date(m.completedAt).toDateString())),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecent = new Date(dates[0]);
  mostRecent.setHours(0, 0, 0, 0);

  if (mostRecent < yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const curr = new Date(dates[i - 1]);
    curr.setHours(0, 0, 0, 0);
    const prev = new Date(dates[i]);
    prev.setHours(0, 0, 0, 0);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

const COOK_LEVELS = [
  {
    threshold: 0,
    title: "Rookie",
    icon: "leaf-outline" as const,
    desc: "Start your journey",
  },
  {
    threshold: 1,
    title: "First Bite",
    icon: "restaurant-outline" as const,
    desc: "Cooked your first dish!",
  },
  {
    threshold: 3,
    title: "Home Cook",
    icon: "home-outline" as const,
    desc: "Getting comfortable",
  },
  {
    threshold: 7,
    title: "Sous Chef",
    icon: "flame-outline" as const,
    desc: "Cooking is a habit",
  },
  {
    threshold: 15,
    title: "Kitchen Pro",
    icon: "star-outline" as const,
    desc: "You're a natural",
  },
  {
    threshold: 25,
    title: "Master Chef",
    icon: "trophy-outline" as const,
    desc: "Kitchen legend",
  },
] as const;

function getCookLevel(mealCount: number): {
  title: string;
  icon: string;
  desc: string;
  index: number;
  next: number;
} {
  for (let i = COOK_LEVELS.length - 1; i >= 0; i--) {
    if (mealCount >= COOK_LEVELS[i].threshold) {
      const next =
        i < COOK_LEVELS.length - 1 ? COOK_LEVELS[i + 1].threshold : 0;
      return {
        title: COOK_LEVELS[i].title,
        icon: COOK_LEVELS[i].icon,
        desc: COOK_LEVELS[i].desc,
        index: i,
        next,
      };
    }
  }
  return {
    title: COOK_LEVELS[0].title,
    icon: COOK_LEVELS[0].icon,
    desc: COOK_LEVELS[0].desc,
    index: 0,
    next: COOK_LEVELS[1].threshold,
  };
}

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

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={12}
          color={i <= rating ? "#F59E0B" : colors.textMuted}
        />
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [importsThisMonth, setImportsThisMonth] = useState(0);
  const { isChef } = useSubscription();
  const { signOut } = useAuth();
  const isAdmin = user?.id === ADMIN_USER_ID;

  const [completedMeals, setCompletedMeals] = useState<CompletedMeal[]>([]);
  const [mealPhotoUrls, setMealPhotoUrls] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const fetchRateLimit = useCallback(async (userId: string) => {
    const [rateLimitResult, userResult] = await Promise.all([
      supabase.rpc("get_rate_limit_status", { p_user_id: userId }),
      supabase
        .from("users")
        .select("imports_this_month")
        .eq("id", userId)
        .single(),
    ]);

    if (!rateLimitResult.error && rateLimitResult.data) {
      const rateLimitData = rateLimitResult.data as {
        current: number;
        limit: number;
        remaining: number;
        tier: string;
      };
      setRateLimit({
        current: rateLimitData.current,
        limit: rateLimitData.limit,
        remaining: rateLimitData.remaining,
        tier: rateLimitData.tier === "chef" ? "chef" : "free",
      });
    }

    if (!userResult.error && userResult.data) {
      setImportsThisMonth(userResult.data.imports_this_month || 0);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchRateLimit(user.id);
    }
  }, [user?.id, fetchRateLimit]);

  const loadCompletedMeals = useCallback(async (userId: string) => {
    const meals = await fetchCompletedMeals(userId);
    setCompletedMeals(meals);
    Analytics.completedMealsViewed();

    const urls: Record<string, string> = {};
    await Promise.all(
      meals
        .filter((m) => m.photoPath)
        .map(async (m) => {
          const url = await getCookPhotoUrl(m.photoPath!);
          if (url) urls[m.sessionId] = url;
        })
    );
    setMealPhotoUrls(urls);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchRateLimit(user.id);
        loadCompletedMeals(user.id);
      }
    }, [user?.id, fetchRateLimit, loadCompletedMeals])
  );

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const getMealImageUri = (meal: CompletedMeal): string | null => {
    return mealPhotoUrls[meal.sessionId] || meal.recipeThumbnailUrl || null;
  };

  const streak = getCookingStreak(completedMeals);
  const level = getCookLevel(completedMeals.length);

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
      {/* Profile Header — compact horizontal like TikTok/IG */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarArea}>
            <View style={styles.avatar}>
              <Text variant="h1" color="textOnPrimary" style={{ fontSize: 22 }}>
                {user?.email?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text variant="label" numberOfLines={1}>
              {user?.email || "Loading..."}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.planBadge}>
                <Ionicons
                  name={isChef ? "diamond" : "leaf-outline"}
                  size={11}
                  color={isChef ? colors.primary : colors.textMuted}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: isChef ? colors.primary : colors.textMuted,
                  }}
                >
                  {isChef ? "Chef" : "Free"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Stats pills */}
      <Animated.View entering={FadeInDown.duration(400).delay(50)}>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>{completedMeals.length}</Text>
            <Text style={styles.statLabel}>cooked</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>{importsThisMonth}</Text>
            <Text style={styles.statLabel}>saved</Text>
          </View>
          {streak > 0 && (
            <View style={[styles.statPill, styles.statPillAccent]}>
              <Text style={[styles.statNum, { color: "#D97706" }]}>
                {streak}
              </Text>
              <Text style={[styles.statLabel, { color: "#D97706" }]}>
                day streak
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Level Progress */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={styles.levelCard}>
          <View style={styles.levelCardHeader}>
            <View style={styles.levelCardTitleRow}>
              <Ionicons
                name={level.icon as ComponentProps<typeof Ionicons>["name"]}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.levelCardTitle}>{level.title}</Text>
              <Text style={styles.levelCardDesc}>· {level.desc}</Text>
            </View>
            {level.next > 0 && (
              <Text style={styles.levelCardNext}>
                {level.next - completedMeals.length} more to{" "}
                {getCookLevel(level.next).title}
              </Text>
            )}
          </View>
          <View style={styles.segBar}>
            {COOK_LEVELS.slice(1).map((lvl, i) => {
              const segStart = COOK_LEVELS[i].threshold;
              const segEnd = lvl.threshold;
              const segRange = segEnd - segStart;
              const progress = Math.min(
                1,
                Math.max(0, (completedMeals.length - segStart) / segRange)
              );
              return (
                <View key={lvl.title} style={styles.segment}>
                  <View
                    style={[
                      styles.segFill,
                      { width: `${progress * 100}%` },
                      progress >= 1 && styles.segFillComplete,
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.segLabels}>
            {COOK_LEVELS.map((lvl, i) => (
              <View
                key={lvl.title}
                style={[
                  styles.segLabelWrap,
                  i === 0 && { alignItems: "flex-start" as const },
                  i === COOK_LEVELS.length - 1 && {
                    alignItems: "flex-end" as const,
                  },
                ]}
              >
                <Ionicons
                  name={lvl.icon}
                  size={10}
                  color={i <= level.index ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.segLabel,
                    i <= level.index && styles.segLabelActive,
                  ]}
                >
                  {lvl.title}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Your Cooks */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(150)}
        style={styles.section}
      >
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Your Cooks
        </Text>
        {completedMeals.length === 0 ? (
          <Card variant="outlined" padding={5}>
            <View style={styles.emptyMeals}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="restaurant-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text
                variant="body"
                color="textMuted"
                style={{ textAlign: "center", fontSize: 14 }}
              >
                Cook your first recipe to start your journey
              </Text>
            </View>
          </Card>
        ) : completedMeals.length <= 3 ? (
          <View style={styles.mealsList}>
            {completedMeals.map((meal, index) => {
              const imageUri = getMealImageUri(meal);
              return (
                <Animated.View
                  key={meal.sessionId}
                  entering={FadeInDown.duration(300).delay(200 + index * 60)}
                >
                  <SpringPressable
                    style={styles.mealRow}
                    onPress={() => router.push(`/recipe/${meal.recipeId}`)}
                  >
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.mealRowThumb}
                      />
                    ) : (
                      <View
                        style={[
                          styles.mealRowThumb,
                          styles.mealRowThumbFallback,
                        ]}
                      >
                        <Ionicons
                          name="restaurant"
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text variant="label" numberOfLines={1}>
                        {meal.recipeTitle}
                      </Text>
                      <View style={styles.mealRowMeta}>
                        <Text variant="caption" color="textMuted">
                          {new Date(meal.completedAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}
                        </Text>
                        {meal.rating != null && meal.rating > 0 && (
                          <StarRating rating={meal.rating} />
                        )}
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textMuted}
                    />
                  </SpringPressable>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <View style={styles.mealsGrid}>
            {completedMeals.map((meal, index) => {
              const imageUri = getMealImageUri(meal);
              return (
                <Animated.View
                  key={meal.sessionId}
                  entering={FadeInDown.duration(300).delay(200 + index * 60)}
                >
                  <SpringPressable
                    style={styles.mealCard}
                    onPress={() => router.push(`/recipe/${meal.recipeId}`)}
                  >
                    <View style={styles.mealImageWrap}>
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.mealPhoto}
                        />
                      ) : (
                        <View style={styles.mealPhotoPlaceholder}>
                          <Ionicons
                            name="restaurant"
                            size={24}
                            color={colors.primary}
                          />
                        </View>
                      )}
                      {meal.rating != null && meal.rating > 0 && (
                        <View style={styles.ratingBadge}>
                          <StarRating rating={meal.rating} />
                        </View>
                      )}
                    </View>
                    <Text
                      variant="label"
                      numberOfLines={1}
                      style={{ fontSize: 13 }}
                    >
                      {meal.recipeTitle}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {new Date(meal.completedAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" }
                      )}
                    </Text>
                  </SpringPressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* Subscription */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(200)}
        style={styles.section}
      >
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Subscription
        </Text>
        <SubscriptionCard
          tier={isChef ? "chef" : "free"}
          recipesImported={importsThisMonth}
          recipesLimit={isChef ? 999 : 3}
          messagesUsed={rateLimit?.current || 0}
          messagesLimit={rateLimit?.limit || 20}
          messagesRemaining={rateLimit?.remaining ?? -1}
        />
        {isChef && (
          <Pressable
            onPress={() => {
              const url =
                Platform.OS === "ios"
                  ? "https://apps.apple.com/account/subscriptions"
                  : "https://play.google.com/store/account/subscriptions";
              Linking.openURL(url);
            }}
            style={styles.manageLink}
          >
            <Text variant="body" color="primary">
              Manage Subscription
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </Pressable>
        )}
      </Animated.View>

      {/* Admin */}
      {isAdmin && (
        <Animated.View
          entering={FadeInDown.duration(400).delay(250)}
          style={styles.section}
        >
          <Text
            variant="label"
            color="textSecondary"
            style={styles.sectionTitle}
          >
            Admin
          </Text>
          <Card variant="outlined" padding={0}>
            <Pressable
              style={styles.actionRow}
              onPress={() => router.push("/(admin)/dashboard")}
            >
              <View style={styles.actionContent}>
                <Ionicons
                  name="stats-chart-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text variant="body" color="primary">
                  Admin Dashboard
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
            </Pressable>
          </Card>
        </Animated.View>
      )}

      {/* Account */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(300)}
        style={styles.section}
      >
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Account
        </Text>
        <Card variant="outlined" padding={0}>
          <Pressable
            style={styles.actionRow}
            onPress={() =>
              Linking.openURL(
                "https://mateodaza.github.io/chez/legal/terms.html"
              )
            }
          >
            <View style={styles.actionContent}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text variant="body">Terms of Service</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} />
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable
            style={styles.actionRow}
            onPress={() =>
              Linking.openURL(
                "https://mateodaza.github.io/chez/legal/privacy.html"
              )
            }
          >
            <View style={styles.actionContent}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text variant="body">Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} />
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable style={styles.actionRow} onPress={handleSignOut}>
            <View style={styles.actionContent}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text variant="body" color="error">
                Sign Out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.error} />
          </Pressable>
        </Card>
      </Animated.View>

      <View style={styles.appInfo}>
        <Text variant="caption" color="textMuted">
          CHEZ v1.0.0
        </Text>
      </View>
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

  // Profile header — compact horizontal
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: "continuous",
  },
  avatarArea: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  streakBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    backgroundColor: "#F59E0B",
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  streakText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#fff",
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },

  // Stats pills
  statsRow: {
    flexDirection: "row",
    gap: spacing[2],
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: "continuous",
  },
  statPillAccent: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  statNum: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500" as const,
  },

  // Level progress
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: "continuous",
    padding: spacing[3],
    gap: 8,
  },
  levelCardHeader: {
    gap: 2,
  },
  levelCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  levelCardTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  levelCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  levelCardNext: {
    fontSize: 11,
    color: colors.textMuted,
  },
  segBar: {
    flexDirection: "row",
    gap: 3,
    height: 6,
  },
  segment: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  segFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  segFillComplete: {
    backgroundColor: colors.success,
  },
  segLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  segLabelWrap: {
    alignItems: "center",
    gap: 1,
  },
  segLabel: {
    fontSize: 8,
    color: colors.textMuted,
    textAlign: "center",
    fontWeight: "400" as const,
  },
  segLabelActive: {
    color: colors.primary,
    fontWeight: "700" as const,
  },

  // Sections
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    marginLeft: spacing[1],
  },

  // Meals
  emptyMeals: {
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  mealsList: {
    gap: spacing[2],
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing[3],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
  } as NativeStyle,
  mealRowThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderCurve: "continuous",
  } as NativeStyle,
  mealRowThumbFallback: {
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  mealRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: 2,
  },
  mealsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  mealCard: {
    width: "47%" as unknown as number,
    gap: spacing[1],
  },
  mealImageWrap: {
    position: "relative",
  },
  mealPhoto: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
  } as NativeStyle,
  mealPhotoPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  } as NativeStyle,
  ratingBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: borderRadius.md,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  starRow: {
    flexDirection: "row",
    gap: 1,
  },

  // Action rows
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing[4],
  },

  // Misc
  manageLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  appInfo: {
    alignItems: "center",
    paddingTop: spacing[2],
  },
});
