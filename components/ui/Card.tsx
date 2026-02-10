import { View, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { colors, spacing, borderRadius, shadows } from "@/constants/theme";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "default" | "elevated" | "outlined";
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export function Card({
  children,
  onPress,
  variant = "default",
  padding = 4,
  style,
}: CardProps) {
  const cardStyle = [
    styles.base,
    { padding: spacing[padding] },
    variant === "default" && styles.default,
    variant === "elevated" && styles.elevated,
    variant === "outlined" && styles.outlined,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    gap: spacing[2],
  },
  default: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    ...shadows.md,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
