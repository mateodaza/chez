import { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Alert,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useUserPreferences, useSubscription, type CookingMode } from "@/hooks";
import { Text, Button, Card } from "@/components/ui";
import { colors, spacing, layout, borderRadius } from "@/constants/theme";

// Admin user ID - hardcoded for now
const ADMIN_USER_ID = "3a03079e-b93b-4379-951d-c998a168b379";

interface RateLimitStatus {
  current: number;
  limit: number;
  remaining: number;
  tier: "free" | "chef";
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const { cookingMode, updatePreferences, isUpdating } = useUserPreferences();
  const { tier: subscriptionTier, isChef } = useSubscription();
  const isAdmin = user?.id === ADMIN_USER_ID;

  // Use RevenueCat tier as source of truth (real-time), fall back to DB
  const _displayTier = subscriptionTier || rateLimit?.tier || "free";

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Fetch rate limit status
  const fetchRateLimit = useCallback(async (userId: string) => {
    const { data, error } = await supabase.rpc("get_rate_limit_status", {
      p_user_id: userId,
    });

    if (!error && data) {
      const rateLimitData = data as {
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
  }, []);

  // Fetch on user change
  useEffect(() => {
    if (user?.id) {
      fetchRateLimit(user.id);
    }
  }, [user?.id, fetchRateLimit]);

  // Also refresh on screen focus (navigating back from paywall, etc.)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchRateLimit(user.id);
      }
    }, [user?.id, fetchRateLimit])
  );

  const handleModeChange = (mode: CookingMode) => {
    if (mode === cookingMode || isUpdating || !user) return;
    updatePreferences({ cooking_mode: mode });
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
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
      {/* Header */}
      <View style={styles.header}>
        <Text variant="h1">Profile</Text>
      </View>

      {/* Profile Card */}
      <Card variant="elevated" padding={6}>
        <View style={styles.profileContent}>
          <View style={styles.avatar}>
            <Text variant="display" color="textOnPrimary">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text variant="label">{user?.email || "Loading..."}</Text>
            <Text variant="caption" color="textMuted">
              {isChef ? "Chef Plan" : "Free Plan"}
            </Text>
          </View>
        </View>
      </Card>

      {/* Cooking Mode */}
      <View style={styles.section}>
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Cooking Mode
        </Text>
        <Card variant="outlined" padding={4}>
          <CookingModeToggle
            value={cookingMode}
            onChange={handleModeChange}
            isUpdating={isUpdating}
          />
        </Card>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Preferences
        </Text>
        <Card variant="outlined" padding={0}>
          <SettingRow
            icon="flame-outline"
            label="Cooking Skill"
            value="Home Cook"
          />
          <SettingRow
            icon="leaf-outline"
            label="Dietary Restrictions"
            value="None"
          />
          <SettingRow
            icon="scale-outline"
            label="Preferred Units"
            value="Imperial"
          />
          <SettingRow
            icon="mic-outline"
            label="Voice Enabled"
            value="On"
            last
          />
        </Card>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Subscription
        </Text>
        <Card
          variant="elevated"
          style={{
            ...styles.subscriptionCard,
            ...(rateLimit?.remaining === 0
              ? styles.subscriptionCardExhausted
              : {}),
          }}
        >
          <View style={styles.subscriptionHeader}>
            <View style={[styles.planBadge, isChef && styles.planBadgeChef]}>
              <Text variant="buttonSmall" color="textOnPrimary">
                {isChef ? "CHEF" : "FREE"}
              </Text>
            </View>
            <Text variant="h4">{isChef ? "Chef Plan" : "Free Plan"}</Text>
          </View>

          {/* Daily Message Usage */}
          {rateLimit && (
            <View style={styles.usageSection}>
              <View style={styles.usageHeader}>
                <Ionicons
                  name={
                    rateLimit.remaining === 0
                      ? "alert-circle"
                      : "chatbubbles-outline"
                  }
                  size={16}
                  color={rateLimit.remaining === 0 ? colors.error : "#92400E"}
                />
                <Text
                  variant="body"
                  style={{
                    color: rateLimit.remaining === 0 ? colors.error : "#78350F",
                  }}
                >
                  {rateLimit.remaining === 0
                    ? "Daily limit reached"
                    : `${rateLimit.current}/${rateLimit.limit} messages used today`}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(100, (rateLimit.current / rateLimit.limit) * 100)}%`,
                      backgroundColor:
                        rateLimit.remaining === 0
                          ? colors.error
                          : rateLimit.current / rateLimit.limit >= 0.8
                            ? "#F59E0B"
                            : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text variant="caption" color="textMuted">
                {rateLimit.remaining === 0
                  ? "Resets at midnight"
                  : `${rateLimit.remaining} message${rateLimit.remaining === 1 ? "" : "s"} remaining`}
              </Text>
            </View>
          )}

          {isChef ? (
            <Pressable
              onPress={() => {
                // Open subscription management in the relevant app store
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
          ) : (
            <Button onPress={() => router.push("/paywall")}>
              Upgrade to Chef
            </Button>
          )}
        </Card>
      </View>

      {/* Admin Section - Only visible to admin users */}
      {isAdmin && (
        <View style={styles.section}>
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
        </View>
      )}

      {/* Account Actions */}
      <View style={styles.section}>
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Account
        </Text>
        <Card variant="outlined" padding={0}>
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
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text variant="caption" color="textMuted">
          CHEZ v1.0.0
        </Text>
        <Text variant="caption" color="textMuted">
          Made with care for home cooks
        </Text>
      </View>
    </ScrollView>
  );
}

function CookingModeToggle({
  value,
  onChange,
  isUpdating,
}: {
  value: CookingMode;
  onChange: (mode: CookingMode) => void;
  isUpdating: boolean;
}) {
  const modes: {
    mode: CookingMode;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { mode: "casual", label: "Casual", icon: "cafe-outline" },
    { mode: "chef", label: "Chef", icon: "ribbon-outline" },
  ];

  return (
    <View style={styles.modeToggleContainer}>
      {modes.map(({ mode, label, icon }) => {
        const isSelected = value === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            style={[styles.modeOption, isSelected && styles.modeOptionSelected]}
            disabled={isUpdating}
          >
            {isUpdating && isSelected ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons
                  name={icon}
                  size={20}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text
                  variant="buttonSmall"
                  color={isSelected ? "primary" : "textSecondary"}
                >
                  {label}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.settingRow, !last && styles.settingRowBorder]}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <Text variant="body">{label}</Text>
      </View>
      <Text variant="body" color="textMuted">
        {value}
      </Text>
    </View>
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
    paddingBottom: spacing[8],
  },
  header: {
    gap: spacing[1],
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
    gap: spacing[1],
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    marginLeft: spacing[1],
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  subscriptionCard: {
    backgroundColor: "#FEF3C7",
    gap: spacing[3],
  },
  subscriptionCardExhausted: {
    backgroundColor: "#FEE2E2",
  },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  planBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 4,
  },
  planBadgeChef: {
    backgroundColor: "#7C3AED",
  },
  usageSection: {
    gap: spacing[2],
  },
  usageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
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
  appInfo: {
    alignItems: "center",
    gap: spacing[1],
    paddingTop: spacing[4],
  },
  modeToggleContainer: {
    flexDirection: "row",
    gap: spacing[3],
  },
  modeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: "transparent",
  },
  modeOptionSelected: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primary,
  },
  manageLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
});
