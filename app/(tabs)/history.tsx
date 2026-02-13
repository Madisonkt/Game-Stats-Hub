import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  ScrollView,
  useColorScheme,
  Platform,
  Share,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import Colors from "@/constants/colors";
import { useStorage } from "@/lib/storage-context";
import { WinEvent } from "@/lib/types";

type TimeFilter = "7" | "30" | "all";
type WinnerFilter = "all" | "player_a" | "player_b";

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

function StatCard({
  label,
  value,
  color,
  icon,
  bgColor,
}: {
  label: string;
  value: string;
  color: string;
  icon: string;
  bgColor: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function EventRow({
  event,
  gameName,
  gameIcon,
  winnerName,
  winnerColor,
  colors,
  onAddNote,
}: {
  event: WinEvent;
  gameName: string;
  gameIcon: string;
  winnerName: string;
  winnerColor: string;
  colors: any;
  onAddNote: (id: string) => void;
}) {
  return (
    <View style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.eventDot, { backgroundColor: winnerColor }]} />
      <View style={styles.eventContent}>
        <View style={styles.eventTop}>
          <View style={styles.eventLeft}>
            <Ionicons name={gameIcon as any} size={14} color={colors.textSecondary} />
            <Text style={[styles.eventGame, { color: colors.textSecondary }]}>
              {gameName}
            </Text>
          </View>
          <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
            {formatTime(event.timestamp)}
          </Text>
        </View>
        <Text style={[styles.eventWinner, { color: winnerColor }]}>
          {winnerName} won
        </Text>
        {event.note ? (
          <Text style={[styles.eventNote, { color: colors.textSecondary }]}>
            {event.note}
          </Text>
        ) : null}
      </View>
      <Pressable onPress={() => onAddNote(event.id)} hitSlop={8}>
        <Ionicons
          name={event.note ? "document-text" : "document-text-outline"}
          size={16}
          color={colors.textSecondary}
        />
      </Pressable>
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
  const { data, getOverallScore, getStreak, getScoreForGame, addNote } =
    useStorage();

  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [winnerFilter, setWinnerFilter] = useState<WinnerFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [noteModalEvent, setNoteModalEvent] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showScorecard, setShowScorecard] = useState(false);

  const scorecardRef = useRef<View>(null);

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
    if (winnerFilter !== "all") {
      events = events.filter((e) => e.winnerPlayerId === winnerFilter);
    }
    if (timeFilter !== "all") {
      const daysAgo = parseInt(timeFilter);
      const cutoff = Date.now() - daysAgo * 86400000;
      events = events.filter((e) => e.timestamp > cutoff);
    }
    return events;
  }, [data.events, gameFilter, winnerFilter, timeFilter]);

  const handleAddNote = (eventId: string) => {
    const existing = data.events.find((e) => e.id === eventId);
    setNoteText(existing?.note || "");
    setNoteModalEvent(eventId);
  };

  const saveNote = () => {
    if (noteModalEvent) {
      addNote(noteModalEvent, noteText.trim());
      setNoteModalEvent(null);
      setNoteText("");
    }
  };

  const exportCSV = async () => {
    const header = "Date,Game,Winner,Note\n";
    const rows = data.events
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((e) => {
        const game = data.games.find((g) => g.id === e.gameId);
        const winner = data.players.find((p) => p.id === e.winnerPlayerId);
        const date = new Date(e.timestamp).toISOString();
        const note = (e.note || "").replace(/,/g, ";").replace(/\n/g, " ");
        return `${date},${game?.name || "Unknown"},${winner?.name || "Unknown"},${note}`;
      })
      .join("\n");
    const csv = header + rows;

    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rivalry-stats.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        const fileUri = FileSystem.documentDirectory + "rivalry-stats.csv";
        await FileSystem.writeAsStringAsync(fileUri, csv);
        await Sharing.shareAsync(fileUri);
      } catch (e) {
        console.error("Export failed:", e);
      }
    }
  };

  const shareScorecard = async () => {
    setShowScorecard(true);
    setTimeout(async () => {
      try {
        if (scorecardRef.current) {
          const uri = await captureRef(scorecardRef, {
            format: "png",
            quality: 1,
          });
          setShowScorecard(false);
          if (Platform.OS === "web") {
            Alert.alert("Scorecard captured!");
          } else {
            await Sharing.shareAsync(uri);
          }
        }
      } catch (e) {
        console.error("Scorecard capture failed:", e);
        setShowScorecard(false);
      }
    }, 300);
  };

  const activeGames = data.games.filter((g) => !g.isArchived);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderEvent = useCallback(
    ({ item }: { item: WinEvent }) => {
      const game = data.games.find((g) => g.id === item.gameId);
      const winner = data.players.find((p) => p.id === item.winnerPlayerId);
      const winnerColor =
        item.winnerPlayerId === "player_a" ? colors.playerA : colors.playerB;
      return (
        <EventRow
          event={item}
          gameName={game?.name || "Unknown"}
          gameIcon={game?.icon || "help-circle-outline"}
          winnerName={winner?.name || "Unknown"}
          winnerColor={winnerColor}
          colors={colors}
          onAddNote={handleAddNote}
        />
      );
    },
    [data.games, data.players, colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: Platform.OS === "web" ? webTopInset : insets.top }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            History
          </Text>
          <View style={styles.headerActions}>
            <Pressable onPress={shareScorecard} hitSlop={8}>
              <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
            </Pressable>
            <Pressable onPress={exportCSV} hitSlop={8}>
              <Ionicons name="download-outline" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.statsRow}>
              <StatCard
                label={data.players[0].name}
                value={String(overall.a)}
                color={colors.playerA}
                icon="flame"
                bgColor={isDark ? "rgba(255,107,107,0.15)" : "rgba(255,107,107,0.1)"}
              />
              <StatCard
                label={data.players[1].name}
                value={String(overall.b)}
                color={colors.playerB}
                icon="flame"
                bgColor={isDark ? "rgba(46,196,182,0.15)" : "rgba(46,196,182,0.1)"}
              />
              <StatCard
                label="Streak"
                value={
                  streakPlayer && streak.count > 1
                    ? `${streak.count} ${streakPlayer.name}`
                    : "-"
                }
                color={colors.gold}
                icon="trending-up"
                bgColor={isDark ? "rgba(255,217,61,0.15)" : "rgba(255,217,61,0.1)"}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <Pressable
                onPress={() => setGameFilter(null)}
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
                    { color: !gameFilter ? "#fff" : colors.text },
                  ]}
                >
                  All Games
                </Text>
              </Pressable>
              {activeGames.map((game) => (
                <Pressable
                  key={game.id}
                  onPress={() =>
                    setGameFilter(gameFilter === game.id ? null : game.id)
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
                          gameFilter === game.id ? "#fff" : colors.text,
                      },
                    ]}
                  >
                    {game.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.filterRow2}>
              <View style={styles.filterGroup}>
                {(["all", "player_a", "player_b"] as WinnerFilter[]).map(
                  (f) => {
                    const label =
                      f === "all"
                        ? "Both"
                        : f === "player_a"
                          ? data.players[0].name
                          : data.players[1].name;
                    return (
                      <Pressable
                        key={f}
                        onPress={() => setWinnerFilter(f)}
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor:
                              winnerFilter === f ? colors.tint : colors.surface,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            {
                              color: winnerFilter === f ? "#fff" : colors.text,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
              <View style={styles.filterGroup}>
                {([
                  ["7", "7d"],
                  ["30", "30d"],
                  ["all", "All"],
                ] as [TimeFilter, string][]).map(([val, label]) => (
                  <Pressable
                    key={val}
                    onPress={() => setTimeFilter(val)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor:
                          timeFilter === val
                            ? colors.tintSecondary
                            : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color: timeFilter === val ? "#fff" : colors.text,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {filteredEvents.length > 0 && (
              <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                {filteredEvents.length} win{filteredEvents.length !== 1 ? "s" : ""}
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

      <Modal visible={!!noteModalEvent} transparent animationType="fade" onRequestClose={() => setNoteModalEvent(null)}>
        <Pressable
          style={styles.noteOverlay}
          onPress={() => setNoteModalEvent(null)}
        >
          <View
            style={[styles.noteSheet, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.noteTitle, { color: colors.text }]}>
              Add Note
            </Text>
            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g., Rubik's cube 32s vs 41s"
              placeholderTextColor={colors.textSecondary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              autoFocus
            />
            <View style={styles.noteActions}>
              <Pressable
                onPress={() => setNoteModalEvent(null)}
                style={[styles.noteButton, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.noteButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={saveNote}
                style={[styles.noteButton, { backgroundColor: colors.tint }]}
              >
                <Text style={[styles.noteButtonText, { color: "#fff" }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {showScorecard && (
        <View style={styles.scorecardOffscreen}>
          <ScorecardView
            innerRef={scorecardRef}
            data={data}
            getOverallScore={getOverallScore}
            getScoreForGame={getScoreForGame}
            getStreak={getStreak}
          />
        </View>
      )}
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
    fontFamily: "Nunito_800ExtraBold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    opacity: 0.8,
  },
  filterRow: {
    paddingBottom: 8,
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
    fontFamily: "Nunito_600SemiBold",
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
    fontFamily: "Nunito_600SemiBold",
  },
  resultCount: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 8,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    fontFamily: "Nunito_400Regular",
  },
  eventTime: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
  },
  eventWinner: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },
  eventNote: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
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
    fontFamily: "Nunito_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
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
    fontFamily: "Nunito_700Bold",
    marginBottom: 12,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Nunito_400Regular",
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
    fontFamily: "Nunito_700Bold",
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
    fontFamily: "Nunito_800ExtraBold",
    color: "#fff",
  },
  scorecardDate: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
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
    fontFamily: "Nunito_800ExtraBold",
    color: "#fff",
  },
  scorecardPlayerName: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  scorecardPlayerScore: {
    fontSize: 32,
    fontFamily: "Nunito_800ExtraBold",
  },
  scorecardVs: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
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
    fontFamily: "Nunito_600SemiBold",
    color: "rgba(255,255,255,0.8)",
  },
  scorecardGameScore: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  scorecardStreak: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFD93D",
    textAlign: "center",
  },
});
