import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, borderRadius } from "@/constants/theme";

interface RateLimitBannerProps {
  current: number;
  limit: number;
  tier: "free" | "chef";
}

export function RateLimitBanner({
  current,
  limit,
  tier,
}: RateLimitBannerProps) {
  const router = useRouter();

  // Safety check for invalid values
  if (!limit || limit <= 0) return null;

  const remaining = limit - current;
  const percentage = (current / limit) * 100;
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  // Only show when at 70% or more of limit
  if (percentage < 70) return null;

  const backgroundColor = isCritical
    ? colors.errorLight
    : isWarning
      ? "#FEF2F2"
      : "#FFFBEB";

  const iconColor = isCritical
    ? colors.error
    : isWarning
      ? colors.error
      : colors.warning;

  const getMessage = () => {
    if (remaining <= 0) {
      return "No messages left today";
    }
    if (remaining <= 3) {
      return `Only ${remaining} message${remaining === 1 ? "" : "s"} left!`;
    }
    return `${remaining} messages left today`;
  };

  const getSubtext = () => {
    if (tier === "free") {
      return "Upgrade to Chef for 500/day";
    }
    return "Resets at midnight UTC";
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Ionicons
        name={
          isCritical
            ? "warning"
            : isWarning
              ? "alert-circle"
              : "information-circle"
        }
        size={20}
        color={iconColor}
      />
      <View style={styles.textContainer}>
        <Text style={styles.message}>{getMessage()}</Text>
        <Text style={styles.subtext}>{getSubtext()}</Text>
      </View>
      {tier === "free" && (
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          style={styles.upgradeButton}
        >
          <Text style={styles.upgradeText}>Upgrade</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  subtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  upgradeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
