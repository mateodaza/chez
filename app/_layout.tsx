import { Component, useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
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
import { OnboardingProvider } from "@/lib/auth/OnboardingContext";
import { fetchUserPreferences } from "@/lib/supabase/queries";
import { preloadTips } from "@/hooks";
import { colors } from "@/constants/theme";
import { initializePurchases, identifyUser, logoutUser } from "@/lib/purchases";

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
  connectionError: boolean,
  onboardingState: "loading" | "needed" | "complete",
  onOnboardingComplete: () => void
) {
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to load; don't route during connection errors
    if (isLoading || connectionError) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";

    if (!session) {
      // Not signed in - go to login (don't wait for onboarding check)
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
      return;
    }

    // Wait for onboarding check to complete (only when logged in)
    if (onboardingState === "loading") return;

    // Signed in - handle routing
    if (inAuthGroup) {
      // Just logged in - check if needs onboarding
      if (onboardingState === "needed") {
        router.replace("/(onboarding)/welcome");
      } else {
        router.replace("/(tabs)");
      }
      return;
    }

    // Needs onboarding and not already there
    if (onboardingState === "needed" && !inOnboardingGroup) {
      router.replace("/(onboarding)/welcome");
      return;
    }

    // Completed onboarding, redirect to tabs if still in onboarding screens
    // Skip redirect when viewing onboarding as help (fromHelp param)
    const isHelpView =
      inOnboardingGroup && (segments as string[])[1] === "welcome";
    if (onboardingState === "complete" && inOnboardingGroup && !isHelpView) {
      onOnboardingComplete();
      router.replace("/(tabs)");
    }
  }, [
    session,
    segments,
    isLoading,
    connectionError,
    router,
    onboardingState,
    onOnboardingComplete,
  ]);
}

function RootLayoutNav({ onReady }: { onReady: () => void }) {
  const {
    user,
    isLoading: authLoading,
    connectionError,
    retryConnection,
  } = useAuth();

  // Simple onboarding state - checked once per user, remembered for app lifetime
  const [onboardingState, setOnboardingState] = useState<
    "loading" | "needed" | "complete"
  >("loading");
  const checkedUserIdRef = useRef<string | null>(null);
  const [purchasesReady, setPurchasesReady] = useState(false);

  // Initialize RevenueCat SDK once on mount
  useEffect(() => {
    let mounted = true;
    initializePurchases().then(() => {
      if (mounted) setPurchasesReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Identify user with RevenueCat when authenticated AND SDK is ready
  useEffect(() => {
    if (!purchasesReady) return;

    if (user?.id) {
      identifyUser(user.id);
    } else if (!authLoading && !user) {
      // User logged out - logout from RevenueCat too
      logoutUser();
    }
  }, [user?.id, authLoading, purchasesReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check onboarding status ONCE per user login
  // New users (no prefs) → show welcome carousel; returning users → skip to tabs
  useEffect(() => {
    // Reset if user changes (logout/login)
    if (!user?.id) {
      setOnboardingState("loading");
      checkedUserIdRef.current = null;
      return;
    }

    // Already checked this user - don't re-check
    if (checkedUserIdRef.current === user.id) {
      return;
    }

    // Check if user has preferences (= completed onboarding before)
    fetchUserPreferences(user.id)
      .then((prefs) => {
        checkedUserIdRef.current = user.id;
        setOnboardingState(prefs ? "complete" : "needed");
      })
      .catch(() => {
        // On error, show onboarding — better than silently skipping it
        checkedUserIdRef.current = user.id;
        setOnboardingState("needed");
      });
  }, [user?.id]);

  // Mark onboarding complete when user finishes (called from onboarding screens)
  const handleOnboardingComplete = useCallback(() => {
    setOnboardingState("complete");
  }, []);

  useProtectedRoute(
    authLoading,
    connectionError,
    onboardingState,
    handleOnboardingComplete
  );

  // Hide splash screen and preload tips once auth state is resolved
  useEffect(() => {
    if (!authLoading) {
      onReady();
      // Preload tips in background for loading screens
      if (!connectionError) preloadTips();
    }
  }, [authLoading, connectionError, onReady]);

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

  if (connectionError) {
    return (
      <View style={styles.connectionErrorContainer}>
        <Image
          source={require("@/assets/chez-logo.png")}
          style={styles.connectionErrorLogo}
          resizeMode="contain"
        />
        <Text style={styles.connectionErrorTitle}>
          Couldn&apos;t connect to Chez
        </Text>
        <Text style={styles.connectionErrorMessage}>
          Please check your internet connection and try again.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
            authLoading && styles.retryButtonDisabled,
          ]}
          onPress={retryConnection}
          disabled={authLoading}
        >
          {authLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.retryButtonText}>Retry</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <OnboardingProvider onComplete={handleOnboardingComplete}>
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
        <Stack.Screen
          name="paywall"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
      </Stack>
    </OnboardingProvider>
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
  connectionErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 32,
  },
  connectionErrorLogo: {
    width: 280,
    height: 93,
    marginBottom: 24,
  },
  connectionErrorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  connectionErrorMessage: {
    fontSize: 15,
    color: "#78716c",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
