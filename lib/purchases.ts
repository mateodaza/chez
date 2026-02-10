/**
 * RevenueCat Purchases Wrapper
 *
 * Handles SDK initialization, user identification, and purchase operations.
 * Syncs subscription status with Supabase user_rate_limits table.
 */

import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { supabase } from "@/lib/supabase";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// RevenueCat API Keys - set in app.config.ts extra
const REVENUECAT_IOS_API_KEY =
  Constants.expoConfig?.extra?.revenueCatIosApiKey ?? "";
const REVENUECAT_ANDROID_API_KEY =
  Constants.expoConfig?.extra?.revenueCatAndroidApiKey ?? "";

// Entitlement ID configured in RevenueCat dashboard
export const CHEF_ENTITLEMENT_ID = "chef";

// Package types for display
export type PackageType = "monthly" | "annual" | "lifetime";

export interface SubscriptionPackage {
  identifier: string;
  packageType: PackageType;
  product: {
    title: string;
    description: string;
    priceString: string;
    price: number;
    currencyCode: string;
  };
  introPrice?: {
    priceString: string;
    period: string;
    periodUnit: string;
    cycles: number;
  };
  rcPackage: PurchasesPackage;
}

let isConfigured = false;

/**
 * Initialize RevenueCat SDK
 * Should be called early in app lifecycle, after auth is ready
 */
export async function initializePurchases(): Promise<void> {
  if (isExpoGo) {
    console.warn("[purchases] Running in Expo Go, skipping RevenueCat");
    return;
  }

  if (isConfigured) {
    console.warn("[purchases] Already configured, skipping");
    return;
  }

  const apiKey =
    Platform.OS === "ios" ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;

  if (!apiKey) {
    console.warn(
      "[purchases] No API key found for platform:",
      Platform.OS,
      "- RevenueCat disabled"
    );
    return;
  }

  try {
    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configure SDK - anonymous user initially
    Purchases.configure({
      apiKey,
      appUserID: null, // Will be set when user logs in
    });

    isConfigured = true;
    console.warn("[purchases] RevenueCat initialized successfully");
  } catch (error) {
    console.error("[purchases] Failed to initialize RevenueCat:", error);
  }
}

/**
 * Identify user with RevenueCat after Supabase login
 * Links anonymous purchases to their account
 */
export async function identifyUser(
  userId: string
): Promise<CustomerInfo | null> {
  if (!isConfigured) {
    console.warn("[purchases] SDK not configured, cannot identify user");
    return null;
  }

  try {
    const { customerInfo } = await Purchases.logIn(userId);
    console.warn("[purchases] User identified:", userId);

    // Sync subscription status to Supabase
    await syncSubscriptionToSupabase(customerInfo);

    return customerInfo;
  } catch (error) {
    console.error("[purchases] Failed to identify user:", error);
    return null;
  }
}

/**
 * Log out user from RevenueCat
 * Creates new anonymous user
 */
export async function logoutUser(): Promise<void> {
  if (!isConfigured) return;

  try {
    const isAnonymous = await Purchases.isAnonymous();
    if (isAnonymous) {
      console.warn("[purchases] User already anonymous, skipping logout");
      return;
    }
    await Purchases.logOut();
    console.warn("[purchases] User logged out");
  } catch (error) {
    console.error("[purchases] Failed to logout:", error);
  }
}

/**
 * Get current customer info and subscription status
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isConfigured) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error("[purchases] Failed to get customer info:", error);
    return null;
  }
}

/**
 * Check if user has Chef entitlement
 */
export async function hasChefAccess(): Promise<boolean> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return false;

  return (
    typeof customerInfo.entitlements.active[CHEF_ENTITLEMENT_ID] !== "undefined"
  );
}

/**
 * Get available subscription packages
 */
export async function getPackages(): Promise<SubscriptionPackage[]> {
  if (!isConfigured) return [];

  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings.current?.availablePackages.length) {
      console.warn("[purchases] No offerings available");
      return [];
    }

    return offerings.current.availablePackages.map((pkg) => {
      const { product } = pkg;

      // Map package type
      let packageType: PackageType = "monthly";
      if (pkg.packageType === "ANNUAL") {
        packageType = "annual";
      } else if (pkg.packageType === "LIFETIME") {
        packageType = "lifetime";
      }

      const subscriptionPackage: SubscriptionPackage = {
        identifier: pkg.identifier,
        packageType,
        product: {
          title: product.title,
          description: product.description,
          priceString: product.priceString,
          price: product.price,
          currencyCode: product.currencyCode,
        },
        rcPackage: pkg,
      };

      // Add intro pricing if available
      if (product.introPrice) {
        subscriptionPackage.introPrice = {
          priceString: product.introPrice.priceString,
          period: product.introPrice.periodNumberOfUnits.toString(),
          periodUnit: product.introPrice.periodUnit,
          cycles: product.introPrice.cycles,
        };
      }

      return subscriptionPackage;
    });
  } catch (error) {
    console.error("[purchases] Failed to get packages:", error);
    return [];
  }
}

/**
 * Purchase a subscription package
 * Returns customer info on success, throws on error
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo; cancelled: boolean }> {
  if (!isConfigured) {
    throw new Error("RevenueCat not configured");
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    // Sync to Supabase after successful purchase
    await syncSubscriptionToSupabase(customerInfo);

    return { customerInfo, cancelled: false };
  } catch (error: unknown) {
    const rcError = error as {
      userCancelled?: boolean;
      code?: PURCHASES_ERROR_CODE;
      message?: string;
    };
    // Handle user cancellation gracefully
    if (rcError.userCancelled) {
      return {
        customerInfo: await Purchases.getCustomerInfo(),
        cancelled: true,
      };
    }

    // Handle already purchased
    if (rcError.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      console.warn("[purchases] Product already purchased, restoring...");
      const restored = await restorePurchases();
      if (restored) {
        return { customerInfo: restored, cancelled: false };
      }
    }

    throw error;
  }
}

/**
 * Restore previous purchases
 * Returns customer info on success
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isConfigured) return null;

  try {
    const customerInfo = await Purchases.restorePurchases();

    // Sync to Supabase after restore
    await syncSubscriptionToSupabase(customerInfo);

    return customerInfo;
  } catch (error) {
    console.error("[purchases] Failed to restore purchases:", error);
    return null;
  }
}

/**
 * Sync RevenueCat subscription status to Supabase
 *
 * Called after login/restore to sync the tier from RevenueCat to the database.
 * Uses an RPC function (sync_subscription_tier) that validates the tier value
 * and updates both user_rate_limits and users tables.
 *
 * The webhook remains the authoritative source for purchase events,
 * but this handles the case where a user logs in with an existing subscription.
 */
export async function syncSubscriptionToSupabase(
  customerInfo: CustomerInfo
): Promise<void> {
  const hasChef =
    typeof customerInfo.entitlements.active[CHEF_ENTITLEMENT_ID] !==
    "undefined";
  const tier = hasChef ? "chef" : "free";

  console.warn("[purchases] Syncing tier to Supabase:", tier);

  try {
    const { error } = await supabase.rpc("sync_subscription_tier", {
      p_tier: tier,
    });

    if (error) {
      console.error("[purchases] Failed to sync tier:", error);
    } else {
      console.warn("[purchases] Tier synced successfully:", tier);
    }
  } catch (err) {
    console.error("[purchases] Error syncing tier:", err);
  }
}

/**
 * Add listener for customer info updates
 * Useful for real-time subscription status changes
 */
export function addCustomerInfoUpdateListener(
  callback: (info: CustomerInfo) => void
): () => void {
  if (!isConfigured) {
    return () => {};
  }

  // Add the listener
  Purchases.addCustomerInfoUpdateListener(callback);

  // Return cleanup function that removes the callback
  return () => {
    Purchases.removeCustomerInfoUpdateListener(callback);
  };
}

/**
 * Check if RevenueCat is configured and ready
 */
export function isReady(): boolean {
  return isConfigured;
}
