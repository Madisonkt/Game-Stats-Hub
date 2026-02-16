import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useSession } from "@/lib/session-context";
import { getPlayerRole } from "@/lib/models";
import * as coupleRepo from "@/lib/repos/coupleRepo";

export default function LobbyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, clearSession } = useSession();

  const handleBack = () => {
    clearSession();
    router.replace("/onboarding");
  };

  const couple = session.couple;

  // Subscribe to couple changes — auto-navigate when partner joins
  useEffect(() => {
    if (!couple) return;
    if (couple.status === "ready" && couple.members.length === 2) {
      router.replace("/(tabs)");
      return;
    }

    const unsub = coupleRepo.subscribeToCouple((updated) => {
      if (updated && updated.status === "ready" && updated.members.length === 2) {
        router.replace("/(tabs)");
      }
    });
    return unsub;
  }, [couple?.id]);

  const handleCopyCode = async () => {
    if (!couple) return;
    await Clipboard.setStringAsync(couple.inviteCode);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  if (!couple) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>No room found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Ionicons name="people-outline" size={56} color={colors.tint} />

        <Text style={[styles.title, { color: colors.text }]}>
          Waiting for partner…
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Share this code with your partner to join
        </Text>

        <Pressable onPress={handleCopyCode} style={[styles.codeContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.codeText, { color: colors.text }]}>
            {couple.inviteCode}
          </Text>
          <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
        </Pressable>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Tap to copy
        </Text>

        {/* Members */}
        <View style={styles.membersContainer}>
          <Text style={[styles.membersTitle, { color: colors.textSecondary }]}>
            In this room
          </Text>
          {couple.members.map((member) => {
            const role = getPlayerRole(couple, member.id);
            return (
            <View key={member.id} style={[styles.memberRow, { backgroundColor: colors.surface }]}>
              <View style={[styles.memberAvatar, { backgroundColor: colors.tint }]}>
                <Text style={styles.memberInitial}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: colors.text, flex: 0 }]}>
                  {member.name}
                </Text>
                {role && (
                  <Text style={[styles.roleBadge, { color: colors.textSecondary }]}>
                    Player {role}
                  </Text>
                )}
              </View>
              {member.id === session.currentUser?.id && (
                <Text style={[styles.youBadge, { color: colors.textSecondary }]}>You</Text>
              )}
            </View>
            );
          })}

          {couple.members.length < 2 && (
            <View style={[styles.memberRow, styles.emptySlot, { borderColor: colors.border }]}>
              <Ionicons name="hourglass-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.memberName, { color: colors.textSecondary }]}>
                Waiting…
              </Text>
            </View>
          )}
        </View>

        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
          <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: "NunitoSans_800ExtraBold",
    textAlign: "center",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 16,
  },
  codeText: {
    fontSize: 36,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 8,
  },
  hint: {
    fontSize: 13,
    fontFamily: "NunitoSans_400Regular",
  },
  membersContainer: {
    width: "100%",
    marginTop: 32,
    gap: 10,
  },
  membersTitle: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  emptySlot: {
    borderWidth: 1,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  memberInitial: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "NunitoSans_700Bold",
  },
  memberName: {
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
    flex: 1,
  },
  youBadge: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
  },
  roleBadge: {
    fontSize: 11,
    fontFamily: "NunitoSans_400Regular",
    marginTop: 2,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: "NunitoSans_600SemiBold",
  },
});
