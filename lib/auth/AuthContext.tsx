import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { stop as stopTTS, clearCache as clearTTSCache } from "@/lib/tts";
import { clearOnboardingState } from "./onboarding-tracker";
import { withTimeout } from "@/lib/utils/timeout";

const AUTH_TIMEOUT_MS = 10_000;
const OTP_TIMEOUT_MS = 15_000;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  connectionError: boolean;
  retryConnection: () => void;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isTimeoutOrNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.message.startsWith("Request timed out") ||
      err.message.includes("network") ||
      err.message.includes("Network") ||
      err.message.includes("fetch") ||
      err.message.includes("Failed to fetch")
    );
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const mountedRef = useRef(true);

  const attemptGetSession = useCallback(() => {
    setIsLoading(true);
    setConnectionError(false);

    withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS, "getSession")
      .then(({ data: { session: s }, error }) => {
        if (!mountedRef.current) return;

        if (error) {
          // Real auth error (e.g., invalid refresh token) — clear session
          console.warn("[auth] Stale session cleared:", error.message);
          supabase.auth.signOut().catch(() => {});
          setSession(null);
        } else {
          setSession(s);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!mountedRef.current) return;

        if (isTimeoutOrNetworkError(err)) {
          // Network/timeout — don't clear session, show connection error
          console.warn("[auth] Connection error:", (err as Error).message);
          setConnectionError(true);
        } else {
          // Unknown error — clear session to be safe
          setSession(null);
        }
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    attemptGetSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mountedRef.current) {
        setSession(s);
        // Clear connection error on successful auth event
        setConnectionError(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const retryConnection = useCallback(() => {
    attemptGetSession();
  }, [attemptGetSession]);

  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        }),
        OTP_TIMEOUT_MS,
        "signInWithOtp"
      );
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      const message =
        err instanceof Error && err.message.startsWith("Request timed out")
          ? "Couldn't reach our servers. Please check your connection and try again."
          : (err as Error).message;
      return { error: new Error(message) };
    }
  }, []);

  const signOut = useCallback(async () => {
    // Stop any playing TTS and clear cache before signing out
    await stopTTS();
    clearTTSCache();
    // Clear onboarding state so it shows again on next login
    await clearOnboardingState();
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        connectionError,
        retryConnection,
        signInWithMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
