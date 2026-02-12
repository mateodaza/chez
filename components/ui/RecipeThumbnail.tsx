import {
  View,
  StyleSheet,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { Image } from "expo-image";
import type { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius } from "@/constants/theme";

type NativeStyle = (ViewStyle & ImageStyle) & { boxShadow?: string };

const chezHat = require("@/assets/chez-only-hat.png");

/** Maps recipe mode to a filled Ionicons icon */
export function getModeIcon(mode: string): keyof typeof Ionicons.glyphMap {
  switch (mode) {
    case "cooking":
      return "flame";
    case "mixology":
      return "wine";
    case "pastry":
      return "cafe";
    default:
      return "restaurant";
  }
}

interface RecipeThumbnailProps {
  uri?: string | null;
  mode?: string;
  /** Pixel dimension (width = height). Defaults to 72. */
  size?: number;
}

/**
 * Unified recipe thumbnail — shows the image when available,
 * otherwise a branded placeholder with the Chez hat watermark.
 */
export function RecipeThumbnail({ uri, size = 72 }: RecipeThumbnailProps) {
  const radius = size <= 48 ? borderRadius.md : borderRadius.lg;
  const hatSize = Math.round(size * 0.65);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: radius },
        ]}
        contentFit="cover"
        cachePolicy="disk"
        recyclingKey={uri}
        transition={200}
      />
    );
  }

  return (
    <View
      style={
        [
          styles.placeholder,
          { width: size, height: size, borderRadius: radius },
        ] as NativeStyle[]
      }
    >
      <Image
        source={chezHat}
        style={{ width: hatSize, height: hatSize, opacity: 0.18 }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderCurve: "continuous",
    backgroundColor: colors.surface,
  } as NativeStyle,
  placeholder: {
    borderCurve: "continuous",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "rgba(234, 88, 12, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  } as NativeStyle,
});
