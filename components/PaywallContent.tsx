/**
 * PaywallContent — Reusable paywall UI
 *
 * Extracted so it can be used both as a route (app/paywall.tsx)
 * and inline inside other modals (e.g. ChatModal).
 */

import { useState, useEffect } from "react";
import {
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

// Legal links hosted via GitHub Pages
const TERMS_URL = "https://chez.lat/legal/terms.html";
const PRIVACY_URL = "https://chez.lat/legal/privacy.html";

const CHEF_FEATURES = [
  {
    icon: "chatbubble-ellipses-outline" as const,
    label: "500 msgs/day",
    color: "#EA580C",
  },
  {
    icon: "bookmark-outline" as const,
    label: "Unlimited saves",
    color: "#F59E0B",
  },
  { icon: "layers-outline" as const, label: "Auto-versions", color: "#22C55E" },
  {
    icon: "trending-up-outline" as const,
    label: "Analytics",
    color: "#8B5CF6",
  },
  { icon: "rocket-outline" as const, label: "Priority AI", color: "#3B82F6" },
];

interface PaywallContentProps {
  onDismiss: () => void;
}

export function PaywallContent({ onDismiss }: PaywallContentProps) {
  const insets = useSafeAreaInsets();
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
        { text: "OK", onPress: onDismiss },
      ]);
    }
  }, [isChef, onDismiss]);

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
    } catch (error: unknown) {
      console.error("[paywall] Purchase error:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Purchase Failed",
        error instanceof Error ? error.message : "Please try again."
      );
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
    } catch (error: unknown) {
      console.error("[paywall] Restore error:", error);
      Alert.alert(
        "Restore Failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setRestoring(false);
    }
  };

  const formatPeriod = (pkg: SubscriptionPackage): string => {
    switch (pkg.packageType) {
      case "annual":
        return "/year";
      case "monthly":
        return "/mo";
      case "lifetime":
        return " once";
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

  const getPackageLabel = (pkg: SubscriptionPackage): string => {
    switch (pkg.packageType) {
      case "annual":
        return "Annual";
      case "monthly":
        return "Monthly";
      default:
        return "Lifetime";
    }
  };

  // Sort packages: annual first, then monthly, then others
  const sortedPackages = [...packages].sort((a, b) => {
    const order = { annual: 0, monthly: 1, lifetime: 2 };
    return (
      (order[a.packageType as keyof typeof order] ?? 3) -
      (order[b.packageType as keyof typeof order] ?? 3)
    );
  });

  return (
    <View style={styles.container}>
      {/* Close */}
      <Pressable
        onPress={onDismiss}
        style={[styles.closeButton, { top: insets.top }]}
        hitSlop={12}
      >
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </Pressable>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoGlow}>
            <Image
              source={require("@/assets/chez-only-hat.png")}
              style={styles.heroIcon}
              resizeMode="contain"
            />
          </View>
          <Text variant="h2" style={styles.title}>
            Level up your kitchen
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.subtitle}>
            No limits. No interruptions.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {CHEF_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureCell}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: feature.color + "15" },
                ]}
              >
                <Ionicons name={feature.icon} size={18} color={feature.color} />
              </View>
              <Text style={styles.featureText}>{feature.label}</Text>
            </View>
          ))}
        </View>

        {/* Package Selection */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="body" color="textMuted" style={styles.loadingText}>
              Loading options...
            </Text>
          </View>
        ) : sortedPackages.length > 0 ? (
          <View style={styles.packages}>
            {sortedPackages.map((pkg) => {
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
                    !isSelected && styles.packageCardUnselected,
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
                        style={[
                          { fontSize: 15 },
                          isSelected && styles.packageTitleSelected,
                          !isSelected && { color: colors.textSecondary },
                        ]}
                      >
                        {getPackageLabel(pkg)}
                      </Text>
                      {savings && (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>{savings}</Text>
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
                    <Text
                      variant="h3"
                      style={[
                        { fontSize: 18 },
                        !isSelected && { color: colors.textSecondary },
                      ]}
                    >
                      {pkg.product.priceString}
                    </Text>
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
      </ScrollView>

      {/* Footer */}
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}
      >
        <Pressable
          onPress={handlePurchase}
          disabled={!selectedPackage || purchasing || restoring}
          style={[
            styles.ctaButton,
            (!selectedPackage || purchasing || restoring) &&
              styles.ctaButtonDisabled,
          ]}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.ctaContent}>
              <Ionicons name="diamond" size={18} color="#fff" />
              <Text style={styles.ctaText}>Start cooking like a Chef</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.legalLinks}>
          <Text variant="caption" color="textMuted">
            Auto-renews. Cancel anytime.{" "}
          </Text>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
            <Text variant="caption" color="textMuted" style={styles.link}>
              Terms
            </Text>
          </Pressable>
          <Text variant="caption" color="textMuted">
            {" · "}
          </Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text variant="caption" color="textMuted" style={styles.link}>
              Privacy
            </Text>
          </Pressable>
          <Text variant="caption" color="textMuted">
            {" · "}
          </Text>
          <Pressable onPress={handleRestore} disabled={purchasing || restoring}>
            <Text variant="caption" color="textMuted" style={styles.link}>
              {restoring ? "Restoring..." : "Restore"}
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
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing[4],
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing[2],
  },
  logoGlow: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    width: 150,
    height: 150,
    marginTop: -20,
  },
  title: {
    textAlign: "center",
    marginBottom: 2,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    letterSpacing: 0.3,
    marginBottom: spacing[3],
  },

  // Features
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  featureCell: {
    alignItems: "center",
    gap: 6,
    width: 100,
    paddingVertical: spacing[2],
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textAlign: "center",
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  loadingText: {
    textAlign: "center",
  },

  // Packages
  packages: {
    gap: spacing[2],
  },
  packageCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing[3],
    borderCurve: "continuous",
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#FFF7ED",
  },
  packageCardUnselected: {
    opacity: 0.6,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    gap: 2,
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
    backgroundColor: "#22C55E",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#fff",
  },
  packagePrice: {
    alignItems: "flex-end",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: spacing[8],
    gap: spacing[4],
  },

  // Footer
  footer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700" as const,
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
