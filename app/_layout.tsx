import { Component, useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as SplashScreen from "expo-splash-screen";

import { supabase, supabaseInitError } from "@/lib/supabase";
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

function useProtectedRoute(session: Session | null, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not signed in, redirect to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Signed in, redirect to main app
      router.replace("/(tabs)");
    }
  }, [session, segments, isLoading, router]);
}

function RootLayoutNav({ onReady }: { onReady: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<Error | null>(supabaseInitError);

  useEffect(() => {
    if (supabaseInitError) {
      setInitError(supabaseInitError);
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setIsLoading(false);
      })
      .catch((err) => {
        setInitError(err);
        setIsLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useProtectedRoute(session, isLoading);

  // Hide splash screen once auth state is resolved
  useEffect(() => {
    if (!isLoading) {
      onReady();
    }
  }, [isLoading, onReady]);

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>
            {__DEV__
              ? initError.message
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

  if (isLoading) {
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
            headerShown: true,
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
          <RootLayoutNav onReady={onLayoutRootView} />
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
