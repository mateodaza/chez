import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

type AuthStep = "email" | "otp";

export default function LoginScreen() {
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

    // Basic email validation
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

    // Move to OTP verification step
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

    // Success - navigation handled by auth state change in _layout
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
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: "center",
        }}
      >
        {/* Header */}
        <View style={{ marginBottom: 48, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "700",
              color: "#f97316",
              marginBottom: 8,
            }}
          >
            Chez
          </Text>
          <Text style={{ fontSize: 16, color: "#6b7280", textAlign: "center" }}>
            {step === "email"
              ? "Sign in with your email to get started"
              : "Enter the code we sent to your email"}
          </Text>
        </View>

        {step === "email" ? (
          /* Email Step */
          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}
              >
                Email address
              </Text>
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                editable={!isLoading}
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 16,
                  borderWidth: error ? 1 : 0,
                  borderColor: "#ef4444",
                }}
              />
            </View>

            {error && (
              <Text style={{ color: "#ef4444", fontSize: 14 }}>{error}</Text>
            )}

            <Pressable
              onPress={handleSendMagicLink}
              disabled={isLoading}
              style={{
                backgroundColor: "#f97316",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading && <ActivityIndicator color="white" />}
              <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                {isLoading ? "Sending..." : "Continue with Email"}
              </Text>
            </Pressable>
          </View>
        ) : (
          /* OTP Step */
          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}
              >
                Verification code
              </Text>
              <TextInput
                value={otp}
                onChangeText={(text) => {
                  // Only allow digits, max 8
                  const cleaned = text.replace(/\D/g, "").slice(0, 8);
                  setOtp(cleaned);
                  setError(null);
                }}
                placeholder="12345678"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={8}
                editable={!isLoading}
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 24,
                  fontWeight: "600",
                  textAlign: "center",
                  letterSpacing: 8,
                  borderWidth: error ? 1 : 0,
                  borderColor: "#ef4444",
                }}
              />
              <Text
                style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}
              >
                Sent to {email}
              </Text>
            </View>

            {error && (
              <Text
                style={{ color: "#ef4444", fontSize: 14, textAlign: "center" }}
              >
                {error}
              </Text>
            )}

            <Pressable
              onPress={handleVerifyOtp}
              disabled={isLoading || otp.length < 6}
              style={{
                backgroundColor: otp.length >= 6 ? "#f97316" : "#d1d5db",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading && <ActivityIndicator color="white" />}
              <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                {isLoading ? "Verifying..." : "Verify & Sign In"}
              </Text>
            </Pressable>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <Pressable
                onPress={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                disabled={isLoading}
              >
                <Text style={{ color: "#6b7280", fontSize: 14 }}>
                  Change email
                </Text>
              </Pressable>
              <Text style={{ color: "#d1d5db" }}>|</Text>
              <Pressable onPress={handleResendCode} disabled={isLoading}>
                <Text
                  style={{ color: "#f97316", fontSize: 14, fontWeight: "500" }}
                >
                  Resend code
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={{ marginTop: 48, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
