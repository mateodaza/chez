import { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { upsertUserPreferences } from "@/lib/supabase/queries";
import { Text } from "@/components/ui";
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  touchTarget,
} from "@/constants/theme";

type CookingMode = "casual" | "chef";

interface ModeOption {
  mode: CookingMode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const modeOptions: ModeOption[] = [
  {
    mode: "casual",
    icon: "cafe-outline",
    title: "Casual",
    description: "Quick recipes, simple steps, just the essentials",
  },
  {
    mode: "chef",
    icon: "ribbon-outline",
    title: "Chef",
    description: "Detailed techniques, precise measurements, version history",
  },
];

export default function ModeSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMode, setSelectedMode] = useState<CookingMode | null>(null);

  const handleSelect = async (mode: CookingMode) => {
    if (isSubmitting) return;

    setSelectedMode(mode);
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      await upsertUserPreferences(user.id, { cooking_mode: mode });
      router.replace("/(tabs)");
    } catch (error) {
      console.error("[ModeSelect] Failed to save preference:", error);
      Alert.alert(
        "Something went wrong",
        "Unable to save your preference. Please try again.",
        [{ text: "OK" }]
      );
      setIsSubmitting(false);
      setSelectedMode(null);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing[8], paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Text variant="h1" style={styles.title}>
          How do you cook?
        </Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          Choose your experience. You can change this anytime in settings.
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {modeOptions.map((option) => {
          const isSelected = selectedMode === option.mode;
          const isDisabled = isSubmitting && !isSelected;

          return (
            <Pressable
              key={option.mode}
              onPress={() => handleSelect(option.mode)}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.optionCard,
                pressed && !isSubmitting && styles.optionCardPressed,
                isSelected && styles.optionCardSelected,
                isDisabled && styles.optionCardDisabled,
              ]}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={option.icon}
                  size={32}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.optionContent}>
                <Text variant="h3" style={styles.optionTitle}>
                  {option.title}
                </Text>
                <Text
                  variant="bodySmall"
                  color="textSecondary"
                  style={styles.optionDescription}
                >
                  {option.description}
                </Text>
              </View>
              {isSelected && isSubmitting && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.loader}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text variant="caption" color="textMuted" style={styles.footerText}>
          This helps us tailor your cooking experience
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[6],
  },
  header: {
    marginBottom: spacing[8],
  },
  title: {
    marginBottom: spacing[2],
  },
  subtitle: {
    maxWidth: 280,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: spacing[4],
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing[5],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: touchTarget.large * 2,
    ...shadows.sm,
  },
  optionCardPressed: {
    backgroundColor: colors.surfaceElevated,
    transform: [{ scale: 0.98 }],
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[4],
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    marginBottom: spacing[1],
  },
  optionDescription: {
    lineHeight: 20,
  },
  loader: {
    marginLeft: spacing[2],
  },
  footer: {
    alignItems: "center",
    paddingVertical: spacing[6],
  },
  footerText: {
    textAlign: "center",
  },
});
