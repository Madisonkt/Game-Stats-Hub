import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  useColorScheme,
  Platform,
  Animated as RNAnimated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useStorage } from "@/lib/storage-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  animY: RNAnimated.Value;
  animX: RNAnimated.Value;
  animOpacity: RNAnimated.Value;
  size: number;
  rotation: RNAnimated.Value;
}

function ConfettiEffect({ visible, color }: { visible: boolean; color: string }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!visible) return;
    const confettiColors = [color, "#FFD93D", "#51CF66", "#748FFC", "#FF922B", "#CC5DE8"];
    const newPieces: ConfettiPiece[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      animY: new RNAnimated.Value(-50),
      animX: new RNAnimated.Value(0),
      animOpacity: new RNAnimated.Value(1),
      size: 6 + Math.random() * 6,
      rotation: new RNAnimated.Value(0),
    }));
    setPieces(newPieces);

    newPieces.forEach((piece) => {
      const duration = 1200 + Math.random() * 800;
      RNAnimated.parallel([
        RNAnimated.timing(piece.animY, {
          toValue: 600 + Math.random() * 200,
          duration,
          useNativeDriver: true,
        }),
        RNAnimated.timing(piece.animX, {
          toValue: (Math.random() - 0.5) * 120,
          duration,
          useNativeDriver: true,
        }),
        RNAnimated.timing(piece.animOpacity, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        RNAnimated.timing(piece.rotation, {
          toValue: Math.random() * 720,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    });

    const timer = setTimeout(() => setPieces([]), 2500);
    return () => clearTimeout(timer);
  }, [visible]);

  if (pieces.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece) => (
        <RNAnimated.View
          key={piece.id}
          style={{
            position: "absolute",
            left: piece.x,
            top: 0,
            width: piece.size,
            height: piece.size * 1.4,
            borderRadius: 2,
            backgroundColor: piece.color,
            opacity: piece.animOpacity,
            transform: [
              { translateY: piece.animY },
              { translateX: piece.animX },
              {
                rotate: piece.rotation.interpolate({
                  inputRange: [0, 720],
                  outputRange: ["0deg", "720deg"],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

function AvatarButton({
  name,
  initial,
  color,
  score,
  isLeading,
  onPress,
}: {
  name: string;
  initial: string;
  color: string;
  score: number;
  isLeading: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.88, { damping: 8, stiffness: 400 }),
      withSpring(1.05, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    glow.value = withSequence(
      withTiming(0.6, { duration: 100 }),
      withTiming(0, { duration: 400 })
    );
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.avatarContainer}>
      <Animated.View style={[styles.avatarWrapper, animatedStyle]}>
        <Animated.View
          style={[
            styles.avatarGlow,
            { backgroundColor: color, shadowColor: color },
            glowStyle,
          ]}
        />
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        {isLeading && (
          <View style={[styles.crownBadge, { backgroundColor: "#FFD93D" }]}>
            <Ionicons name="trophy" size={12} color="#8B6914" />
          </View>
        )}
      </Animated.View>
      <Text style={[styles.avatarName, { color }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.avatarScore, { color }]}>{score}</Text>
    </Pressable>
  );
}

function UndoToast({
  visible,
  playerName,
  onUndo,
  color,
}: {
  visible: boolean;
  playerName: string;
  onUndo: () => void;
  color: string;
}) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(100, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.undoToast, animStyle]}>
      <View style={[styles.undoToastInner, { backgroundColor: color }]}>
        <Text style={styles.undoToastText}>+1 for {playerName}</Text>
        <Pressable onPress={onUndo} style={styles.undoButton}>
          <Text style={styles.undoButtonText}>Undo</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function LogScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const {
    data,
    setActiveGame,
    logWin,
    undoLastWin,
    getScoreForGame,
    lastEvent,
    lastEventTime,
  } = useStorage();

  const [showUndo, setShowUndo] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [lastWinnerColor, setLastWinnerColor] = useState(colors.playerA);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeGames = data.games.filter((g) => !g.isArchived);
  const activeGame = data.games.find((g) => g.id === data.activeGameId);
  const score = data.activeGameId
    ? getScoreForGame(data.activeGameId)
    : { a: 0, b: 0 };

  const prevLeaderRef = useRef<string | null>(null);

  const handleWin = useCallback(
    (playerId: string) => {
      if (!data.activeGameId) return;

      const oldScore = getScoreForGame(data.activeGameId);
      const oldLeader =
        oldScore.a > oldScore.b
          ? "player_a"
          : oldScore.b > oldScore.a
            ? "player_b"
            : null;

      const event = logWin(playerId);
      if (!event) return;

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const winnerColor =
        playerId === "player_a" ? colors.playerA : colors.playerB;
      setLastWinnerColor(winnerColor);

      const newA = oldScore.a + (playerId === "player_a" ? 1 : 0);
      const newB = oldScore.b + (playerId === "player_b" ? 1 : 0);
      const newLeader =
        newA > newB ? "player_a" : newB > newA ? "player_b" : null;

      if (newLeader && newLeader !== oldLeader && (newA + newB) > 1) {
        setConfettiKey((k) => k + 1);
        setShowConfetti(true);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setTimeout(() => setShowConfetti(false), 100);
      }

      setShowUndo(true);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setShowUndo(false), 10000);
    },
    [data.activeGameId, logWin, getScoreForGame, colors]
  );

  const handleUndo = useCallback(() => {
    undoLastWin();
    setShowUndo(false);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [undoLastWin]);

  const lastWinnerName = lastEvent
    ? data.players.find((p) => p.id === lastEvent.winnerPlayerId)?.name || ""
    : "";

  const diff = Math.abs(score.a - score.b);
  const leader =
    score.a > score.b
      ? data.players[0].name
      : score.b > score.a
        ? data.players[1].name
        : null;
  const statusText =
    score.a === 0 && score.b === 0
      ? "No wins yet"
      : leader
        ? `${leader} leads by ${diff}`
        : "Tied!";

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: Platform.OS === "web" ? webTopInset : insets.top }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {activeGame ? activeGame.name : "Select a Game"}
          </Text>
        </View>

        {activeGames.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {activeGames.map((game) => {
              const isActive = game.id === data.activeGameId;
              return (
                <Pressable
                  key={game.id}
                  onPress={() => setActiveGame(game.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? colors.tint : colors.surface,
                      borderColor: isActive ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={game.icon as any}
                    size={14}
                    color={isActive ? "#fff" : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? "#fff" : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {game.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={styles.center}>
        {activeGames.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="game-controller-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No games yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Head to the Games tab to create your first game
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.scoreBoard}>
              <Text style={[styles.scoreText, { color: colors.playerA }]}>
                {score.a}
              </Text>
              <View style={styles.scoreDivider}>
                <Text style={[styles.vsText, { color: colors.textSecondary }]}>
                  vs
                </Text>
              </View>
              <Text style={[styles.scoreText, { color: colors.playerB }]}>
                {score.b}
              </Text>
            </View>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {statusText}
            </Text>

            <View style={styles.avatarRow}>
              <AvatarButton
                name={data.players[0].name}
                initial={data.players[0].initial}
                color={colors.playerA}
                score={score.a}
                isLeading={score.a > score.b}
                onPress={() => handleWin("player_a")}
              />
              <AvatarButton
                name={data.players[1].name}
                initial={data.players[1].initial}
                color={colors.playerB}
                score={score.b}
                isLeading={score.b > score.a}
                onPress={() => handleWin("player_b")}
              />
            </View>

            <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
              Tap to log a win
            </Text>
          </>
        )}
      </View>

      <ConfettiEffect
        key={confettiKey}
        visible={showConfetti}
        color={lastWinnerColor}
      />

      <UndoToast
        visible={showUndo}
        playerName={lastWinnerName}
        onUndo={handleUndo}
        color={lastWinnerColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    maxWidth: 100,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  scoreBoard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 56,
    fontFamily: "Nunito_800ExtraBold",
    minWidth: 70,
    textAlign: "center",
  },
  scoreDivider: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 18,
    fontFamily: "Nunito_600SemiBold",
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 32,
  },
  avatarRow: {
    flexDirection: "row",
    gap: 40,
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: "center",
    gap: 8,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarGlow: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 999,
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 40,
    fontFamily: "Nunito_800ExtraBold",
    color: "#fff",
  },
  crownBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarName: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    maxWidth: 120,
  },
  avatarScore: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    opacity: 0.7,
  },
  tapHint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  undoToast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  undoToastInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  undoToastText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  undoButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
  },
  undoButtonText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
});
