import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  useColorScheme,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useStorage } from "@/lib/storage-context";

const GAME_ICONS = [
  "cube-outline",
  "game-controller-outline",
  "globe-outline",
  "rocket-outline",
  "flash-outline",
  "dice-outline",
  "musical-notes-outline",
  "telescope-outline",
  "medal-outline",
  "fitness-outline",
  "car-sport-outline",
  "basketball-outline",
  "football-outline",
  "tennisball-outline",
  "bicycle-outline",
  "fish-outline",
  "pizza-outline",
  "book-outline",
  "code-slash-outline",
  "speedometer-outline",
  "timer-outline",
  "skull-outline",
  "heart-outline",
  "star-outline",
];

function GameRow({
  game,
  scoreA,
  scoreB,
  playerAName,
  playerBName,
  isActive,
  colors,
  onSelect,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  game: any;
  scoreA: number;
  scoreB: number;
  playerAName: string;
  playerBName: string;
  isActive: boolean;
  colors: any;
  onSelect: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <Pressable
      onPress={onSelect}
      onLongPress={() => setShowActions(true)}
      style={[
        styles.gameRow,
        {
          backgroundColor: colors.card,
          borderColor: isActive ? colors.tint : colors.border,
          borderWidth: isActive ? 2 : 1,
        },
      ]}
    >
      <View style={[styles.gameIcon, { backgroundColor: isActive ? colors.tint : colors.surface }]}>
        <Ionicons
          name={game.icon as any}
          size={22}
          color={isActive ? "#fff" : colors.textSecondary}
        />
      </View>
      <View style={styles.gameInfo}>
        <View style={styles.gameNameRow}>
          <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={1}>
            {game.name}
          </Text>
          {game.isArchived && (
            <View style={[styles.archivedBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.archivedText, { color: colors.textSecondary }]}>
                Archived
              </Text>
            </View>
          )}
        </View>
        <View style={styles.miniScore}>
          <Text style={[styles.miniScoreText, { color: colors.playerA }]}>
            {playerAName} {scoreA}
          </Text>
          <Text style={[styles.miniScoreDivider, { color: colors.textSecondary }]}>
            -
          </Text>
          <Text style={[styles.miniScoreText, { color: colors.playerB }]}>
            {scoreB} {playerBName}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => setShowActions(true)}
        hitSlop={12}
        style={styles.moreButton}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={showActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActions(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowActions(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: colors.card }]}>
            {!game.isArchived ? (
              <Pressable
                style={styles.actionItem}
                onPress={() => {
                  setShowActions(false);
                  onArchive();
                }}
              >
                <Ionicons name="archive-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.text }]}>Archive</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.actionItem}
                onPress={() => {
                  setShowActions(false);
                  onUnarchive();
                }}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.tintSecondary} />
                <Text style={[styles.actionText, { color: colors.text }]}>Unarchive</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.actionItem}
              onPress={() => {
                setShowActions(false);
                if (Platform.OS === "web") {
                  onDelete();
                } else {
                  Alert.alert(
                    "Delete Game",
                    "This will permanently delete this game and all its history. Are you sure?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: onDelete },
                    ]
                  );
                }
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.actionText, { color: "#FF6B6B" }]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

export default function GamesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const {
    data,
    addGame,
    setActiveGame,
    archiveGame,
    unarchiveGame,
    deleteGame,
    getScoreForGame,
    updatePlayer,
  } = useStorage();

  const [showAdd, setShowAdd] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(GAME_ICONS[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [player1Name, setPlayer1Name] = useState(data.players[0].name);
  const [player2Name, setPlayer2Name] = useState(data.players[1].name);

  const activeGames = data.games.filter((g) => !g.isArchived);
  const archivedGames = data.games.filter((g) => g.isArchived);

  const handleAddGame = () => {
    if (!newGameName.trim()) return;
    const game = addGame(newGameName.trim(), selectedIcon);
    setNewGameName("");
    setSelectedIcon(GAME_ICONS[0]);
    setShowAdd(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSelectGame = (gameId: string) => {
    setActiveGame(gameId);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.navigate("/(tabs)");
  };

  const handleSaveNames = () => {
    if (player1Name.trim()) updatePlayer("player_a", player1Name.trim());
    if (player2Name.trim()) updatePlayer("player_b", player2Name.trim());
    setShowSettings(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: Platform.OS === "web" ? webTopInset : insets.top }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Games</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                setPlayer1Name(data.players[0].name);
                setPlayer2Name(data.players[1].name);
                setShowSettings(true);
              }}
              hitSlop={8}
            >
              <Ionicons name="people-outline" size={24} color={colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => setShowAdd(true)} hitSlop={8}>
              <Ionicons name="add-circle" size={28} color={colors.tint} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {data.games.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="add-circle-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Create your first game
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add a game to start tracking wins
            </Text>
            <Pressable
              onPress={() => setShowAdd(true)}
              style={[styles.ctaButton, { backgroundColor: colors.tint }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.ctaText}>New Game</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {activeGames.map((game) => {
              const score = getScoreForGame(game.id);
              return (
                <GameRow
                  key={game.id}
                  game={game}
                  scoreA={score.a}
                  scoreB={score.b}
                  playerAName={data.players[0].name}
                  playerBName={data.players[1].name}
                  isActive={game.id === data.activeGameId}
                  colors={colors}
                  onSelect={() => handleSelectGame(game.id)}
                  onArchive={() => archiveGame(game.id)}
                  onUnarchive={() => unarchiveGame(game.id)}
                  onDelete={() => deleteGame(game.id)}
                />
              );
            })}
            {archivedGames.length > 0 && (
              <>
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  Archived
                </Text>
                {archivedGames.map((game) => {
                  const score = getScoreForGame(game.id);
                  return (
                    <GameRow
                      key={game.id}
                      game={game}
                      scoreA={score.a}
                      scoreB={score.b}
                      playerAName={data.players[0].name}
                      playerBName={data.players[1].name}
                      isActive={false}
                      colors={colors}
                      onSelect={() => {}}
                      onArchive={() => archiveGame(game.id)}
                      onUnarchive={() => unarchiveGame(game.id)}
                      onDelete={() => deleteGame(game.id)}
                    />
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowAdd(false)}>
            <Pressable
              style={[styles.addSheet, { backgroundColor: colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.sheetHandle}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                New Game
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
                placeholder="Game name"
                placeholderTextColor={colors.textSecondary}
                value={newGameName}
                onChangeText={setNewGameName}
                autoFocus
              />
              <Text
                style={[styles.iconLabel, { color: colors.textSecondary }]}
              >
                Choose an icon
              </Text>
              <View style={styles.iconGrid}>
                {GAME_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    onPress={() => setSelectedIcon(icon)}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor:
                          selectedIcon === icon ? colors.tint : colors.surface,
                        borderColor:
                          selectedIcon === icon ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon as any}
                      size={22}
                      color={selectedIcon === icon ? "#fff" : colors.textSecondary}
                    />
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={handleAddGame}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: newGameName.trim()
                      ? colors.tint
                      : colors.surface,
                  },
                ]}
                disabled={!newGameName.trim()}
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    { opacity: newGameName.trim() ? 1 : 0.4 },
                  ]}
                >
                  Create Game
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowSettings(false)}>
            <Pressable
              style={[styles.addSheet, { backgroundColor: colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.sheetHandle}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Player Names
              </Text>
              <View style={styles.playerInputRow}>
                <View style={[styles.playerDot, { backgroundColor: colors.playerA }]} />
                <TextInput
                  style={[
                    styles.input,
                    styles.playerInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Player 1 name"
                  placeholderTextColor={colors.textSecondary}
                  value={player1Name}
                  onChangeText={setPlayer1Name}
                />
              </View>
              <View style={styles.playerInputRow}>
                <View style={[styles.playerDot, { backgroundColor: colors.playerB }]} />
                <TextInput
                  style={[
                    styles.input,
                    styles.playerInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Player 2 name"
                  placeholderTextColor={colors.textSecondary}
                  value={player2Name}
                  onChangeText={setPlayer2Name}
                />
              </View>
              <Pressable
                onPress={handleSaveNames}
                style={[styles.saveButton, { backgroundColor: colors.tint }]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
    fontFamily: "Nunito_800ExtraBold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  gameIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  gameInfo: {
    flex: 1,
    gap: 4,
  },
  gameNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gameName: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  archivedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  archivedText: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
  },
  miniScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniScoreText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  miniScoreDivider: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  moreButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
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
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  ctaText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  addSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    alignItems: "center",
    marginBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    marginBottom: 16,
  },
  iconLabel: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 10,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },
  playerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  playerInput: {
    flex: 1,
  },
  actionSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
  },
});
