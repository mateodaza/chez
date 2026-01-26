import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Text, Button, Input, Card } from "@/components/ui";
import { colors, spacing, layout } from "@/constants/theme";

type AuthStep = "email" | "otp";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setStep("otp");
    Alert.alert(
      "Check your email",
      `We sent a code to ${email}. Enter it below to sign in.`
    );
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length < 6) {
      setError("Please enter the code from your email");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    setIsLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.replace("/(tabs)");
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError(null);

    const { error: resendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    setIsLoading(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    Alert.alert("Code resent", `A new code was sent to ${email}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing[8] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="restaurant" size={32} color={colors.primary} />
          </View>
          <Text variant="display" color="primary">
            CHEZ
          </Text>
          <Text
            variant="bodyLarge"
            color="textSecondary"
            style={styles.subtitle}
          >
            {step === "email"
              ? "Your AI cooking assistant"
              : "Enter verification code"}
          </Text>
        </View>

        {step === "email" ? (
          /* Email Step */
          <View style={styles.form}>
            <Input
              label="Email address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
              error={error || undefined}
            />

            <Button
              onPress={handleSendMagicLink}
              disabled={isLoading}
              loading={isLoading}
              fullWidth
            >
              Continue with Email
            </Button>

            {/* Features Preview */}
            <Card variant="outlined" style={styles.featuresCard}>
              <View style={styles.featureItem}>
                <Ionicons
                  name="videocam-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text variant="bodySmall" color="textSecondary">
                  Import recipes from TikTok, YouTube, Instagram
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="mic-outline" size={18} color={colors.primary} />
                <Text variant="bodySmall" color="textSecondary">
                  Voice-guided cooking instructions
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons
                  name="cart-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text variant="bodySmall" color="textSecondary">
                  Smart grocery list generation
                </Text>
              </View>
            </Card>
          </View>
        ) : (
          /* OTP Step */
          <View style={styles.form}>
            <View style={styles.otpHeader}>
              <View style={styles.emailBadge}>
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text variant="bodySmall" color="primary">
                  {email}
                </Text>
              </View>
            </View>

            <Input
              label="Verification code"
              value={otp}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, "").slice(0, 8);
                setOtp(cleaned);
                setError(null);
              }}
              placeholder="12345678"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={8}
              editable={!isLoading}
              error={error || undefined}
              style={styles.otpInput}
            />

            <Button
              onPress={handleVerifyOtp}
              disabled={isLoading || otp.length < 6}
              loading={isLoading}
              fullWidth
            >
              Verify & Sign In
            </Button>

            <View style={styles.actions}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                disabled={isLoading}
              >
                Change email
              </Button>
              <View style={styles.divider} />
              <Button
                variant="ghost"
                size="sm"
                onPress={handleResendCode}
                disabled={isLoading}
              >
                Resend code
              </Button>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="caption" color="textMuted" style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: layout.screenPaddingHorizontal,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing[10],
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  subtitle: {
    textAlign: "center",
    marginTop: spacing[2],
  },
  form: {
    gap: spacing[4],
  },
  otpHeader: {
    alignItems: "center",
  },
  emailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginHorizontal: spacing[2],
  },
  featuresCard: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  footer: {
    marginTop: spacing[10],
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
  },
});
