import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { supabase, getAuthRedirectUrl } from "@/lib/supabase";

type Step = "email" | "sent";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendMagicLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: sbError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (sbError) throw sbError;

      setStep("sent");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      setError(e.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === "email" ? (
            <>
              <View style={styles.titleContainer}>
                <Ionicons name="game-controller" size={48} color={colors.tint} />
                <Text style={[styles.title, { color: colors.text }]}>
                  Welcome
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Sign in with your email to get started
                </Text>
              </View>

              <View style={styles.formContainer}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  Email
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoFocus
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="go"
                  onSubmitEditing={handleSendMagicLink}
                  editable={!loading}
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Pressable
                  onPress={handleSendMagicLink}
                  disabled={loading}
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.tint,
                      opacity: loading ? 0.6 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.tintText} />
                  ) : (
                    <>
                      <Ionicons name="mail-outline" size={20} color={colors.tintText} />
                      <Text style={[styles.primaryBtnText, { color: colors.tintText }]}>
                        Send Magic Link
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.titleContainer}>
                <Ionicons name="mail-open-outline" size={56} color={colors.tint} />
                <Text style={[styles.title, { color: colors.text }]}>
                  Check your email
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  We sent a sign-in link to
                </Text>
                <Text style={[styles.emailConfirm, { color: colors.text }]}>
                  {email.trim().toLowerCase()}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: 8 }]}>
                  Click the link in the email to sign in. You can close this screen.
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setStep("email");
                  setError(null);
                }}
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text} />
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                  Use a different email
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 48,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "NunitoSans_800ExtraBold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  emailConfirm: {
    fontSize: 16,
    fontFamily: "NunitoSans_700Bold",
    textAlign: "center",
  },
  formContainer: {
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
    borderWidth: 1,
    marginBottom: 8,
  },
  errorText: {
    color: "#E53E3E",
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  primaryBtnText: {
    fontSize: 17,
    fontFamily: "NunitoSans_700Bold",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  secondaryBtnText: {
    fontSize: 17,
    fontFamily: "NunitoSans_700Bold",
  },
});
