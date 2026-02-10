/**
 * Paywall Screen (route wrapper)
 *
 * Thin wrapper around PaywallContent for the Expo Router route.
 */

import { useRouter } from "expo-router";
import { PaywallContent } from "@/components/PaywallContent";

export default function PaywallScreen() {
  const router = useRouter();
  return <PaywallContent onDismiss={() => router.back()} />;
}
