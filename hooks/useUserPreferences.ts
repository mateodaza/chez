import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserPreferences,
  upsertUserPreferences,
  type UserPreferences,
} from "@/lib/supabase/queries";
import { useAuth } from "@/lib/auth";
import type { Json } from "@/types/database";

export type CookingMode = "casual" | "chef";

interface UpdatePreferencesParams {
  cooking_mode?: CookingMode;
  cooking_skill_level?: string;
  dietary_restrictions?: Json;
  preferred_units?: string;
  voice_enabled?: boolean;
  tts_speed?: number;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: () => fetchUserPreferences(userId!),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: (updates: UpdatePreferencesParams) => {
      if (!userId) throw new Error("Not authenticated");
      return upsertUserPreferences(userId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences", userId] });
    },
  });

  return {
    preferences: query.data as UserPreferences | null | undefined,
    cookingMode: ((query.data?.cooking_mode as CookingMode) ??
      "casual") as CookingMode,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updatePreferences: mutation.mutate,
    updatePreferencesAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

/**
 * Simple hook to get just the cooking mode
 * Use this when you only need to check the mode for conditional rendering
 */
export function useCookingMode(): CookingMode {
  const { cookingMode } = useUserPreferences();
  return cookingMode;
}

/**
 * Hook to get cooking mode with loading state
 * Use this when you need to defer rendering until prefs are loaded
 */
export function useCookingModeWithLoading(): {
  cookingMode: CookingMode;
  isLoading: boolean;
} {
  const { cookingMode, isLoading } = useUserPreferences();
  return { cookingMode, isLoading };
}
