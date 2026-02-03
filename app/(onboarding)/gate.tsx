import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

/**
 * OnboardingGate - Entry point after login
 *
 * Always routes to mode-select on every login so users can
 * confirm or change their cooking mode preference.
 */
export default function OnboardingGate() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to be resolved
    if (isLoading) return;

    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    // Always show mode selection on login
    // mode-select will fetch existing preference and pre-select it
    router.replace("/(onboarding)/mode-select");
  }, [router, user, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
