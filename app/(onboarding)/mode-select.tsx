import { useState, useEffect } from "react";
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import {
  fetchUserPreferences,
  upsertUserPreferences,
  ensureUserExists,
} from "@/lib/supabase/queries";
import { useOnboarding } from "@/lib/auth/OnboardingContext";
import { Text, Button } from "@/components/ui";
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
  features: string[];
}

const modeOptions: ModeOption[] = [
  {
    mode: "casual",
    icon: "cafe-outline",
    title: "Casual Cook",
    description: "Simple cooking with AI help. Perfect for everyday meals.",
    features: [
      "Voice-guided cooking",
      "Ask Chez anything",
      "Save favorite recipes",
    ],
  },
  {
    mode: "chef",
    icon: "ribbon-outline",
    title: "Chef Mode",
    description: "Full power: version history, learnings, and more.",
    features: [
      "Everything in Casual, plus:",
      "My Version (save adaptations)",
      "Version history & comparisons",
      "Learning detection & memory",
    ],
  },
];

export default function ModeSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { markComplete } = useOnboarding();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMode, setSelectedMode] = useState<CookingMode>("casual"); // Pre-select Casual for new users
  const [existingMode, setExistingMode] = useState<CookingMode | null>(null);

  // Fetch existing preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/(auth)/login");
          return;
        }

        const prefs = await fetchUserPreferences(user.id);
        if (prefs?.cooking_mode) {
          const mode = prefs.cooking_mode as CookingMode;
          setExistingMode(mode);
          setSelectedMode(mode); // Pre-select existing preference
        }
      } catch (error) {
        console.warn("[ModeSelect] Failed to load preference:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, [router]);

  const handleSelect = (mode: CookingMode) => {
    if (isSubmitting) return;
    setSelectedMode(mode);
  };

  const handleContinue = async () => {
    if (!selectedMode || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Ensure user exists in public.users table (needed for FK constraints)
      await ensureUserExists(user.id, user.email);

      // Only save if mode changed or new user
      if (selectedMode !== existingMode) {
        await upsertUserPreferences(user.id, { cooking_mode: selectedMode });
      }

      // Mark onboarding complete before navigating to prevent redirect loop
      markComplete();
      router.replace("/(tabs)");
    } catch (error) {
      console.error("[ModeSelect] Failed to save preference:", error);
      Alert.alert(
        "Something went wrong",
        "Unable to save your preference. Please try again.",
        [{ text: "OK" }]
      );
      setIsSubmitting(false);
    }
  };

  const isReturningUser = existingMode !== null;
  const hasChanged = selectedMode !== existingMode;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing[8], paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Image
          source={require("@/assets/chez-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="h1" style={styles.title}>
          {isReturningUser ? "Welcome back!" : "How do you cook?"}
        </Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {isReturningUser
            ? "Continue with your current mode or switch it up."
            : "Choose your experience. You can change this anytime in settings."}
        </Text>
      </View>

      <ScrollView
        style={styles.optionsScroll}
        contentContainerStyle={styles.optionsContainer}
        showsVerticalScrollIndicator={false}
      >
        {modeOptions.map((option) => {
          const isSelected = selectedMode === option.mode;
          const isCurrentMode = existingMode === option.mode;

          return (
            <Pressable
              key={option.mode}
              onPress={() => handleSelect(option.mode)}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.optionCard,
                pressed && !isSubmitting && styles.optionCardPressed,
                isSelected && styles.optionCardSelected,
                isSubmitting && !isSelected && styles.optionCardDisabled,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  isSelected && styles.iconContainerSelected,
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={32}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Text variant="h3" style={styles.optionTitle}>
                    {option.title}
                  </Text>
                  {isCurrentMode && (
                    <View style={styles.currentBadge}>
                      <Text variant="caption" style={styles.currentBadgeText}>
                        Current
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  variant="bodySmall"
                  color="textSecondary"
                  style={styles.optionDescription}
                >
                  {option.description}
                </Text>
                {isSelected && (
                  <View style={styles.featuresContainer}>
                    {option.features.map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Ionicons
                          name={
                            index === 0 && option.mode === "chef"
                              ? "arrow-forward"
                              : "checkmark"
                          }
                          size={14}
                          color={colors.primary}
                        />
                        <Text variant="caption" color="textSecondary">
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.primary}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          onPress={handleContinue}
          disabled={!selectedMode}
          loading={isSubmitting}
          fullWidth
        >
          {isReturningUser
            ? hasChanged
              ? "Switch Mode"
              : "Continue"
            : "Get Started"}
        </Button>
        <Text variant="caption" color="textMuted" style={styles.footerText}>
          {isReturningUser
            ? "You can always change this in your profile"
            : "This helps us tailor your cooking experience"}
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: spacing[8],
  },
  logo: {
    width: 100,
    height: 34,
    marginBottom: spacing[4],
  },
  title: {
    marginBottom: spacing[2],
  },
  subtitle: {
    maxWidth: 300,
  },
  optionsScroll: {
    flex: 1,
  },
  optionsContainer: {
    flexGrow: 1,
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
    backgroundColor: "#FFF7ED", // Light orange background when selected
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
  iconContainerSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  optionTitle: {},
  currentBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  currentBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  optionDescription: {
    lineHeight: 20,
  },
  featuresContainer: {
    marginTop: spacing[3],
    gap: spacing[1],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  footer: {
    gap: spacing[3],
    paddingVertical: spacing[6],
  },
  footerText: {
    textAlign: "center",
  },
});
