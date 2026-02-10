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
  const isLoading = messagesRemaining < 0;
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
    <View style={[styles.card, isExhausted && styles.cardExhausted]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.planInfo}>
          <View style={[styles.iconCircle, !isFree && styles.iconCircleChef]}>
            <Ionicons
              name={isFree ? "leaf-outline" : "diamond"}
              size={16}
              color="#fff"
            />
          </View>
          <View>
            <Text variant="label" style={{ fontSize: 15 }}>
              {isFree ? "Free Plan" : "Chef Plan"}
            </Text>
            <Text variant="caption" color="textMuted" style={{ fontSize: 11 }}>
              {isLoading
                ? "Loading..."
                : isFree
                  ? `${recipesLimit} saves/mo · ${messagesLimit} msgs/day`
                  : `Unlimited saves · ${messagesLimit} msgs/day`}
            </Text>
          </View>
        </View>
      </View>

      {/* Usage meters */}
      {!isLoading && (
        <View style={styles.meters}>
          {/* Saves meter — free only */}
          {isFree && (
            <View style={styles.meter}>
              <View style={styles.meterHeader}>
                <Text style={styles.meterLabel}>Saves</Text>
                <Text style={styles.meterValue}>
                  {recipesImported}
                  <Text style={styles.meterMax}> / {recipesLimit}</Text>
                </Text>
              </View>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.barFill,
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

          {/* Messages meter */}
          <View style={styles.meter}>
            <View style={styles.meterHeader}>
              <View style={styles.meterLabelRow}>
                {isExhausted && (
                  <Ionicons
                    name="alert-circle"
                    size={12}
                    color={colors.error}
                  />
                )}
                <Text
                  style={[
                    styles.meterLabel,
                    isExhausted && { color: colors.error },
                  ]}
                >
                  {isExhausted ? "Limit reached" : "AI Messages"}
                </Text>
              </View>
              <Text style={styles.meterValue}>
                {messagesUsed}
                <Text style={styles.meterMax}> / {messagesLimit}</Text>
              </Text>
            </View>
            <View style={styles.bar}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${messagesPercentage}%`,
                    backgroundColor: isExhausted
                      ? colors.error
                      : messagesPercentage >= 80
                        ? colors.warning
                        : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.meterFootnote}>
              {isExhausted
                ? "Resets at midnight"
                : `${messagesRemaining} remaining · resets daily`}
            </Text>
          </View>
        </View>
      )}

      {/* Chef features */}
      {!isFree && (
        <View style={styles.features}>
          {[
            { icon: "sparkles" as const, text: "Save learnings to My Version" },
            {
              icon: "git-compare" as const,
              text: "Version history & comparisons",
            },
          ].map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Ionicons name={f.icon} size={14} color={colors.primary} />
              <Text variant="caption" color="textSecondary">
                {f.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Upgrade CTA */}
      {isFree && (
        <Pressable
          onPress={() => router.push("/paywall")}
          style={styles.upgradeBtn}
        >
          <Ionicons name="diamond-outline" size={16} color="#fff" />
          <Text style={styles.upgradeBtnText}>Upgrade to Chef</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: "continuous",
  },
  cardExhausted: {
    borderColor: "#FECACA",
  },

  // Header
  header: {
    padding: spacing[4],
    paddingBottom: 0,
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleChef: {
    backgroundColor: colors.primaryDark,
  },

  // Meters
  meters: {
    padding: spacing[4],
    gap: spacing[3],
  },
  meter: {
    gap: 4,
  },
  meterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meterLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meterLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: colors.textSecondary,
  },
  meterValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.textPrimary,
  },
  meterMax: {
    fontWeight: "400" as const,
    color: colors.textMuted,
  },
  bar: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  meterFootnote: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // Features
  features: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },

  // Upgrade button
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.primary,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
  },
  upgradeBtnText: {
    color: "#fff",
    fontWeight: "700" as const,
    fontSize: 15,
  },
});
