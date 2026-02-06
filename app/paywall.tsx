/**
 * Paywall Screen
 *
 * Displays subscription options and handles purchases.
 * Uses RevenueCat for IAP management.
 */

import { useState, useEffect } from "react";
import {
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Text, Button } from "@/components/ui";
import { colors, spacing, borderRadius, layout } from "@/constants/theme";
import {
  getPackages,
  purchasePackage,
  restorePurchases,
  type SubscriptionPackage,
} from "@/lib/purchases";
import { useSubscription } from "@/hooks/useSubscription";
import { Analytics } from "@/lib/analytics";

// Legal links - update these with your actual URLs
const TERMS_URL = "https://chez.app/terms";
const PRIVACY_URL = "https://chez.app/privacy";

const CHEF_FEATURES = [
  { icon: "chatbubbles", label: "500 AI messages/day" },
  { icon: "book", label: "Unlimited recipe imports" },
  { icon: "sparkles", label: "My Version auto-saves" },
  { icon: "analytics", label: "Learning analytics" },
  { icon: "flash", label: "Priority AI responses" },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isChef, refresh } = useSubscription();

  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedPackage, setSelectedPackage] =
    useState<SubscriptionPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Load packages on mount
  useEffect(() => {
    loadPackages();
    Analytics.trackEvent("paywall_shown");
  }, []);

  // If user becomes Chef, close paywall
  useEffect(() => {
    if (isChef) {
      Alert.alert("You're a Chef now!", "Enjoy your premium features.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [isChef, router]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const availablePackages = await getPackages();
      setPackages(availablePackages);

      // Pre-select annual as best value
      const annual = availablePackages.find((p) => p.packageType === "annual");
      setSelectedPackage(annual || availablePackages[0] || null);
    } catch (error) {
      console.error("[paywall] Failed to load packages:", error);
      Alert.alert(
        "Error",
        "Failed to load subscription options. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setPurchasing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { cancelled } = await purchasePackage(selectedPackage.rcPackage);

      if (!cancelled) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        Analytics.trackEvent("subscription_started", {
          package: selectedPackage.identifier,
          price: selectedPackage.product.price,
        });
        await refresh();
        // Alert handled by isChef effect
      }
    } catch (error: any) {
      console.error("[paywall] Purchase error:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Purchase Failed", error.message || "Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const customerInfo = await restorePurchases();
      await refresh();

      if (customerInfo?.entitlements.active["chef"]) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        Analytics.trackEvent("subscription_restored");
        // Alert handled by isChef effect
      } else {
        Alert.alert(
          "No Subscription Found",
          "No active subscription to restore."
        );
      }
    } catch (error: any) {
      console.error("[paywall] Restore error:", error);
      Alert.alert("Restore Failed", error.message || "Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const formatPeriod = (pkg: SubscriptionPackage): string => {
    switch (pkg.packageType) {
      case "annual":
        return "/year";
      case "monthly":
        return "/month";
      case "lifetime":
        return " one-time";
      default:
        return "";
    }
  };

  const getSavingsText = (pkg: SubscriptionPackage): string | null => {
    if (pkg.packageType !== "annual" || packages.length < 2) return null;

    const monthly = packages.find((p) => p.packageType === "monthly");
    if (!monthly) return null;

    const annualMonthly = pkg.product.price / 12;
    const savings = Math.round(
      (1 - annualMonthly / monthly.product.price) * 100
    );

    return savings > 0 ? `Save ${savings}%` : null;
  };

  return (
    <View style={styles.container}>
      {/* Close */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.closeButton, { top: spacing[3] }]}
        hitSlop={12}
      >
        <Ionicons name="close" size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.body}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text variant="h2" style={styles.title}>
            Upgrade to Chef
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.subtitle}>
            Unlimited recipes and AI assistance
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {CHEF_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons
                name={feature.icon as any}
                size={16}
                color={colors.primary}
              />
              <Text variant="bodySmall">{feature.label}</Text>
            </View>
          ))}
        </View>

        {/* Package Selection */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="body" color="textMuted" style={styles.loadingText}>
              Loading subscription options...
            </Text>
          </View>
        ) : packages.length > 0 ? (
          <View style={styles.packages}>
            {packages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const savings = getSavingsText(pkg);

              return (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => {
                    setSelectedPackage(pkg);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.packageCard,
                    isSelected && styles.packageCardSelected,
                  ]}
                >
                  {/* Radio indicator */}
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>

                  {/* Package info */}
                  <View style={styles.packageInfo}>
                    <View style={styles.packageHeader}>
                      <Text
                        variant="label"
                        style={
                          isSelected ? styles.packageTitleSelected : undefined
                        }
                      >
                        {pkg.packageType === "annual"
                          ? "Annual"
                          : pkg.packageType === "monthly"
                            ? "Monthly"
                            : "Lifetime"}
                      </Text>
                      {savings && (
                        <View style={styles.savingsBadge}>
                          <Text variant="caption" color="textOnPrimary">
                            {savings}
                          </Text>
                        </View>
                      )}
                    </View>
                    {pkg.introPrice && (
                      <Text variant="caption" color="success">
                        {pkg.introPrice.cycles > 0
                          ? `${pkg.introPrice.priceString} for ${pkg.introPrice.period} ${pkg.introPrice.periodUnit}`
                          : "Free trial"}
                      </Text>
                    )}
                  </View>

                  {/* Price */}
                  <View style={styles.packagePrice}>
                    <Text variant="h3">{pkg.product.priceString}</Text>
                    <Text variant="caption" color="textMuted">
                      {formatPeriod(pkg)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Text variant="body" color="textMuted">
              No subscription options available.
            </Text>
            <Button variant="secondary" onPress={loadPackages} size="sm">
              Retry
            </Button>
          </View>
        )}
      </View>

      {/* Footer */}
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}
      >
        <Button
          onPress={handlePurchase}
          disabled={!selectedPackage || purchasing || restoring}
          style={styles.purchaseButton}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : selectedPackage ? (
            `Continue with ${selectedPackage.packageType === "annual" ? "Annual" : selectedPackage.packageType === "monthly" ? "Monthly" : "Lifetime"}`
          ) : (
            "Continue with Annual"
          )}
        </Button>

        <View style={styles.legalLinks}>
          <Text variant="caption" color="textMuted">
            By subscribing, you agree to our{" "}
          </Text>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
            <Text variant="caption" color="primary" style={styles.link}>
              Terms of Service
            </Text>
          </Pressable>
          <Text variant="caption" color="textMuted">
            {" "}
            and{" "}
          </Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text variant="caption" color="primary" style={styles.link}>
              Privacy Policy
            </Text>
          </Pressable>
          <Text variant="caption" color="textMuted">
            . Auto-renews unless cancelled.{" "}
          </Text>
          <Pressable onPress={handleRestore} disabled={purchasing || restoring}>
            <Text variant="caption" color="textMuted" style={styles.link}>
              {restoring ? "Restoring..." : "Restore Purchases"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    position: "absolute",
    right: spacing[3],
    zIndex: 1,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing[6],
  },
  title: {
    textAlign: "center",
    marginBottom: spacing[2],
  },
  subtitle: {
    textAlign: "center",
  },
  features: {
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  loadingText: {
    textAlign: "center",
  },
  packages: {
    gap: spacing[2],
  },
  packageCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing[3],
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#FFF7ED",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  packageInfo: {
    flex: 1,
    gap: spacing[1],
  },
  packageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  packageTitleSelected: {
    color: colors.primary,
  },
  savingsBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  packagePrice: {
    alignItems: "flex-end",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: spacing[8],
    gap: spacing[4],
  },
  footer: {
    padding: layout.screenPaddingHorizontal,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[2],
  },
  purchaseButton: {
    width: "100%",
  },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  link: {
    textDecorationLine: "underline",
  },
});
