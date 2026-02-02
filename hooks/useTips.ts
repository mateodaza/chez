/**
 * useTips - Hook for fetching tips from database with local fallback
 *
 * Fetches tips from the Supabase database for loading screens.
 * Falls back to hardcoded tips if database is unavailable or empty.
 * Caches tips in memory for the session.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getRandomTips, type Tip } from "@/constants/tips";

// In-memory cache for tips (persists for app session)
let cachedTips: Tip[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface UseTipsOptions {
  count?: number;
  mode?: "cooking" | "mixology" | "pastry";
}

interface UseTipsResult {
  tips: Tip[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useTips(options: UseTipsOptions = {}): UseTipsResult {
  const { count = 5, mode } = options;
  const [tips, setTips] = useState<Tip[]>(() => getRandomTips(count, mode));
  const [loading, setLoading] = useState(false);

  const fetchTips = useCallback(async () => {
    // Use cache if fresh
    const now = Date.now();
    if (cachedTips && now - lastFetchTime < CACHE_DURATION) {
      const filtered = filterTips(cachedTips, mode, count);
      setTips(filtered);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tips")
        .select("id, category, icon, title, content, mode")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching tips:", error);
        // Fall back to hardcoded tips
        setTips(getRandomTips(count, mode));
        return;
      }

      if (!data || data.length === 0) {
        // No tips in database, use hardcoded
        setTips(getRandomTips(count, mode));
        return;
      }

      // Transform database tips to match Tip interface
      const dbTips: Tip[] = data.map((row) => ({
        id: row.id,
        category: row.category as Tip["category"],
        icon: row.icon,
        title: row.title,
        content: row.content,
        mode: row.mode as Tip["mode"],
      }));

      // Update cache
      cachedTips = dbTips;
      lastFetchTime = now;

      // Filter and shuffle for display
      const filtered = filterTips(dbTips, mode, count);
      setTips(filtered);
    } catch (err) {
      console.error("Failed to fetch tips:", err);
      setTips(getRandomTips(count, mode));
    } finally {
      setLoading(false);
    }
  }, [count, mode]);

  // Fetch on mount
  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const refresh = useCallback(async () => {
    // Force refresh by clearing cache
    cachedTips = null;
    lastFetchTime = 0;
    await fetchTips();
  }, [fetchTips]);

  return { tips, loading, refresh };
}

/**
 * Filter tips by mode and shuffle to get requested count
 */
function filterTips(
  allTips: Tip[],
  mode: "cooking" | "mixology" | "pastry" | undefined,
  count: number
): Tip[] {
  // Filter by mode if specified (keep general tips + mode-specific)
  let filtered = [...allTips];
  if (mode) {
    filtered = filtered.filter((tip) => !tip.mode || tip.mode === mode);
  }

  // Shuffle
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  return filtered.slice(0, count);
}

/**
 * Preload tips into cache (call on app start)
 */
export async function preloadTips(): Promise<void> {
  if (cachedTips && Date.now() - lastFetchTime < CACHE_DURATION) {
    return; // Already cached
  }

  try {
    const { data, error } = await supabase
      .from("tips")
      .select("id, category, icon, title, content, mode")
      .eq("is_active", true);

    if (!error && data && data.length > 0) {
      cachedTips = data.map((row) => ({
        id: row.id,
        category: row.category as Tip["category"],
        icon: row.icon,
        title: row.title,
        content: row.content,
        mode: row.mode as Tip["mode"],
      }));
      lastFetchTime = Date.now();
    }
  } catch (err) {
    console.error("Failed to preload tips:", err);
  }
}
