import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSession } from "@/lib/session-context";
import { User } from "@/lib/models";
import * as coupleRepo from "@/lib/repos/coupleRepo";

type Mode = "menu" | "create" | "join";

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { session, setCurrentUser, setCouple } = useSession();

  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuickStart = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the authenticated Supabase user id for Player 1
      const myId = session.currentUser?.id ?? Crypto.randomUUID();
      const me: User = { id: myId, name: "Player 1" };
      const them: User = { id: Crypto.randomUUID(), name: "Player 2" };
      setCurrentUser(me);
      const couple = await coupleRepo.createCouple(me);
      // Immediately join as partner so status becomes 'ready'
      const ready = await coupleRepo.joinCouple(couple.inviteCode, them);
      setCouple(ready);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Use the authenticated Supabase user id
      const userId = session.currentUser?.id ?? Crypto.randomUUID();
      const user: User = { id: userId, name: name.trim() };
      setCurrentUser(user);
      const couple = await coupleRepo.createCouple(user);
      setCouple(couple);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/lobby");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    if (!code.trim() || code.trim().length < 6) {
      setError("Enter the 6-character invite code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Use the authenticated Supabase user id
      const userId = session.currentUser?.id ?? Crypto.randomUUID();
      const user: User = { id: userId, name: name.trim() };
      setCurrentUser(user);
      const couple = await coupleRepo.joinCouple(code.trim().toUpperCase(), user);
      setCouple(couple);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (couple.status === "ready") {
        router.replace("/(tabs)");
      } else {
        router.replace("/lobby");
      }
    } catch (e: any) {
      setError(e.message || "Invalid code");
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
          {/* Title */}
          <View style={styles.titleContainer}>
            <Ionicons name="game-controller" size={48} color={colors.tint} />
            <Text style={[styles.title, { color: colors.text }]}>
              Start playing together
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Create a room or join your partner's
            </Text>
          </View>

          {mode === "menu" && (
            <View style={styles.buttonGroup}>
              <Pressable
                onPress={() => { setMode("create"); setError(null); }}
                style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
              >
                <Ionicons name="add-circle-outline" size={22} color={colors.tintText} />
                <Text style={[styles.primaryBtnText, { color: colors.tintText }]}>
                  Create Room
                </Text>
              </Pressable>

              <Pressable
                onPress={() => { setMode("join"); setError(null); }}
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Ionicons name="enter-outline" size={22} color={colors.text} />
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                  Join with Code
                </Text>
              </Pressable>

              <Pressable
                onPress={handleQuickStart}
                disabled={loading}
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: "transparent", marginTop: 8, opacity: loading ? 0.5 : 0.7 }]}
              >
                <Ionicons name="flash-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary, fontSize: 14 }]}>
                  Skip for now (solo test)
                </Text>
              </Pressable>
            </View>
          )}

          {mode === "create" && (
            <View style={styles.formContainer}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Your name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleCreateRoom}
              />

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              <Pressable
                onPress={handleCreateRoom}
                disabled={loading}
                style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: loading ? 0.6 : 1 }]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.tintText }]}>
                  {loading ? "Creating…" : "Create Room"}
                </Text>
              </Pressable>

              <Pressable onPress={() => { setMode("menu"); setError(null); }} style={styles.backBtn}>
                <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
              </Pressable>
            </View>
          )}

          {mode === "join" && (
            <View style={styles.formContainer}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Your name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
              />

              <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 16 }]}>Invite code</Text>
              <TextInput
                style={[styles.input, styles.codeInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="XXXXXX"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
                autoCapitalize="characters"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleJoinRoom}
              />

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              <Pressable
                onPress={handleJoinRoom}
                disabled={loading}
                style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: loading ? 0.6 : 1 }]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.tintText }]}>
                  {loading ? "Joining…" : "Join Room"}
                </Text>
              </Pressable>

              <Pressable onPress={() => { setMode("menu"); setError(null); }} style={styles.backBtn}>
                <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
              </Pressable>
            </View>
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
  },
  buttonGroup: {
    gap: 14,
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
  codeInput: {
    fontSize: 24,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 8,
    textAlign: "center",
  },
  errorText: {
    color: "#E53E3E",
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: 8,
  },
  backBtn: {
    alignSelf: "center",
    paddingVertical: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: "NunitoSans_600SemiBold",
  },
});
