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
  Modal,
  Image as RNImage,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useStorage } from "@/lib/storage-context";
import { useSession } from "@/lib/session-context";
import { generateScramble } from "@/lib/scramble";
import { ScramblePreview } from "@/components/ScramblePreview";
import Svg, { Path } from "react-native-svg";
import { Round as SharedRound, Solve } from "@/lib/models";
import * as rubiksRepo from "@/lib/repos/rubiksRepo";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  avatarUri,
  onPress,
}: {
  name: string;
  initial: string;
  color: string;
  score: number;
  isLeading: boolean;
  avatarUri?: string;
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
        <View style={[styles.avatarRing, { borderColor: color }]}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
          </View>
        </View>
      </Animated.View>
      <Text style={[styles.avatarName, { color }]} numberOfLines={1}>
        {name}
      </Text>
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
    saveRound,
    undoLastRound,
    getHeadToHead,
    saveRoundInProgress,
    lastEvent,
    lastEventTime,
  } = useStorage();

  const [showUndo, setShowUndo] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [lastWinnerColor, setLastWinnerColor] = useState(colors.playerA);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoType, setUndoType] = useState<"simple" | "round">("simple");
  const [showCatOverlay, setShowCatOverlay] = useState(false);
  const catOpacity = useRef(new RNAnimated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const winnerSectionY = useRef<number>(0);

  // ---- Session / couple ----
  const { session } = useSession();
  const currentUser = session.currentUser;
  const couple = session.couple;
  const partner = couple?.members.find((m) => m.id !== currentUser?.id) ?? null;

  // ---- Round state (start → stop → pick winner) ----
  const [scramble, setScramble] = useState(() => generateScramble());
  const [timerRunning, setTimerRunning] = useState(false);
  const [pendingRoundTime, setPendingRoundTime] = useState<number | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // ---- Shared round state (new model) ----
  const [sharedRound, setSharedRound] = useState<SharedRound | null>(null);
  const [roundSolves, setRoundSolves] = useState<Solve[]>([]);
  const [roundComplete, setRoundComplete] = useState(false);

  const activeGames = data.games.filter((g) => !g.isArchived);
  const activeGame = data.games.find((g) => g.id === data.activeGameId);
  const isTimedGame = activeGame?.type === "timed";
  const score = data.activeGameId
    ? getScoreForGame(data.activeGameId)
    : { a: 0, b: 0 };

  // getScoreForGame includes round wins, so these are the totals
  const totalA = score.a;
  const totalB = score.b;

  const prevLeaderRef = useRef<string | null>(null);

  // Restore scramble on mount (no in-progress timing to restore)
  useEffect(() => {
    const rip = data.roundInProgress;
    if (rip && rip.gameId === data.activeGameId && isTimedGame) {
      setScramble(rip.scramble);
    }
  }, []);

  // Keep awake while timing
  useEffect(() => {
    if (timerRunning) {
      activateKeepAwakeAsync("timer");
    } else {
      deactivateKeepAwake("timer");
    }
    return () => { deactivateKeepAwake("timer"); };
  }, [timerRunning]);

  // Timer interval
  useEffect(() => {
    if (timerRunning) {
      startTimeRef.current = Date.now() - timerElapsed;
      timerRef.current = setInterval(() => {
        setTimerElapsed(Date.now() - startTimeRef.current);
      }, 10);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // ---- Shared round: load active round on mount / game change ----
  useEffect(() => {
    if (!isTimedGame || !couple) return;
    let cancelled = false;
    (async () => {
      const active = await rubiksRepo.getActiveRound(couple.id);
      if (!cancelled) {
        setSharedRound(active);
        if (active) {
          setScramble(active.scramble);
          const solves = await rubiksRepo.getSolves(active.id);
          if (!cancelled) setRoundSolves(solves);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isTimedGame, couple?.id, data.activeGameId]);

  // ---- Shared round: subscribe to solve changes ----
  useEffect(() => {
    if (!sharedRound) return;
    const unsubSolves = rubiksRepo.subscribeToSolves(sharedRound.id, (solves) => {
      setRoundSolves(solves);
    });
    const unsubRound = rubiksRepo.subscribeToRound(sharedRound.id, (r) => {
      setSharedRound(r);
    });
    return () => { unsubSolves(); unsubRound(); };
  }, [sharedRound?.id]);

  // ---- Auto-close round when both solves are in ----
  useEffect(() => {
    if (!sharedRound || sharedRound.status === "closed" || !couple) return;
    if (couple.members.length < 2) return;
    const memberIds = couple.members.map((m) => m.id);
    const hasAll = memberIds.every((uid) => roundSolves.some((s) => s.userId === uid));
    if (hasAll && roundSolves.length >= 2) {
      // Auto-close
      rubiksRepo.closeRound(sharedRound.id);
      setRoundComplete(true);

      // Also save to the legacy storage so history/stats still work
      if (data.activeGameId) {
        const solveA = roundSolves.find((s) => s.userId === couple.members[0].id);
        const solveB = roundSolves.find((s) => s.userId === couple.members[1].id);
        const timeA = solveA?.dnf ? Infinity : (solveA?.timeMs ?? Infinity);
        const timeB = solveB?.dnf ? Infinity : (solveB?.timeMs ?? Infinity);
        const winnerId = timeA <= timeB ? "player_a" : "player_b";
        saveRound({
          gameId: data.activeGameId,
          scramble: sharedRound.scramble,
          playerATimeMs: solveA?.timeMs ?? 0,
          playerBTimeMs: solveB?.timeMs ?? 0,
          winnerPlayerId: winnerId,
          metadata: { dnfA: solveA?.dnf, dnfB: solveB?.dnf },
        });

        // Show confetti/effects
        const winnerColor = winnerId === "player_a" ? colors.playerA : colors.playerB;
        setLastWinnerColor(winnerColor);
        if (winnerId === "player_b") {
          setShowCatOverlay(true);
          catOpacity.setValue(0);
          RNAnimated.timing(catOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
          setTimeout(() => {
            RNAnimated.timing(catOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
              setShowCatOverlay(false);
            });
          }, 2600);
        }
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    }
  }, [roundSolves, sharedRound]);

  // Derived solve state for current user + partner
  const mySolve = currentUser
    ? roundSolves.find((s) => s.userId === currentUser.id) ?? null
    : null;
  const partnerSolve = partner
    ? roundSolves.find((s) => s.userId === partner.id) ?? null
    : null;

  const formatTimer = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
  };

  // Create a new shared round — only the creator is joined; partner must tap "Join" next
  const handleCreateRound = async () => {
    if (!data.activeGameId || !couple || !currentUser) return;
    try {
      const round = await rubiksRepo.createRound(couple.id, currentUser.id, data.activeGameId, scramble);
      setSharedRound(round);
      setRoundSolves([]);
      setRoundComplete(false);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {
      console.error("Failed to create round:", e);
    }
  };

  // Partner joins the open round → auto-transitions to in_progress when both are in
  const handleJoinRound = async () => {
    if (!sharedRound || !currentUser) return;
    try {
      const updated = await rubiksRepo.joinRound(sharedRound.id, currentUser.id);
      if (updated) setSharedRound(updated);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {
      console.error("Failed to join round:", e);
    }
  };

  // Start the timer (for the next user who needs a solve)
  const handleStartTimer = () => {
    if (timerRunning) return;
    setTimerElapsed(0);
    setTimerRunning(true);
    startTimeRef.current = Date.now();

    // Legacy fallback
    if (data.activeGameId) {
      saveRoundInProgress({ gameId: data.activeGameId, scramble, playerATimeMs: null, playerBTimeMs: null });
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Start shared timer (both players start at same time) — legacy/non-couple path
  const handleStartRound = async () => {
    if (timerRunning) return;
    setTimerElapsed(0);
    setTimerRunning(true);
    startTimeRef.current = Date.now();

    // Legacy fallback
    if (data.activeGameId) {
      saveRoundInProgress({ gameId: data.activeGameId, scramble, playerATimeMs: null, playerBTimeMs: null });
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Stop button tapped → freeze timer + auto-submit for the current turn user
  const handleStopTimer = async () => {
    if (!timerRunning) return;
    // Debounce: prevent stop within 500ms of start
    if (Date.now() - startTimeRef.current < 500) return;

    const stoppedTime = Date.now() - startTimeRef.current;
    setTimerElapsed(stoppedTime);
    setTimerRunning(false);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // Auto-submit for the next user whose solve is pending
    if (sharedRound && (sharedRound.status === "in_progress" || sharedRound.status === "open")) {
      if (!mySolve && currentUser) {
        try {
          await rubiksRepo.submitSolve(sharedRound.id, currentUser.id, stoppedTime);
        } catch (e) {
          console.error("Failed to auto-submit solve:", e);
        }
      } else if (!partnerSolve && partner) {
        try {
          await rubiksRepo.submitSolve(sharedRound.id, partner.id, stoppedTime);
        } catch (e) {
          console.error("Failed to auto-submit partner solve:", e);
        }
      }
    } else {
      // Legacy path (no shared round) → set pending time for manual pick
      setPendingRoundTime(stoppedTime);
    }
  };

  // (Auto-submit on timer stop now handles solve submission)

  // Winner picked after timer stopped → save round (legacy fallback when no couple)
  const handlePickWinner = (playerId: string) => {
    if (pendingRoundTime == null || !data.activeGameId) return;

    const winnerTime = pendingRoundTime;
    setPendingRoundTime(null);

    // Save the round: winner gets the time, loser gets 0
    const isPlayerA = playerId === "player_a";
    const round = saveRound({
      gameId: data.activeGameId,
      scramble,
      playerATimeMs: isPlayerA ? winnerTime : 0,
      playerBTimeMs: isPlayerA ? 0 : winnerTime,
      winnerPlayerId: playerId,
    });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const winnerColor = playerId === "player_a" ? colors.playerA : colors.playerB;
    setLastWinnerColor(winnerColor);

    // Show cat overlay when player_b wins (timed game)
    if (playerId === "player_b") {
      setShowCatOverlay(true);
      catOpacity.setValue(0);
      RNAnimated.timing(catOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      setTimeout(() => {
        RNAnimated.timing(catOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setShowCatOverlay(false);
        });
      }, 2600);
    }

    // Confetti on lead change
    const oldA = totalA;
    const oldB = totalB;
    const oldLeader = oldA > oldB ? "player_a" : oldB > oldA ? "player_b" : null;
    const newA2 = oldA + (playerId === "player_a" ? 1 : 0);
    const newB2 = oldB + (playerId === "player_b" ? 1 : 0);
    const newLeader = newA2 > newB2 ? "player_a" : newB2 > newA2 ? "player_b" : null;
    if (newLeader && newLeader !== oldLeader && (newA2 + newB2) > 1) {
      setConfettiKey((k) => k + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }

    // Reset to new round
    handleNewRound();

    // Show undo
    setUndoType("round");
    setShowUndo(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setShowUndo(false), 10000);
  };

  // Reset round (clears timer, keeps scramble)
  const handleResetRound = () => {
    setTimerElapsed(0);
    setTimerRunning(false);
    setPendingRoundTime(null);
    saveRoundInProgress(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // New round (new scramble + clear)
  const handleNewRound = () => {
    const newScramble = generateScramble();
    setScramble(newScramble);
    setTimerElapsed(0);
    setTimerRunning(false);
    setPendingRoundTime(null);
    saveRoundInProgress(null);
    setSharedRound(null);
    setRoundSolves([]);
    setRoundComplete(false);
  };

  // Copy scramble
  const handleCopyScramble = async () => {
    await Clipboard.setStringAsync(scramble);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

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

      // Show cat overlay when player_b wins
      if (playerId === "player_b") {
        setShowCatOverlay(true);
        catOpacity.setValue(0);
        RNAnimated.timing(catOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        setTimeout(() => {
          RNAnimated.timing(catOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
            setShowCatOverlay(false);
          });
        }, 2600);
      }

      setUndoType("simple");
      setShowUndo(true);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setShowUndo(false), 10000);
    },
    [data.activeGameId, logWin, getScoreForGame, colors, catOpacity]
  );

  const handleUndo = useCallback(() => {
    if (undoType === "round" && data.activeGameId) {
      undoLastRound(data.activeGameId);
    } else {
      undoLastWin();
    }
    setShowUndo(false);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [undoLastWin, undoLastRound, undoType, data.activeGameId]);

  const lastWinnerName = lastEvent
    ? data.players.find((p) => p.id === lastEvent.winnerPlayerId)?.name || ""
    : "";

  const diff = Math.abs(totalA - totalB);
  const leader =
    totalA > totalB
      ? data.players[0].name
      : totalB > totalA
        ? data.players[1].name
        : null;
  const statusText =
    totalA === 0 && totalB === 0
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
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
        ) : isTimedGame ? (
          <>
            {/* Score board with avatars */}
            <View style={styles.scoreBoard}>
              <LinearGradient colors={[...colors.gradientA]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={styles.scoreCard}>
                <RNImage source={require("../../assets/images/grain.png")} style={[StyleSheet.absoluteFillObject, { opacity: 0.18 }]} resizeMode="repeat" />
                <View style={styles.scoreCardContent}>
                  <View style={styles.scoreAvatarCol}>
                    {totalA > totalB && (
                      <View style={styles.scoreCardBadge}>
                        <Svg width={28} height={22} viewBox="0 0 24 20" fill="none">
                          <Path d="M2 7L5 17H19L22 7L17 11L12 3L7 11L2 7Z" fill="rgba(255,255,255,0.85)" strokeLinejoin="round" />
                        </Svg>
                      </View>
                    )}
                    <View style={[styles.scoreAvatarRing, { borderColor: "rgba(255,255,255,0.6)" }]}>
                      <View style={[styles.scoreAvatar, { backgroundColor: colors.playerA }]}>
                        {data.players[0].avatarUri ? (
                          <Image source={{ uri: data.players[0].avatarUri }} style={styles.scoreAvatarImg} />
                        ) : (
                          <Text style={styles.scoreAvatarInitial}>{data.players[0].initial}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.scoreInfoCol}>
                    <Text style={[styles.scoreCardName, { color: "#fff" }]} numberOfLines={1}>{data.players[0].name}</Text>
                    <Text style={[styles.scoreText, { color: "#fff" }]}>{totalA}</Text>
                  </View>
                </View>
              </LinearGradient>

              <LinearGradient colors={[...colors.gradientB]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={styles.scoreCard}>
                <RNImage source={require("../../assets/images/grain.png")} style={[StyleSheet.absoluteFillObject, { opacity: 0.18 }]} resizeMode="repeat" />
                <View style={styles.scoreCardContent}>
                  <View style={styles.scoreAvatarCol}>
                    {totalB > totalA && (
                      <View style={styles.scoreCardBadge}>
                        <Svg width={28} height={22} viewBox="0 0 24 20" fill="none">
                          <Path d="M2 7L5 17H19L22 7L17 11L12 3L7 11L2 7Z" fill="rgba(255,255,255,0.85)" strokeLinejoin="round" />
                        </Svg>
                      </View>
                    )}
                    <View style={[styles.scoreAvatarRing, { borderColor: "rgba(255,255,255,0.6)" }]}>
                      <View style={[styles.scoreAvatar, { backgroundColor: colors.playerB }]}>
                        {data.players[1].avatarUri ? (
                          <Image source={{ uri: data.players[1].avatarUri }} style={styles.scoreAvatarImg} />
                        ) : (
                          <Text style={styles.scoreAvatarInitial}>{data.players[1].initial}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.scoreInfoCol}>
                    <Text style={[styles.scoreCardName, { color: "#fff" }]} numberOfLines={1}>{data.players[1].name}</Text>
                    <Text style={[styles.scoreText, { color: "#fff" }]}>{totalB}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Scramble section */}
            <View style={[styles.scrambleCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.scrambleLabel, { color: colors.textSecondary }]}>Scramble</Text>
              <Text style={[styles.scrambleText, { color: colors.text }]} selectable>{scramble}</Text>
              <View style={styles.scramblePreviewRow}>
                <ScramblePreview scramble={scramble} cellSize={11} gap={1} />
              </View>
              <View style={styles.scrambleActions}>
                <Pressable
                  onPress={() => {
                    if (!timerRunning && !sharedRound) {
                      setScramble(generateScramble());
                    }
                  }}
                  disabled={timerRunning || !!sharedRound}
                  style={[
                    styles.scrambleBtn,
                    {
                      backgroundColor: colors.surface,
                      opacity: (timerRunning || !!sharedRound) ? 0.4 : 1,
                    },
                  ]}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.scrambleBtnText, { color: colors.textSecondary }]}>New Scramble</Text>
                </Pressable>
              </View>
            </View>

            {/* ---- SHARED ROUND STATE MACHINE ---- */}
            {couple && currentUser && partner ? (
              <>
                {/* ===== STATE: round is OPEN — waiting for partner to join ===== */}
                {sharedRound && sharedRound.status === "open" && (
                  <View style={styles.joinGateContainer}>
                    <View style={styles.joinGateSlots}>
                      {/* Creator slot (already joined) */}
                      <View style={[styles.joinGateSlot, { backgroundColor: colors.card, borderColor: colors.playerA }]}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.playerA} />
                        <Text style={[styles.joinGateSlotName, { color: colors.text }]}>
                          {sharedRound.joinedUserIds.includes(currentUser.id) ? `${currentUser.name} (You)` : partner.name}
                        </Text>
                        <Text style={[styles.joinGateSlotStatus, { color: colors.playerA }]}>Ready</Text>
                      </View>

                      {/* Other player slot */}
                      {!sharedRound.joinedUserIds.includes(currentUser.id) ? (
                        /* I haven't joined yet — show Join button */
                        <Pressable
                          onPress={handleJoinRound}
                          style={[styles.joinGateSlot, styles.joinGateSlotAction, { backgroundColor: colors.card, borderColor: colors.tint }]}
                        >
                          <Ionicons name="enter-outline" size={20} color={colors.tint} />
                          <Text style={[styles.joinGateSlotName, { color: colors.text }]}>
                            {currentUser.name} (You)
                          </Text>
                          <Text style={[styles.joinGateSlotStatus, { color: colors.tint, fontFamily: 'NunitoSans_700Bold' }]}>Tap to Join</Text>
                        </Pressable>
                      ) : (
                        /* I already joined, waiting for partner */
                        <View style={[styles.joinGateSlot, { backgroundColor: colors.card, borderColor: colors.border, borderStyle: 'dashed' as const }]}>
                          <Ionicons name="hourglass-outline" size={20} color={colors.textSecondary} />
                          <Text style={[styles.joinGateSlotName, { color: colors.textSecondary }]}>
                            {partner.name}
                          </Text>
                          <Text style={[styles.joinGateSlotStatus, { color: colors.textSecondary }]}>Waiting…</Text>
                        </View>
                      )}
                    </View>

                    {sharedRound.joinedUserIds.includes(currentUser.id) && (
                      <Text style={[styles.tapHint, { color: colors.textSecondary, marginTop: 8 }]}>
                        Pass the phone to {partner.name} to join
                      </Text>
                    )}

                    <Pressable
                      onPress={handleNewRound}
                      style={{ marginTop: 16, alignSelf: "center" }}
                    >
                      <Text style={[styles.tapHint, { color: colors.textSecondary, textDecorationLine: 'underline' }]}>
                        Cancel round
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* ===== STATE: round is IN_PROGRESS — both joined, show solve slots + timer ===== */}
                {sharedRound && sharedRound.status === "in_progress" && (
                  <>
                    {/* Solve slots */}
                    <View style={styles.solveSlots}>
                      <View style={[styles.solveSlot, { backgroundColor: colors.card, borderColor: mySolve ? colors.playerA : colors.border }]}>
                        <Text style={[styles.solveSlotLabel, { color: colors.textSecondary }]}>
                          {currentUser.name} (You)
                        </Text>
                        {mySolve ? (
                          <Text style={[styles.solveSlotTime, { color: colors.playerA }]}>
                            {mySolve.dnf ? "DNF" : formatTimer(mySolve.timeMs)}
                          </Text>
                        ) : (
                          <Text style={[styles.solveSlotPending, { color: colors.textSecondary }]}>
                            Waiting…
                          </Text>
                        )}
                      </View>

                      <View style={[styles.solveSlot, { backgroundColor: colors.card, borderColor: partnerSolve ? colors.playerB : colors.border }]}>
                        <Text style={[styles.solveSlotLabel, { color: colors.textSecondary }]}>
                          {partner.name}
                        </Text>
                        {partnerSolve ? (
                          <Text style={[styles.solveSlotTime, { color: colors.playerB }]}>
                            {partnerSolve.dnf ? "DNF" : formatTimer(partnerSolve.timeMs)}
                          </Text>
                        ) : (
                          <Text style={[styles.solveSlotPending, { color: colors.textSecondary }]}>
                            Waiting…
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Timer display */}
                    <View style={styles.timerContainer}>
                      <Text style={[styles.timerDisplay, { color: timerRunning ? colors.tint : colors.text, opacity: timerRunning ? 1 : (timerElapsed > 0 ? 0.7 : 0.3) }]}>
                        {formatTimer(timerElapsed)}
                      </Text>
                    </View>
                  </>
                )}

                {/* ===== STATE: round CLOSED — complete banner ===== */}
                {roundComplete && sharedRound && sharedRound.status === "closed" && (
                  <View style={styles.roundCompleteContainer}>
                    <Ionicons name="checkmark-circle" size={28} color={colors.tint} />
                    <Text style={[styles.roundCompleteText, { color: colors.text }]}>
                      Round complete!
                    </Text>
                    <Pressable
                      onPress={handleNewRound}
                      style={[styles.startButton, { backgroundColor: colors.tint, marginTop: 12 }]}
                    >
                      <Ionicons name="refresh" size={22} color={colors.tintText} />
                      <Text style={[styles.startButtonText, { color: colors.tintText, fontSize: 17 }]}>New Round</Text>
                    </Pressable>
                  </View>
                )}

                {/* ===== Action buttons based on state ===== */}
                {timerRunning ? (
                  <Text style={[styles.tapHint, { color: colors.textSecondary, marginTop: 12 }]}>
                    Tap anywhere on the red screen to stop
                  </Text>
                ) : sharedRound && sharedRound.status === "in_progress" && !mySolve ? (
                  /* My solve pending → start timer for me */
                  <View style={{ alignItems: "center" as const }}>
                    <Pressable
                      onPress={handleStartTimer}
                      style={[styles.startButton, { backgroundColor: colors.playerA }]}
                    >
                      <Ionicons name="play" size={28} color="#fff" />
                      <Text style={[styles.startButtonText, { color: "#fff" }]}>
                        Start {currentUser.name}'s Timer
                      </Text>
                    </Pressable>
                    <Text style={[styles.tapHint, { color: colors.textSecondary, marginTop: 12 }]}>
                      Timer will auto-save your time
                    </Text>
                  </View>
                ) : sharedRound && sharedRound.status === "in_progress" && mySolve && !partnerSolve ? (
                  /* My solve done, partner pending → start timer for partner */
                  <View style={{ alignItems: "center" as const }}>
                    <Pressable
                      onPress={handleStartTimer}
                      style={[styles.startButton, { backgroundColor: colors.playerB }]}
                    >
                      <Ionicons name="play" size={28} color="#fff" />
                      <Text style={[styles.startButtonText, { color: "#fff" }]}>
                        Start {partner.name}'s Timer
                      </Text>
                    </Pressable>
                    <Text style={[styles.tapHint, { color: colors.textSecondary, marginTop: 12 }]}>
                      Timer will auto-save their time
                    </Text>
                  </View>
                ) : !sharedRound && !roundComplete ? (
                  /* No active round → create one */
                  <View style={{ alignItems: "center" as const }}>
                    <Pressable
                      onPress={handleCreateRound}
                      style={[styles.startButton, { backgroundColor: colors.tint }]}
                    >
                      <Ionicons name="play" size={28} color={colors.tintText} />
                      <Text style={[styles.startButtonText, { color: colors.tintText }]}>
                        Start Round
                      </Text>
                    </Pressable>
                    <Text style={[styles.tapHint, { color: colors.textSecondary, marginTop: 12 }]}>
                      Both players will solve this scramble
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              /* Legacy path: no couple context — use old timer + manual pick */
              <>
                {/* Timer display */}
                <View style={styles.timerContainer}>
                  <Text style={[styles.timerDisplay, { color: timerRunning ? colors.tint : colors.textSecondary, opacity: timerRunning ? 1 : 0.3 }]}>
                    {formatTimer(timerElapsed)}
                  </Text>
                </View>

                {timerRunning ? (
                  <Text style={[styles.tapHint, { color: colors.textSecondary, marginTop: 12 }]}>
                    Tap anywhere on the red screen to stop
                  </Text>
                ) : pendingRoundTime != null ? (
                  <View
                    onLayout={(e) => {
                      winnerSectionY.current = e.nativeEvent.layout.y;
                      scrollViewRef.current?.scrollTo({ y: e.nativeEvent.layout.y - 60, animated: true });
                    }}
                  >
                    <Text style={[styles.tapHint, { color: colors.text, marginBottom: 16, fontSize: 16, fontFamily: 'NunitoSans_700Bold' }]}>
                      Who won?
                    </Text>
                    <View style={styles.avatarRow}>
                      <AvatarButton
                        name={data.players[0].name}
                        initial={data.players[0].initial}
                        color={colors.playerA}
                        score={totalA}
                        isLeading={totalA > totalB}
                        avatarUri={data.players[0].avatarUri}
                        onPress={() => handlePickWinner("player_a")}
                      />
                      <AvatarButton
                        name={data.players[1].name}
                        initial={data.players[1].initial}
                        color={colors.playerB}
                        score={totalB}
                        isLeading={totalB > totalA}
                        avatarUri={data.players[1].avatarUri}
                        onPress={() => handlePickWinner("player_b")}
                      />
                    </View>
                    <Pressable
                      onPress={handleResetRound}
                      style={{ marginTop: 16, alignSelf: "center" }}
                    >
                      <Text style={[styles.tapHint, { color: colors.textSecondary, textDecorationLine: 'underline' }]}>
                        Cancel & redo
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Pressable
                      onPress={handleStartRound}
                      style={[styles.startButton, { backgroundColor: colors.tint }]}
                    >
                      <Ionicons name="play" size={28} color={colors.tintText} />
                      <Text style={[styles.startButtonText, { color: colors.tintText }]}>
                        Start Round
                      </Text>
                    </Pressable>
                    <Text style={[styles.tapHint, { color: colors.textSecondary, marginTop: 12 }]}>
                      Both players start at the same time
                    </Text>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <View style={styles.center}>
            <View style={styles.scoreBoard}>
              <LinearGradient colors={[...colors.gradientA]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={styles.scoreCard}>
                <RNImage source={require("../../assets/images/grain.png")} style={[StyleSheet.absoluteFillObject, { opacity: 0.18 }]} resizeMode="repeat" />
                <View style={styles.scoreCardContent}>
                  <View style={styles.scoreAvatarCol}>
                    {score.a > score.b && (
                      <View style={styles.scoreCardBadge}>
                        <Svg width={28} height={22} viewBox="0 0 24 20" fill="none">
                          <Path d="M2 7L5 17H19L22 7L17 11L12 3L7 11L2 7Z" fill="rgba(255,255,255,0.85)" strokeLinejoin="round" />
                        </Svg>
                      </View>
                    )}
                    <View style={[styles.scoreAvatarRing, { borderColor: "rgba(255,255,255,0.6)" }]}>
                      <View style={[styles.scoreAvatar, { backgroundColor: colors.playerA }]}>
                        {data.players[0].avatarUri ? (
                          <Image source={{ uri: data.players[0].avatarUri }} style={styles.scoreAvatarImg} />
                        ) : (
                          <Text style={styles.scoreAvatarInitial}>{data.players[0].initial}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.scoreInfoCol}>
                    <Text style={[styles.scoreCardName, { color: "#fff" }]} numberOfLines={1}>{data.players[0].name}</Text>
                    <Text style={[styles.scoreText, { color: "#fff" }]}>{score.a}</Text>
                  </View>
                </View>
              </LinearGradient>

              <LinearGradient colors={[...colors.gradientB]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={styles.scoreCard}>
                <RNImage source={require("../../assets/images/grain.png")} style={[StyleSheet.absoluteFillObject, { opacity: 0.18 }]} resizeMode="repeat" />
                <View style={styles.scoreCardContent}>
                  <View style={styles.scoreAvatarCol}>
                    {score.b > score.a && (
                      <View style={styles.scoreCardBadge}>
                        <Svg width={28} height={22} viewBox="0 0 24 20" fill="none">
                          <Path d="M2 7L5 17H19L22 7L17 11L12 3L7 11L2 7Z" fill="rgba(255,255,255,0.85)" strokeLinejoin="round" />
                        </Svg>
                      </View>
                    )}
                    <View style={[styles.scoreAvatarRing, { borderColor: "rgba(255,255,255,0.6)" }]}>
                      <View style={[styles.scoreAvatar, { backgroundColor: colors.playerB }]}>
                        {data.players[1].avatarUri ? (
                          <Image source={{ uri: data.players[1].avatarUri }} style={styles.scoreAvatarImg} />
                        ) : (
                          <Text style={styles.scoreAvatarInitial}>{data.players[1].initial}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.scoreInfoCol}>
                    <Text style={[styles.scoreCardName, { color: "#fff" }]} numberOfLines={1}>{data.players[1].name}</Text>
                    <Text style={[styles.scoreText, { color: "#fff" }]}>{score.b}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <Text style={[styles.tapHint, { color: colors.text, marginBottom: 16, fontSize: 16, fontFamily: 'NunitoSans_700Bold' }]}>
              Who won?
            </Text>
            <View style={styles.avatarRow}>
              <AvatarButton
                name={data.players[0].name}
                initial={data.players[0].initial}
                color={colors.playerA}
                score={score.a}
                isLeading={score.a > score.b}
                avatarUri={data.players[0].avatarUri}
                onPress={() => handleWin("player_a")}
              />
              <AvatarButton
                name={data.players[1].name}
                initial={data.players[1].initial}
                color={colors.playerB}
                score={score.b}
                isLeading={score.b > score.a}
                avatarUri={data.players[1].avatarUri}
                onPress={() => handleWin("player_b")}
              />
            </View>

            <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
              Tap the winner
            </Text>
          </View>
        )}
      </ScrollView>

      <ConfettiEffect
        key={confettiKey}
        visible={showConfetti}
        color={lastWinnerColor}
      />

      <UndoToast
        visible={showUndo}
        playerName={undoType === "round" ? "Round saved" : lastWinnerName}
        onUndo={handleUndo}
        color={lastWinnerColor}
      />

      {/* Fullscreen red timer overlay for timed games */}
      {timerRunning && isTimedGame && (
        <Pressable
          onPress={handleStopTimer}
          style={styles.fullscreenTimerOverlay}
        >
          <Text style={styles.fullscreenTimerText}>
            {formatTimer(timerElapsed)}
          </Text>
          <Text style={styles.fullscreenTimerHint}>Tap anywhere to stop</Text>
        </Pressable>
      )}

      {/* Cat overlay when player 2 wins */}
      <Modal visible={showCatOverlay} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.catOverlay}>
          <RNAnimated.View style={[StyleSheet.absoluteFill, { opacity: catOpacity }]}>
            <Image
              source={require("@/assets/images/cat.png")}
              style={{ width: "120%", height: "100%", marginLeft: "-20%" }}
              contentFit="cover"
            />
          </RNAnimated.View>
        </View>
      </Modal>
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
    fontFamily: "NunitoSans_800ExtraBold",
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
    fontFamily: "NunitoSans_600SemiBold",
    maxWidth: 100,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreBoard: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 10,
    marginTop: 8,
    gap: 10,
    width: "100%",
  },
  scoreCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    paddingTop: 34,
    overflow: "hidden" as const,
  },
  scoreCardContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    flex: 1,
  },
  scoreAvatarCol: {
    alignItems: "center" as const,
    overflow: "visible" as const,
  },
  scoreInfoCol: {
    flex: 1,
    alignItems: "flex-start" as const,
    gap: 2,
  },
  scoreCardName: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
  },
  scoreCardBadge: {
    position: "absolute" as const,
    top: -24,
    alignSelf: "center" as const,
    zIndex: 1,
  },
  scoreSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreAvatarRing: {
    width: 60,
    height: 82,
    borderRadius: 30,
    borderWidth: 2.5,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  scoreAvatar: {
    width: 50,
    height: 72,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden" as const,
  },
  scoreAvatarImg: {
    width: 50,
    height: 72,
    borderRadius: 25,
  },
  scoreAvatarInitial: {
    fontSize: 20,
    fontFamily: "NunitoSans_800ExtraBold",
    color: "#fff",
  },
  scoreText: {
    fontSize: 48,
    fontFamily: "NunitoSans_800ExtraBold",
    lineHeight: 52,
  },
  scoreDivider: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 18,
    fontFamily: "NunitoSans_600SemiBold",
  },
  statusText: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: 16,
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
  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden" as const,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarInitial: {
    fontSize: 40,
    fontFamily: "NunitoSans_800ExtraBold",
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
    fontFamily: "NunitoSans_700Bold",
    maxWidth: 120,
  },
  avatarScore: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    opacity: 0.7,
  },
  tapHint: {
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "NunitoSans_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
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
    fontFamily: "NunitoSans_700Bold",
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
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
  },
  // Scramble
  scrambleCard: {
    width: "100%",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  scrambleLabel: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  scrambleText: {
    fontSize: 17,
    fontFamily: "NunitoSans_700Bold",
    lineHeight: 26,
  },
  scrambleActions: {
    flexDirection: "row",
    gap: 8,
  },
  scramblePreviewRow: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  scrambleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scrambleBtnText: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
  },
  // Timer (shown always for timed games)
  timerContainer: {
    alignItems: "center",
    gap: 8,
    marginVertical: 12,
    width: "100%",
  },
  timerDisplay: {
    fontSize: 64,
    fontFamily: "NunitoSans_800ExtraBold",
    fontVariant: ["tabular-nums"],
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 56,
    paddingVertical: 20,
    borderRadius: 999,
    gap: 10,
    minWidth: 220,
  },
  startButtonText: {
    color: "#fff",
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
  },
  // Round actions
  roundActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  roundActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  roundActionText: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
  },
  fullscreenTimerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E53E3E",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 100,
  },
  fullscreenTimerText: {
    fontSize: 72,
    fontFamily: "NunitoSans_800ExtraBold",
    color: "#fff",
    fontVariant: ["tabular-nums" as const],
  },
  fullscreenTimerHint: {
    fontSize: 18,
    fontFamily: "NunitoSans_600SemiBold",
    color: "rgba(255,255,255,0.7)",
    marginTop: 24,
  },
  catOverlay: {
    flex: 1,
    backgroundColor: "#000",
  },
  // ---- Shared round solve slots ----
  solveSlots: {
    flexDirection: "row" as const,
    gap: 10,
    width: "100%",
    marginBottom: 16,
  },
  solveSlot: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    alignItems: "center" as const,
    gap: 6,
  },
  solveSlotLabel: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  solveSlotTime: {
    fontSize: 22,
    fontFamily: "NunitoSans_800ExtraBold",
    fontVariant: ["tabular-nums" as const],
  },
  solveSlotPending: {
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
    fontStyle: "italic" as const,
  },
  submitSolveBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center" as const,
  },
  submitSolveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "NunitoSans_700Bold",
  },
  roundCompleteContainer: {
    alignItems: "center" as const,
    gap: 8,
    marginVertical: 16,
  },
  roundCompleteText: {
    fontSize: 20,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  // ---- Join gate (open round, waiting for partner) ----
  joinGateContainer: {
    width: "100%" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  joinGateSlots: {
    flexDirection: "row" as const,
    gap: 10,
    width: "100%" as const,
    marginBottom: 8,
  },
  joinGateSlot: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    alignItems: "center" as const,
    gap: 6,
  },
  joinGateSlotAction: {
    // extra emphasis for the tappable join slot
  },
  joinGateSlotName: {
    fontSize: 14,
    fontFamily: "NunitoSans_700Bold",
    textAlign: "center" as const,
  },
  joinGateSlotStatus: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
  },
});
