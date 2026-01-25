// Safely try to install localStorage polyfill from expo-sqlite
// This can fail in production builds if the native module isn't properly linked
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import type { Database } from "@/types/database";

let localStoragePolyfillError: Error | null = null;
try {
  require("expo-sqlite/localStorage/install");
} catch (e) {
  localStoragePolyfillError =
    e instanceof Error
      ? e
      : new Error("Failed to load expo-sqlite localStorage polyfill");
  console.error("[Supabase] localStorage polyfill failed:", e);
}

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as
  | string
  | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as
  | string
  | undefined;

// Export error state for _layout.tsx to check
export const supabaseInitError =
  localStoragePolyfillError ||
  (!supabaseUrl || !supabaseAnonKey
    ? new Error(
        `Supabase credentials missing. URL: ${supabaseUrl ? "SET" : "MISSING"}, Key: ${supabaseAnonKey ? "SET" : "MISSING"}`
      )
    : null);

// Create client only if credentials exist and polyfill loaded, otherwise create a dummy
export const supabase: SupabaseClient<Database> =
  supabaseUrl && supabaseAnonKey && !localStoragePolyfillError
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: globalThis.localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : (new Proxy({} as SupabaseClient<Database>, {
        get() {
          throw supabaseInitError;
        },
      }) as SupabaseClient<Database>);
