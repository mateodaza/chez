/**
 * useSubscription Hook
 *
 * Provides subscription state and actions for the app.
 * Integrates with RevenueCat for purchase management.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { CustomerInfo } from "react-native-purchases";
import {
  getCustomerInfo,
  addCustomerInfoUpdateListener,
  CHEF_ENTITLEMENT_ID,
  isReady,
} from "@/lib/purchases";

export type SubscriptionTier = "free" | "chef";

export interface SubscriptionState {
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Whether user has Chef (premium) access */
  isChef: boolean;
  /** Expiration date of current subscription (null if free or lifetime) */
  expirationDate: string | null;
  /** Whether subscription will auto-renew */
  willRenew: boolean;
  /** Product identifier of active subscription */
  productId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

export interface UseSubscriptionReturn extends SubscriptionState {
  /** Refresh subscription status from RevenueCat */
  refresh: () => Promise<void>;
}

/**
 * Hook to access and manage subscription state
 */
export function useSubscription(): UseSubscriptionReturn {
  const [state, setState] = useState<SubscriptionState>({
    tier: "free",
    isChef: false,
    expirationDate: null,
    willRenew: false,
    productId: null,
    isLoading: true,
    error: null,
  });

  // Update state from CustomerInfo
  const updateFromCustomerInfo = useCallback((info: CustomerInfo | null) => {
    if (!info) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
      return;
    }

    const chefEntitlement = info.entitlements.active[CHEF_ENTITLEMENT_ID];
    const hasChef = typeof chefEntitlement !== "undefined";

    setState({
      tier: hasChef ? "chef" : "free",
      isChef: hasChef,
      expirationDate: chefEntitlement?.expirationDate ?? null,
      willRenew: chefEntitlement?.willRenew ?? false,
      productId: chefEntitlement?.productIdentifier ?? null,
      isLoading: false,
      error: null,
    });
  }, []);

  // Fetch initial subscription status
  const refresh = useCallback(async () => {
    if (!isReady()) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const info = await getCustomerInfo();
      updateFromCustomerInfo(info);
    } catch (error: unknown) {
      console.error("[useSubscription] Error fetching customer info:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load subscription status",
      }));
    }
  }, [updateFromCustomerInfo]);

  // Track cleanup functions
  const removeListenerRef = useRef<(() => void) | null>(null);

  // Initialize and listen for updates
  useEffect(() => {
    let retryInterval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    // Attach listener when SDK is ready
    const attachListener = () => {
      if (removeListenerRef.current) return; // Already attached

      removeListenerRef.current = addCustomerInfoUpdateListener((info) => {
        // Customer info updated via listener
        updateFromCustomerInfo(info);
      });
    };

    // Initial fetch - retry if SDK not ready yet
    const attemptFetch = () => {
      if (isReady()) {
        refresh();
        attachListener(); // Attach listener once SDK is ready
        return true;
      }
      return false;
    };

    // Try immediately
    if (!attemptFetch()) {
      // SDK not ready - retry a few times with delay
      let attempts = 0;
      const maxAttempts = 5;
      retryInterval = setInterval(() => {
        if (!isMounted) {
          if (retryInterval) clearInterval(retryInterval);
          return;
        }
        attempts++;
        if (attemptFetch() || attempts >= maxAttempts) {
          if (retryInterval) clearInterval(retryInterval);
          if (attempts >= maxAttempts) {
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        }
      }, 500);
    }

    return () => {
      isMounted = false;
      if (retryInterval) clearInterval(retryInterval);
      if (removeListenerRef.current) {
        removeListenerRef.current();
        removeListenerRef.current = null;
      }
    };
  }, [refresh, updateFromCustomerInfo]);

  return {
    ...state,
    refresh,
  };
}

/**
 * Simple hook to check if user has Chef access
 * Lighter weight than full useSubscription
 */
export function useIsChef(): { isChef: boolean; isLoading: boolean } {
  const { isChef, isLoading } = useSubscription();
  return { isChef, isLoading };
}
