import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Text } from "./Text";
import { colors, spacing, borderRadius, shadows } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const sizeStyles = {
  sm: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  md: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
  lg: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
  },
};

const variantStyles = {
  primary: {
    default: {
      backgroundColor: colors.primary,
    },
    pressed: {
      backgroundColor: colors.primaryDark,
    },
    text: colors.textOnPrimary,
  },
  secondary: {
    default: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      backgroundColor: colors.surfaceElevated,
    },
    text: colors.textPrimary,
  },
  ghost: {
    default: {
      backgroundColor: "transparent",
    },
    pressed: {
      backgroundColor: colors.surfaceElevated,
    },
    text: colors.primary,
  },
  danger: {
    default: {
      backgroundColor: colors.error,
    },
    pressed: {
      backgroundColor: "#DC2626",
    },
    text: colors.textOnPrimary,
  },
};

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyle.default,
        pressed && variantStyle.pressed,
        (disabled || loading) && styles.disabled,
        fullWidth && styles.fullWidth,
        variant === "primary" && shadows.sm,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text} size="small" />
      ) : typeof children === "string" ? (
        <Text
          variant={size === "sm" ? "buttonSmall" : "button"}
          color={variantStyle.text}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    gap: spacing[2],
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: "100%",
  },
});
