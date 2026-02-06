import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui";
import { colors, spacing, borderRadius } from "@/constants/theme";

interface SubscriptionCardProps {
  tier: "free" | "chef";
  recipesImported: number;
  recipesLimit: number;
  messagesUsed: number;
  messagesLimit: number;
  messagesRemaining: number;
}

export function SubscriptionCard({
  tier,
  recipesImported,
  recipesLimit,
  messagesUsed,
  messagesLimit,
  messagesRemaining,
}: SubscriptionCardProps) {
  const router = useRouter();
  const isFree = tier === "free";
  const isLoading = messagesRemaining < 0; // -1 indicates loading state
  const isExhausted = !isLoading && messagesRemaining === 0;

  const recipesPercentage = Math.min(
    100,
    (recipesImported / recipesLimit) * 100
  );
  const messagesPercentage = Math.min(
    100,
    (messagesUsed / messagesLimit) * 100
  );

  return (
    <View
      style={[
        styles.container,
        isFree && styles.containerFree,
        !isFree && styles.containerChef,
        isExhausted && styles.containerExhausted,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <View style={[styles.badge, !isFree && styles.badgeChef]}>
              <Text variant="buttonSmall" color="textOnPrimary">
                {isFree ? "FREE" : "CHEF"}
              </Text>
            </View>
            <Text variant="h4">{isFree ? "Free Plan" : "Chef Plan"}</Text>
          </View>
          <Text variant="caption" color="textSecondary" style={styles.subtitle}>
            {isLoading
              ? "Loading..."
              : isFree
                ? `${messagesLimit} messages/day, ${recipesLimit} imports/month`
                : `${messagesLimit} messages/day, unlimited imports`}
          </Text>
        </View>
        {isFree && (
          <Pressable
            onPress={() => router.push("/paywall")}
            style={styles.upgradeButton}
          >
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </Pressable>
        )}
      </View>

      {/* Usage Section - only show when data has loaded */}
      {!isLoading && (
        <View style={styles.usageSection}>
          {/* Recipes limit (Free tier only) */}
          {isFree && (
            <View style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <View style={styles.usageLabelRow}>
                  <Ionicons
                    name="book-outline"
                    size={14}
                    color={
                      recipesImported >= recipesLimit
                        ? colors.error
                        : isFree
                          ? "#92400E"
                          : "#7C3AED"
                    }
                  />
                  <Text
                    variant="caption"
                    style={[
                      styles.usageLabel,
                      !isFree && styles.usageLabelChef,
                    ]}
                  >
                    Imports this month
                  </Text>
                </View>
                <Text
                  variant="caption"
                  style={[styles.usageValue, !isFree && styles.usageLabelChef]}
                >
                  {recipesImported} / {recipesLimit}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${recipesPercentage}%`,
                      backgroundColor:
                        recipesImported >= recipesLimit
                          ? colors.error
                          : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Messages limit (both tiers) */}
          <View style={styles.usageItem}>
            <View style={styles.usageHeader}>
              <View style={styles.usageLabelRow}>
                <Ionicons
                  name={isExhausted ? "alert-circle" : "chatbubbles-outline"}
                  size={14}
                  color={
                    isExhausted ? colors.error : isFree ? "#92400E" : "#7C3AED"
                  }
                />
                <Text
                  variant="caption"
                  style={[
                    styles.usageLabel,
                    !isFree && styles.usageLabelChef,
                    isExhausted && { color: colors.error },
                  ]}
                >
                  {isExhausted ? "Daily limit reached" : "AI messages today"}
                </Text>
              </View>
              <Text
                variant="caption"
                style={[styles.usageValue, !isFree && styles.usageLabelChef]}
              >
                {messagesUsed} / {messagesLimit}
              </Text>
            </View>
            <View
              style={[
                styles.progressBarContainer,
                !isFree && styles.progressBarContainerChef,
              ]}
            >
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${messagesPercentage}%`,
                    backgroundColor: isExhausted
                      ? colors.error
                      : messagesPercentage >= 80
                        ? "#F59E0B"
                        : isFree
                          ? colors.primary
                          : "#7C3AED",
                  },
                ]}
              />
            </View>
            <Text variant="caption" color="textMuted">
              {isExhausted
                ? "Resets at midnight"
                : `${messagesRemaining} message${messagesRemaining === 1 ? "" : "s"} remaining`}
            </Text>
          </View>
        </View>
      )}

      {/* Chef Plan: Features */}
      {!isFree && (
        <View style={styles.chefFeatures}>
          <View style={styles.featureRow}>
            <Ionicons name="sparkles" size={16} color="#7C3AED" />
            <Text variant="bodySmall" color="textSecondary">
              Save learnings to My Version
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="git-compare" size={16} color="#7C3AED" />
            <Text variant="bodySmall" color="textSecondary">
              Version history & comparisons
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
  },
  containerFree: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  containerChef: {
    backgroundColor: "#F5F3FF",
    borderColor: "#A78BFA",
    borderWidth: 2,
  },
  containerExhausted: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  subtitle: {
    marginTop: spacing[1],
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 4,
  },
  badgeChef: {
    backgroundColor: "#7C3AED",
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  upgradeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  usageSection: {
    marginTop: spacing[4],
    gap: spacing[4],
  },
  usageItem: {
    gap: spacing[2],
  },
  usageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  usageLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  usageLabel: {
    color: "#78350F",
  },
  usageLabelChef: {
    color: "#5B21B6",
  },
  usageValue: {
    fontWeight: "600",
    color: "#78350F",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarContainerChef: {
    backgroundColor: "rgba(124,58,237,0.15)",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  chefFeatures: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
});
