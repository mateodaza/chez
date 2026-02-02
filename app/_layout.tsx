import { Component, useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useSegments } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as SplashScreen from "expo-splash-screen";

import { supabaseInitError } from "@/lib/supabase";
import { AuthProvider, useAuth } from "@/lib/auth";
import { fetchUserPreferences } from "@/lib/supabase/queries";
import { preloadTips } from "@/hooks";
import { colors } from "@/constants/theme";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Error boundary to catch initialization crashes
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <ScrollView contentContainerStyle={styles.errorContent}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>
              {__DEV__
                ? this.state.error?.message || "Unknown error"
                : "Please restart the app. If the problem persists, try reinstalling."}
            </Text>
            {__DEV__ && (
              <>
                <Text style={styles.debugTitle}>Debug Info (dev only):</Text>
                <Text style={styles.debugText}>
                  supabaseUrl:{" "}
                  {Constants.expoConfig?.extra?.supabaseUrl ? "SET" : "MISSING"}
                </Text>
                <Text style={styles.debugText}>
                  supabaseAnonKey:{" "}
                  {Constants.expoConfig?.extra?.supabaseAnonKey
                    ? "SET"
                    : "MISSING"}
                </Text>
                <Text style={styles.debugText}>
                  Stack: {this.state.error?.stack?.slice(0, 500)}
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function useProtectedRoute(
  isLoading: boolean,
  prefsChecked: boolean,
  hasPrefs: boolean | null
) {
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";

    if (!session) {
      // Not signed in - must be in auth
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
    } else {
      // Signed in
      if (inAuthGroup) {
        // Route to onboarding gate which decides tabs vs mode-select
        router.replace("/(onboarding)/gate");
        return;
      }

      // Fallback onboarding check (for app relaunch, deep links)
      // Only redirect if: prefs checked, no prefs found, not already in onboarding
      if (prefsChecked && hasPrefs === false && !inOnboardingGroup) {
        router.replace("/(onboarding)/mode-select");
      }
    }
  }, [session, segments, isLoading, router, prefsChecked, hasPrefs]);
}

function RootLayoutNav({ onReady }: { onReady: () => void }) {
  const { user, isLoading: authLoading } = useAuth();
  const segments = useSegments();
  const [prefsChecked, setPrefsChecked] = useState(false);
  const [hasPrefs, setHasPrefs] = useState<boolean | null>(null);
  const lastCheckedUserId = useRef<string | null>(null);

  // Track if we just came from onboarding to avoid the loop
  const wasInOnboarding = useRef(false);
  const currentGroup = segments[0];

  useEffect(() => {
    if (currentGroup === "(onboarding)") {
      wasInOnboarding.current = true;
    }
  }, [currentGroup]);

  // Fallback preferences check (for app relaunch, deep links)
  // Re-fetch when entering tabs from onboarding to catch newly created prefs
  useEffect(() => {
    if (!user?.id) {
      setPrefsChecked(false);
      setHasPrefs(null);
      lastCheckedUserId.current = null;
      return;
    }

    // Detect transition from onboarding to tabs
    const isTransitioningFromOnboarding =
      wasInOnboarding.current && currentGroup === "(tabs)";

    // Reset prefsChecked IMMEDIATELY when transitioning to prevent race condition
    // This stops useProtectedRoute from redirecting before refetch completes
    if (isTransitioningFromOnboarding) {
      setPrefsChecked(false);
      wasInOnboarding.current = false;
    }

    // Determine if we should refetch
    const shouldRefetch =
      user.id !== lastCheckedUserId.current || isTransitioningFromOnboarding;

    if (!shouldRefetch) return;

    lastCheckedUserId.current = user.id;

    fetchUserPreferences(user.id)
      .then((prefs) => {
        setHasPrefs(prefs !== null);
        setPrefsChecked(true);
      })
      .catch(() => {
        // On error, leave prefsChecked=false to allow retry on next navigation
        // Don't permanently suppress onboarding - user may have no prefs
        setHasPrefs(null);
        lastCheckedUserId.current = null; // Allow retry
      });
  }, [user?.id, currentGroup]);

  useProtectedRoute(authLoading, prefsChecked, hasPrefs);

  // Hide splash screen and preload tips once auth state is resolved
  useEffect(() => {
    if (!authLoading) {
      onReady();
      // Preload tips in background for loading screens
      preloadTips();
    }
  }, [authLoading, onReady]);

  if (supabaseInitError) {
    const error = supabaseInitError;
    return (
      <View style={styles.errorContainer}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>
            {__DEV__
              ? error?.message
              : "Unable to connect. Please check your internet connection and try again."}
          </Text>
          {__DEV__ && (
            <>
              <Text style={styles.debugTitle}>Debug Info (dev only):</Text>
              <Text style={styles.debugText}>
                supabaseUrl:{" "}
                {Constants.expoConfig?.extra?.supabaseUrl ? "SET" : "MISSING"}
              </Text>
              <Text style={styles.debugText}>
                supabaseAnonKey:{" "}
                {Constants.expoConfig?.extra?.supabaseAnonKey
                  ? "SET"
                  : "MISSING"}
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="recipe/[id]"
          options={{
            headerShown: true,
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <Stack.Screen
          name="cook/[id]"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Show nothing while fonts load (splash screen stays visible)
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootLayoutNav onReady={onLayoutRootView} />
          </AuthProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
  },
  errorContent: {
    padding: 24,
    paddingTop: 60,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#dc2626",
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: "#7f1d1d",
    marginBottom: 24,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#991b1b",
    marginTop: 16,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#991b1b",
    fontFamily: "monospace",
    marginBottom: 4,
  },
});
