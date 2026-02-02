import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fetchUserPreferences } from "@/lib/supabase/queries";
import { colors } from "@/constants/theme";

export default function OnboardingGate() {
  const router = useRouter();

  useEffect(() => {
    const checkPreferences = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      try {
        const prefs = await fetchUserPreferences(user.id);
        if (prefs) {
          // User has preferences - go to main app
          router.replace("/(tabs)");
        } else {
          // New user - go to mode selection
          router.replace("/(onboarding)/mode-select");
        }
      } catch (err) {
        // On error, allow access; fallback check in _layout will handle later
        console.warn("[OnboardingGate] Failed to fetch preferences:", err);
        router.replace("/(tabs)");
      }
    };

    checkPreferences();
  }, [router]);

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
