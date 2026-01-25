import { Component, useEffect, useState } from "react";
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

import { supabase, supabaseInitError } from "@/lib/supabase";

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
      const extra = Constants.expoConfig?.extra;
      return (
        <View style={styles.errorContainer}>
          <ScrollView contentContainerStyle={styles.errorContent}>
            <Text style={styles.errorTitle}>App Initialization Error</Text>
            <Text style={styles.errorMessage}>
              {this.state.error?.message || "Unknown error"}
            </Text>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText}>
              supabaseUrl: {extra?.supabaseUrl ? "SET" : "MISSING"}
            </Text>
            <Text style={styles.debugText}>
              supabaseAnonKey: {extra?.supabaseAnonKey ? "SET" : "MISSING"}
            </Text>
            <Text style={styles.debugText}>
              Stack: {this.state.error?.stack?.slice(0, 500)}
            </Text>
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

function RootLayoutNav() {
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

  if (initError) {
    const extra = Constants.expoConfig?.extra;
    return (
      <View style={styles.errorContainer}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>Initialization Error</Text>
          <Text style={styles.errorMessage}>{initError.message}</Text>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>
            supabaseUrl: {extra?.supabaseUrl ? "SET" : "MISSING"}
          </Text>
          <Text style={styles.debugText}>
            supabaseAnonKey: {extra?.supabaseAnonKey ? "SET" : "MISSING"}
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        <ActivityIndicator size="large" color="#f97316" />
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
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
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
