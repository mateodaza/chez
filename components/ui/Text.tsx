import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { textStyles, colors } from "@/constants/theme";

type TextVariant = keyof typeof textStyles;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof typeof colors | string;
}

export function Text({
  variant = "body",
  color,
  style,
  children,
  ...props
}: TextProps) {
  const textColor = color
    ? color in colors
      ? colors[color as keyof typeof colors]
      : color
    : colors.textPrimary;

  return (
    <RNText
      style={[textStyles[variant], { color: textColor }, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}
