import { View, StyleSheet, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { colors, spacing, borderRadius } from "@/constants/theme";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info";

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: colors.surfaceElevated, text: colors.textPrimary },
  primary: { bg: colors.primary, text: colors.textOnPrimary },
  success: { bg: "#DCFCE7", text: "#166534" },
  warning: { bg: "#FEF3C7", text: "#92400E" },
  error: { bg: "#FEE2E2", text: "#991B1B" },
  info: { bg: "#DBEAFE", text: "#1E40AF" },
};

export function Badge({ children, variant = "default", style }: BadgeProps) {
  const { bg, text } = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text variant="caption" color={text}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
  },
});
