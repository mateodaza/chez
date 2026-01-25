// Must import before createClient to polyfill globalThis.localStorage
import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import type { Database } from "@/types/database";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as
  | string
  | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as
  | string
  | undefined;

// Fail fast if Supabase credentials are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL or Anon Key not found. " +
      "Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env " +
      "and app.config.ts is configured correctly."
  );
}

// Use localStorage polyfill from expo-sqlite (handles large tokens properly)
// globalThis.localStorage is set by the expo-sqlite/localStorage/install import
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
