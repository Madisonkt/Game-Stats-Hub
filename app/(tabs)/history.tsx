import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  ScrollView,
  useColorScheme,
  Platform,
  Alert,
  Animated as RNAnimated,
  Image as RNImage,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useStorage } from "@/lib/storage-context";
import { WinEvent, RoundEvent } from "@/lib/types";
import Svg, { Path } from "react-native-svg";



function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function PlayerProfileCard({
  name,
  wins,
  color,
  gradient,
  avatarUri,
  initial,
  isDark,
  isLeading,
}: {
  name: string;
  wins: number;
  color: string;
  gradient: readonly [string, string];
  avatarUri?: string;
  initial: string;
  isDark: boolean;
  isLeading: boolean;
}) {
  return (
    <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={styles.profileCard}>
      <RNImage source={require("../../assets/images/grain.png")} style={[StyleSheet.absoluteFillObject, { opacity: 0.18 }]} resizeMode="repeat" />
      <View style={styles.profileCardContent}>
        <View style={styles.profileAvatarCol}>
          {isLeading && (
            <View style={styles.profileCrownBadge}>
              <Svg width={28} height={22} viewBox="0 0 24 20" fill="none">
                <Path d="M2 7L5 17H19L22 7L17 11L12 3L7 11L2 7Z" fill="rgba(255,255,255,0.85)" strokeLinejoin="round" />
              </Svg>
            </View>
          )}
          <View style={[styles.profileAvatarRing, { borderColor: "rgba(255,255,255,0.6)" }]}>
            <View style={[styles.profileAvatarInner, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.profileAvatarImg} contentFit="cover" />
              ) : (
                <Text style={styles.profileAvatarInitial}>{initial}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.profileInfoCol}>
          <Text style={[styles.profileName, { color: "rgba(255,255,255,0.85)" }]}>{name}</Text>
          <Text style={[styles.profileWinsValue, { color: "#fff" }]}>{wins}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function EventRow({
  event,
  gameName,
  gameIcon,
  winnerName,
  winnerColor,
  winnerAvatarUri,
  winnerInitial,
  colors,
  onDelete,
}: {
  event: WinEvent;
  gameName: string;
  gameIcon: string;
  winnerName: string;
  winnerColor: string;
  winnerAvatarUri?: string;
  winnerInitial: string;
  colors: any;
  onDelete: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (_progress: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });
    return (
      <Pressable
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
        style={styles.swipeDeleteBtn}
      >
        <RNAnimated.View style={{ transform: [{ scale }], alignItems: "center" }}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </RNAnimated.View>
      </Pressable>
    );
  };

  const handleDotsPress = () => {
    if (Platform.OS === "web") {
      onDelete();
    } else {
      Alert.alert("Delete Result", `Remove "${winnerName} won" from history?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]);
    }
  };

  return (
    <View style={styles.swipeableWrapper}>
      <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
        <View style={[styles.eventRow, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
          <View style={[styles.eventDotRing, { borderColor: winnerColor }]}>
            <View style={[styles.eventDot, { backgroundColor: winnerColor }]}>
              {winnerAvatarUri ? (
                <Image source={{ uri: winnerAvatarUri }} style={styles.eventDotImage} contentFit="cover" />
              ) : (
                <Text style={styles.eventDotInitial}>{winnerInitial}</Text>
              )}
            </View>
          </View>
          <View style={styles.eventContent}>
            <View style={styles.eventTop}>
              <View style={styles.eventLeft}>
                <Ionicons name={gameIcon as any} size={14} color={colors.textSecondary} />
                <Text style={[styles.eventGame, { color: colors.textSecondary }]}>
                  {gameName}
                </Text>
              </View>
              <View style={styles.eventRightRow}>
                <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                  {formatTime(event.timestamp)}
                </Text>
                <Pressable onPress={handleDotsPress} hitSlop={10} style={styles.dotsBtn}>
                  <Ionicons name="ellipsis-vertical" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <Text style={[styles.eventWinner, { color: winnerColor }]}>
              {winnerName} won{event.elapsedDisplay ? ` — ${event.elapsedDisplay}` : ""}
            </Text>
          </View>
        </View>
      </Swipeable>
    </View>
  );
}

function RoundEventRow({
  round,
  gameName,
  gameIcon,
  playerAName,
  playerBName,
  playerAColor,
  playerBColor,
  playerAAvatarUri,
  playerBAvatarUri,
  playerAInitial,
  playerBInitial,
  colors,
  onDelete,
}: {
  round: RoundEvent;
  gameName: string;
  gameIcon: string;
  playerAName: string;
  playerBName: string;
  playerAColor: string;
  playerBColor: string;
  playerAAvatarUri?: string;
  playerBAvatarUri?: string;
  playerAInitial: string;
  playerBInitial: string;
  colors: any;
  onDelete: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const isWinnerA = round.winnerPlayerId === "player_a";
  const winnerColor = isWinnerA ? playerAColor : playerBColor;
  const winnerName = isWinnerA ? playerAName : playerBName;
  const winnerAvatarUri = isWinnerA ? playerAAvatarUri : playerBAvatarUri;
  const winnerInitial = isWinnerA ? playerAInitial : playerBInitial;

  const fmtMs = (ms: number, dnf?: boolean): string => {
    if (dnf) return "DNF";
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(2)}s`;
    const m = Math.floor(s / 60);
    const rem = (s % 60).toFixed(2).padStart(5, "0");
    return `${m}:${rem}`;
  };

  const renderRightActions = (_progress: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });
    return (
      <Pressable
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
        style={styles.swipeDeleteBtn}
      >
        <RNAnimated.View style={{ transform: [{ scale }], alignItems: "center" }}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </RNAnimated.View>
      </Pressable>
    );
  };

  const handleDotsPress = () => {
    if (Platform.OS === "web") {
      onDelete();
    } else {
      Alert.alert("Delete Result", `Remove "${winnerName} won" from history?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]);
    }
  };

  return (
    <View style={styles.swipeableWrapper}>
      <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
        <View style={[styles.eventRow, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
          <View style={[styles.eventDotRing, { borderColor: winnerColor }]}>
            <View style={[styles.eventDot, { backgroundColor: winnerColor }]}>
              {winnerAvatarUri ? (
                <Image source={{ uri: winnerAvatarUri }} style={styles.eventDotImage} contentFit="cover" />
              ) : (
                <Text style={styles.eventDotInitial}>{winnerInitial}</Text>
              )}
            </View>
          </View>
          <View style={styles.eventContent}>
            <View style={styles.eventTop}>
              <View style={styles.eventLeft}>
                <Ionicons name={gameIcon as any} size={14} color={colors.textSecondary} />
                <Text style={[styles.eventGame, { color: colors.textSecondary }]}>{gameName}</Text>
              </View>
              <View style={styles.eventRightRow}>
                <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                  {formatTime(round.timestamp)}
                </Text>
                <Pressable onPress={handleDotsPress} hitSlop={10} style={styles.dotsBtn}>
                  <Ionicons name="ellipsis-vertical" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <Text style={[styles.eventWinner, { color: winnerColor }]}>
              {winnerName} won — {fmtMs(isWinnerA ? round.playerATimeMs : round.playerBTimeMs, isWinnerA ? round.metadata?.dnfA : round.metadata?.dnfB)}
            </Text>
          </View>
        </View>
      </Swipeable>
    </View>
  );
}

function ScorecardView({
  innerRef,
  data,
  getOverallScore,
  getScoreForGame,
  getStreak,
}: {
  innerRef: any;
  data: any;
  getOverallScore: () => { a: number; b: number };
  getScoreForGame: (gameId: string) => { a: number; b: number };
  getStreak: () => { playerId: string | null; count: number };
}) {
  const overall = getOverallScore();
  const streak = getStreak();
  const streakPlayer = streak.playerId
    ? data.players.find((p: any) => p.id === streak.playerId)
    : null;

  return (
    <View ref={innerRef} collapsable={false} style={styles.scorecard}>
      <View style={styles.scorecardHeader}>
        <Text style={styles.scorecardTitle}>Rivalry Scorecard</Text>
        <Text style={styles.scorecardDate}>
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </View>
      <View style={styles.scorecardScore}>
        <View style={styles.scorecardPlayer}>
          <View style={[styles.scorecardAvatar, { backgroundColor: "#FF6B6B" }]}>
            <Text style={styles.scorecardInitial}>{data.players[0].initial}</Text>
          </View>
          <Text style={styles.scorecardPlayerName}>{data.players[0].name}</Text>
          <Text style={[styles.scorecardPlayerScore, { color: "#FF6B6B" }]}>
            {overall.a}
          </Text>
        </View>
        <Text style={styles.scorecardVs}>vs</Text>
        <View style={styles.scorecardPlayer}>
          <View style={[styles.scorecardAvatar, { backgroundColor: "#2EC4B6" }]}>
            <Text style={styles.scorecardInitial}>{data.players[1].initial}</Text>
          </View>
          <Text style={styles.scorecardPlayerName}>{data.players[1].name}</Text>
          <Text style={[styles.scorecardPlayerScore, { color: "#2EC4B6" }]}>
            {overall.b}
          </Text>
        </View>
      </View>
      {data.games.filter((g: any) => !g.isArchived).length > 0 && (
        <View style={styles.scorecardGames}>
          {data.games
            .filter((g: any) => !g.isArchived)
            .map((game: any) => {
              const s = getScoreForGame(game.id);
              return (
                <View key={game.id} style={styles.scorecardGameRow}>
                  <Text style={styles.scorecardGameName}>{game.name}</Text>
                  <Text style={styles.scorecardGameScore}>
                    {s.a} - {s.b}
                  </Text>
                </View>
              );
            })}
        </View>
      )}
      {streakPlayer && streak.count > 1 && (
        <Text style={styles.scorecardStreak}>
          {streakPlayer.name} is on a {streak.count}-win streak!
        </Text>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { data, getOverallScore, getStreak, getScoreForGame, getTimedStatsForPlayer, getRoundsForGame, getRoundStatsForPlayer, getHeadToHead, deleteEvent, deleteRound } =
    useStorage();

  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [statSheetPlayer, setStatSheetPlayer] = useState<"player_a" | "player_b" | null>(null);

  const overall = getOverallScore();
  const streak = getStreak();
  const streakPlayer = streak.playerId
    ? data.players.find((p) => p.id === streak.playerId)
    : null;

  const filteredEvents = useMemo(() => {
    let events = [...data.events].sort((a, b) => b.timestamp - a.timestamp);

    if (gameFilter) {
      events = events.filter((e) => e.gameId === gameFilter);
    }
    return events;
  }, [data.events, gameFilter]);

  // Merge round events for timed games
  const filteredRounds = useMemo(() => {
    let rounds = [...(data.roundEvents || [])].sort((a, b) => b.timestamp - a.timestamp);
    if (gameFilter) {
      rounds = rounds.filter((r) => r.gameId === gameFilter);
    }
    return rounds;
  }, [data.roundEvents, gameFilter]);

  // Combined & sorted timeline
  type TimelineItem = { type: "event"; data: WinEvent } | { type: "round"; data: RoundEvent };
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...filteredEvents.map((e) => ({ type: "event" as const, data: e })),
      ...filteredRounds.map((r) => ({ type: "round" as const, data: r })),
    ];
    items.sort((a, b) => b.data.timestamp - a.data.timestamp);
    return items;
  }, [filteredEvents, filteredRounds]);

  const activeGames = data.games.filter((g) => !g.isArchived);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderTimelineItem = useCallback(
    ({ item }: { item: TimelineItem }) => {
      if (item.type === "round") {
        const round = item.data;
        const game = data.games.find((g) => g.id === round.gameId);
        return (
          <RoundEventRow
            round={round}
            gameName={game?.name || "Unknown"}
            gameIcon={game?.icon || "help-circle-outline"}
            playerAName={data.players[0].name}
            playerBName={data.players[1].name}
            playerAColor={colors.playerA}
            playerBColor={colors.playerB}
            playerAAvatarUri={data.players[0].avatarUri}
            playerBAvatarUri={data.players[1].avatarUri}
            playerAInitial={data.players[0].initial}
            playerBInitial={data.players[1].initial}
            colors={colors}
            onDelete={() => {
              deleteRound(round.id);
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        );
      }
      const event = item.data;
      const game = data.games.find((g) => g.id === event.gameId);
      const winner = data.players.find((p) => p.id === event.winnerPlayerId);
      const winnerColor =
        event.winnerPlayerId === "player_a" ? colors.playerA : colors.playerB;
      return (
        <EventRow
          event={event}
          gameName={game?.name || "Unknown"}
          gameIcon={game?.icon || "help-circle-outline"}
          winnerName={winner?.name || "Unknown"}
          winnerColor={winnerColor}
          winnerAvatarUri={winner?.avatarUri}
          winnerInitial={winner?.initial || "?"}
          colors={colors}
          onDelete={() => {
            deleteEvent(event.id);
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
      );
    },
    [data.games, data.players, colors, deleteEvent, deleteRound]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: Platform.OS === "web" ? webTopInset : insets.top }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            History
          </Text>
        </View>
      </View>

      <FlatList
        data={timeline}
        keyExtractor={(item) => item.data.id}
        renderItem={renderTimelineItem}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <View style={styles.statsRow}>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatSheetPlayer("player_a"); }} style={{ flex: 1 }}>
                <PlayerProfileCard
                  name={data.players[0].name}
                  wins={overall.a}
                  color={colors.playerA}
                  gradient={colors.gradientA}
                  avatarUri={data.players[0].avatarUri}
                  initial={data.players[0].initial}
                  isDark={isDark}
                  isLeading={overall.a > overall.b}
                />
              </Pressable>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatSheetPlayer("player_b"); }} style={{ flex: 1 }}>
                <PlayerProfileCard
                  name={data.players[1].name}
                  wins={overall.b}
                  color={colors.playerB}
                  gradient={colors.gradientB}
                  avatarUri={data.players[1].avatarUri}
                  initial={data.players[1].initial}
                  isDark={isDark}
                  isLeading={overall.b > overall.a}
                />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={styles.filterRow}
            >
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGameFilter(null); }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: !gameFilter ? colors.tint : colors.surface,
                    borderColor: !gameFilter ? colors.tint : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: !gameFilter ? colors.tintText : colors.text },
                  ]}
                >
                  All Games
                </Text>
              </Pressable>
              {activeGames.map((game) => (
                <Pressable
                  key={game.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGameFilter(gameFilter === game.id ? null : game.id);
                  }
                  }
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        gameFilter === game.id ? colors.tint : colors.surface,
                      borderColor:
                        gameFilter === game.id ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          gameFilter === game.id ? colors.tintText : colors.text,
                      },
                    ]}
                  >
                    {game.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Round stats for timed games - below game selection */}
            {gameFilter && data.games.find(g => g.id === gameFilter)?.type === "timed" && (() => {
              const statsA = getRoundStatsForPlayer(gameFilter, "player_a");
              const statsB = getRoundStatsForPlayer(gameFilter, "player_b");
              const formatMs = (ms: number | null) => {
                if (ms == null) return "-";
                const s = ms / 1000;
                return s < 60 ? `${s.toFixed(2)}s` : `${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`;
              };
              return (
                <View style={[styles.timedStatsCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.timedStatsTitle, { color: colors.text }]}>Round Stats</Text>

                  {/* Player name header row */}
                  <View style={[styles.timedStatsNameRow, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                    <View style={styles.timedStatsCol}>
                      <Text style={[styles.h2hLabel, { color: colors.playerA }]}>{data.players[0].name}</Text>
                    </View>
                    <View style={{ width: 1, marginHorizontal: 8 }} />
                    <View style={styles.timedStatsCol}>
                      <Text style={[styles.h2hLabel, { color: colors.playerB }]}>{data.players[1].name}</Text>
                    </View>
                  </View>

                  <View style={styles.timedStatsRow}>
                    <View style={styles.timedStatsCol}>
                      <Text style={[styles.timedStatItem, { color: colors.textSecondary }]}>Best: <Text style={{ color: colors.playerA, fontFamily: "NunitoSans_700Bold" }}>{formatMs(statsA.bestTime)}</Text></Text>
                      <Text style={[styles.timedStatItem, { color: colors.textSecondary }]}>Avg: <Text style={{ color: colors.playerA, fontFamily: "NunitoSans_700Bold" }}>{formatMs(statsA.averageTime)}</Text></Text>
                      <Text style={[styles.timedStatItem, { color: colors.textSecondary }]}>Rounds: <Text style={{ color: colors.playerA, fontFamily: "NunitoSans_700Bold" }}>{statsA.roundCount}</Text></Text>
                    </View>
                    <View style={[styles.timedStatsDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.timedStatsCol}>
                      <Text style={[styles.timedStatItem, { color: colors.textSecondary }]}>Best: <Text style={{ color: colors.playerB, fontFamily: "NunitoSans_700Bold" }}>{formatMs(statsB.bestTime)}</Text></Text>
                      <Text style={[styles.timedStatItem, { color: colors.textSecondary }]}>Avg: <Text style={{ color: colors.playerB, fontFamily: "NunitoSans_700Bold" }}>{formatMs(statsB.averageTime)}</Text></Text>
                      <Text style={[styles.timedStatItem, { color: colors.textSecondary }]}>Rounds: <Text style={{ color: colors.playerB, fontFamily: "NunitoSans_700Bold" }}>{statsB.roundCount}</Text></Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {timeline.length > 0 && (
              <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                {timeline.length} result{timeline.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="time-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No wins recorded yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Go to the Log tab and start tapping to record wins
            </Text>
          </View>
        }
      />

      {/* Player stat sheet modal */}
      <Modal visible={statSheetPlayer !== null} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={styles.statSheetOverlay} onPress={() => setStatSheetPlayer(null)}>
          {(() => {
            if (!statSheetPlayer) return null;
            const idx = statSheetPlayer === "player_a" ? 0 : 1;
            const player = data.players[idx];
            const playerGradient = idx === 0 ? colors.gradientA : colors.gradientB;

            // Use filtered game or first timed game for round stats
            const timedGames = data.games.filter((g) => g.type === "timed" && !g.isArchived);
            const statGameId = gameFilter || (timedGames.length > 0 ? timedGames[0].id : null);
            const statGame = statGameId ? data.games.find((g) => g.id === statGameId) : null;

            const playerScore = overall[idx === 0 ? "a" : "b"];
            const opponentScore = overall[idx === 0 ? "b" : "a"];
            const roundStats = statGameId ? getRoundStatsForPlayer(statGameId, statSheetPlayer) : { bestTime: null, averageTime: null, last5Average: null, roundCount: 0 };

            const totalWins = data.events.filter((e) => e.winnerPlayerId === statSheetPlayer).length;
            const totalEvents = data.events.length;
            const winRate = totalEvents > 0 ? Math.round((totalWins / totalEvents) * 100) : 0;
            const isOnStreak = streak.playerId === statSheetPlayer;

            const formatMs = (ms: number | null) => {
              if (ms === null) return "—";
              const s = ms / 1000;
              return s < 60 ? `${s.toFixed(2)}s` : `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
            };

            return (
              <Pressable style={styles.statSheetCard} onPress={(e) => e.stopPropagation()}>
                {/* Player image on right side with motion effect */}
                {player.avatarUri && (
                  <View style={styles.statSheetImageContainer}>
                    {/* Motion trail layers */}
                    <RNImage
                      source={{ uri: player.avatarUri }}
                      style={[styles.statSheetPlayerImage, { opacity: 0.15, transform: [{ translateX: -8 }] }]}
                      blurRadius={Platform.OS === "ios" ? 12 : 8}
                      resizeMode="cover"
                    />
                    <RNImage
                      source={{ uri: player.avatarUri }}
                      style={[styles.statSheetPlayerImage, { opacity: 0.25, transform: [{ translateX: -3 }] }]}
                      blurRadius={Platform.OS === "ios" ? 4 : 3}
                      resizeMode="cover"
                    />
                    {/* Main clear image */}
                    <RNImage
                      source={{ uri: player.avatarUri }}
                      style={styles.statSheetPlayerImage}
                      resizeMode="cover"
                    />
                    {/* Left fade – wide soft blend */}
                    <LinearGradient
                      colors={["#0A0A0C", "rgba(10,10,12,0.92)", "rgba(10,10,12,0.55)", "rgba(10,10,12,0.15)", "transparent"]}
                      locations={[0, 0.15, 0.35, 0.55, 0.75]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    {/* Bottom fade */}
                    <LinearGradient
                      colors={["transparent", "rgba(10,10,12,0.6)"]}
                      start={{ x: 0.5, y: 0.65 }}
                      end={{ x: 0.5, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    {/* Top fade */}
                    <LinearGradient
                      colors={["rgba(10,10,12,0.5)", "transparent"]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 0.2 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>
                )}

                {/* Content – left-aligned stats */}
                <View style={styles.statSheetContent}>
                  <View style={styles.statSheetHeader}>
                    {playerScore > opponentScore && (
                      <Svg width={24} height={18} viewBox="0 0 24 20" fill="none" style={{ marginRight: 8 }}>
                        <Path d="M2 7L5 17H19L22 7L17 11L12 3L7 11L2 7Z" fill="#FFD93D" strokeLinejoin="round" />
                      </Svg>
                    )}
                    <Text style={styles.statSheetName} numberOfLines={1}>{player.name}</Text>
                  </View>
                  <Text style={styles.statSheetGameName}>{statGame?.name ?? "All Games"}</Text>

                  <View style={styles.statSheetStatCol}>
                    <View style={styles.statSheetStatRow}>
                      <Text style={styles.statSheetStatValue}>{playerScore}</Text>
                      <Text style={styles.statSheetStatLabel}>WINS</Text>
                    </View>
                    <View style={styles.statSheetStatRow}>
                      <Text style={styles.statSheetStatValue}>{winRate}%</Text>
                      <Text style={styles.statSheetStatLabel}>WIN RATE</Text>
                    </View>
                    <View style={styles.statSheetStatRow}>
                      <Text style={styles.statSheetStatValue}>{isOnStreak ? streak.count : 0}</Text>
                      <Text style={styles.statSheetStatLabel}>STREAK</Text>
                    </View>
                  </View>

                  {roundStats.roundCount > 0 && (
                    <>
                      <View style={styles.statSheetDivider} />
                      <Text style={styles.statSheetSectionTitle}>ROUND STATS</Text>
                      <View style={styles.statSheetStatCol}>
                        <View style={styles.statSheetStatRow}>
                          <Text style={styles.statSheetStatValue}>{formatMs(roundStats.bestTime)}</Text>
                          <Text style={styles.statSheetStatLabel}>BEST</Text>
                        </View>
                        <View style={styles.statSheetStatRow}>
                          <Text style={styles.statSheetStatValue}>{formatMs(roundStats.averageTime)}</Text>
                          <Text style={styles.statSheetStatLabel}>AVERAGE</Text>
                        </View>
                        <View style={styles.statSheetStatRow}>
                          <Text style={styles.statSheetStatValue}>{roundStats.roundCount}</Text>
                          <Text style={styles.statSheetStatLabel}>ROUNDS</Text>
                        </View>
                      </View>
                    </>
                  )}

                  <Text style={styles.statSheetCloseHint}>Tap outside to close</Text>
                </View>
              </Pressable>
            );
          })()}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  list: {
    paddingHorizontal: 0,
    gap: 8,
  },
  swipeableWrapper: {
    overflow: "visible" as const,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  profileCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    paddingTop: 34,
    overflow: "hidden" as const,
  },
  profileCardContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    flex: 1,
  },
  profileAvatarCol: {
    alignItems: "center" as const,
    overflow: "visible" as const,
  },
  profileInfoCol: {
    flex: 1,
    alignItems: "flex-start" as const,
    gap: 2,
  },
  profileCrownBadge: {
    position: "absolute" as const,
    top: -24,
    alignSelf: "center" as const,
    zIndex: 1,
  },
  profileAvatarRing: {
    width: 60,
    height: 82,
    borderRadius: 30,
    borderWidth: 2.5,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  profileAvatarInner: {
    width: 50,
    height: 72,
    borderRadius: 25,
    overflow: "hidden" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  profileAvatarImg: {
    width: 50,
    height: 72,
    borderRadius: 25,
  },
  profileAvatarInitial: {
    fontSize: 20,
    fontFamily: "NunitoSans_800ExtraBold",
    color: "#fff",
  },
  profileWinsValue: {
    fontSize: 48,
    fontFamily: "NunitoSans_800ExtraBold",
    lineHeight: 52,
  },
  profileName: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
  },
  timedStatsCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  timedStatsTitle: {
    fontSize: 15,
    fontFamily: "NunitoSans_700Bold",
    textAlign: "center",
  },
  timedStatsNameRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  timedStatsRow: {
    flexDirection: "row",
    gap: 0,
  },
  timedStatsCol: {
    flex: 1,
    gap: 4,
    alignItems: "center",
  },
  timedStatsName: {
    fontSize: 13,
    fontFamily: "NunitoSans_700Bold",
    marginBottom: 2,
  },
  timedStatItem: {
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
  },
  timedStatsDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  h2hRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  h2hLabel: {
    fontSize: 13,
    fontFamily: "NunitoSans_700Bold",
  },
  h2hScore: {
    fontSize: 18,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  roundTimesRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  roundTimeChip: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
  },
  roundDetailCard: {
    borderRadius: 18,
    padding: 14,
    marginTop: -4,
    marginBottom: 4,
    gap: 6,
  },
  roundDetailLabel: {
    fontSize: 11,
    fontFamily: "NunitoSans_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  roundDetailScramble: {
    fontSize: 14,
    fontFamily: "NunitoSans_700Bold",
    lineHeight: 22,
  },
  filterRow: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
  },
  filterRow2: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  filterGroup: {
    flexDirection: "row",
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
  },
  resultCount: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: 8,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    gap: 10,
  },
  eventDotRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  eventDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: "hidden" as const,
    justifyContent: "center",
    alignItems: "center",
  },
  eventDotImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  eventDotInitial: {
    fontSize: 10,
    fontFamily: "NunitoSans_700Bold",
    color: "#fff",
  },
  eventContent: {
    flex: 1,
    gap: 2,
  },
  eventTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventGame: {
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
  },
  eventTime: {
    fontSize: 11,
    fontFamily: "NunitoSans_400Regular",
  },
  eventWinner: {
    fontSize: 15,
    fontFamily: "NunitoSans_700Bold",
  },
  eventNote: {
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
    fontStyle: "italic" as const,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
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
  noteOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  noteSheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
  },
  noteTitle: {
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
    marginBottom: 12,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top" as const,
    marginBottom: 16,
  },
  noteActions: {
    flexDirection: "row",
    gap: 10,
  },
  noteButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  noteButtonText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
  },
  scorecardOffscreen: {
    position: "absolute",
    top: -2000,
    left: 0,
  },
  scorecard: {
    width: 360,
    backgroundColor: "#1A1A2E",
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  scorecardHeader: {
    alignItems: "center",
    gap: 4,
  },
  scorecardTitle: {
    fontSize: 22,
    fontFamily: "NunitoSans_800ExtraBold",
    color: "#fff",
  },
  scorecardDate: {
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  scorecardScore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  scorecardPlayer: {
    alignItems: "center",
    gap: 8,
  },
  scorecardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  scorecardInitial: {
    fontSize: 22,
    fontFamily: "NunitoSans_800ExtraBold",
    color: "#fff",
  },
  scorecardPlayerName: {
    fontSize: 14,
    fontFamily: "NunitoSans_700Bold",
    color: "#fff",
  },
  scorecardPlayerScore: {
    fontSize: 32,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  scorecardVs: {
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
    color: "rgba(255,255,255,0.4)",
  },
  scorecardGames: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 16,
  },
  scorecardGameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scorecardGameName: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
    color: "rgba(255,255,255,0.8)",
  },
  scorecardGameScore: {
    fontSize: 14,
    fontFamily: "NunitoSans_700Bold",
    color: "#fff",
  },
  scorecardStreak: {
    fontSize: 13,
    fontFamily: "NunitoSans_700Bold",
    color: "#FFD93D",
    textAlign: "center",
  },
  swipeDeleteBtn: {
    backgroundColor: "#E53935",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    width: 80,
    borderRadius: 18,
    marginLeft: 0,
    marginRight: 16,
  },
  swipeDeleteText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "NunitoSans_600SemiBold",
    marginTop: 2,
  },
  eventRightRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  dotsBtn: {
    padding: 4,
  },
  // Stat sheet modal
  statSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 24,
  },
  statSheetCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    overflow: "hidden" as const,
    backgroundColor: "#0A0A0C",
    minHeight: 420,
  },
  statSheetImageContainer: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: "75%",
    overflow: "hidden" as const,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
  } as any,
  statSheetPlayerImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  } as any,
  statSheetContent: {
    padding: 28,
    paddingTop: 32,
    paddingRight: 16,
    zIndex: 2,
  },
  statSheetHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  statSheetName: {
    fontSize: 28,
    fontFamily: "NunitoSans_800ExtraBold",
    color: "#fff",
    flex: 1,
  },
  statSheetGameName: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
    marginBottom: 28,
  },
  statSheetStatCol: {
    gap: 6,
    marginBottom: 4,
  },
  statSheetStatRow: {
    paddingVertical: 2,
  },
  statSheetStatValue: {
    fontSize: 34,
    fontFamily: "NunitoSans_800ExtraBold",
    color: "#fff",
    lineHeight: 38,
  },
  statSheetStatLabel: {
    fontSize: 11,
    fontFamily: "NunitoSans_600SemiBold",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
    marginTop: -2,
  },
  statSheetDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 8,
  },
  statSheetSectionTitle: {
    fontSize: 12,
    fontFamily: "NunitoSans_700Bold",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 4,
  },
  statSheetCloseHint: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
    color: "rgba(255,255,255,0.25)",
    textAlign: "center" as const,
    marginTop: 20,
  },
});
