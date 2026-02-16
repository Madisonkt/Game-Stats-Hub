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
  ActionSheetIOS,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useTabNav } from "@/lib/tab-nav-context";
import { useStorage } from "@/lib/storage-context";
import { useSession } from "@/lib/session-context";
import { GameType } from "@/lib/types";

function GameRow({
  game,
  scoreA,
  scoreB,
  playerAName,
  playerBName,
  isActive,
  isDark,
  colors,
  onSelect,
  onArchive,
  onUnarchive,
  onReset,
  onDelete,
}: {
  game: any;
  scoreA: number;
  scoreB: number;
  playerAName: string;
  playerBName: string;
  isActive: boolean;
  isDark: boolean;
  colors: any;
  onSelect: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onReset: () => void;
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
        },
      ]}
    >
      <View style={[styles.gameIcon, { backgroundColor: isActive ? colors.tint : colors.surface }]}>
        <Ionicons
          name={game.icon as any}
          size={22}
          color={isActive ? colors.tintText : colors.textSecondary}
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
          {game.type === "timed" && (
            <View style={[styles.archivedBadge, { backgroundColor: isDark ? "rgba(255,217,61,0.15)" : "rgba(255,217,61,0.1)" }]}>
              <Ionicons name="timer-outline" size={10} color={colors.gold} />
              <Text style={[styles.archivedText, { color: colors.gold }]}>
                Timed
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
                  if (confirm("Reset this game? All scores will be set to zero. This cannot be undone.")) {
                    onReset();
                  }
                } else {
                  Alert.alert(
                    "Reset Game",
                    "All scores will be set to zero. This cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Reset", style: "destructive", onPress: onReset },
                    ]
                  );
                }
              }}
            >
              <Ionicons name="refresh-outline" size={20} color="#FF922B" />
              <Text style={[styles.actionText, { color: "#FF922B" }]}>Reset Scores</Text>
            </Pressable>
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
    resetGame,
    getScoreForGame,
    updatePlayer,
    updatePlayerAvatar,
  } = useStorage();

  const [showAdd, setShowAdd] = useState(false);
  const [newGameName, setNewGameName] = useState("");

  const [selectedType, setSelectedType] = useState<GameType>("simple");
  const [showSettings, setShowSettings] = useState(false);
  const [showLoveNote, setShowLoveNote] = useState(false);
  const [player1Name, setPlayer1Name] = useState(data.players[0].name);
  const [player2Name, setPlayer2Name] = useState(data.players[1].name);

  const activeGames = data.games.filter((g) => !g.isArchived);
  const archivedGames = data.games.filter((g) => g.isArchived);

  const handleAddGame = () => {
    if (!newGameName.trim()) return;
    const icon = selectedType === "timed" ? "cube-outline" : "game-controller-outline";
    const game = addGame(newGameName.trim(), icon, selectedType);
    setNewGameName("");
    setSelectedType("simple");
    setShowAdd(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const { goToTab } = useTabNav();
  const { exitRoom, signOut } = useSession();

  const handleSelectGame = (gameId: string) => {
    setActiveGame(gameId);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    goToTab(0);
  };

  const handleSaveNames = () => {
    if (player1Name.trim()) updatePlayer("player_a", player1Name.trim());
    if (player2Name.trim()) updatePlayer("player_b", player2Name.trim());
    setShowSettings(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const pickPhoto = async (playerId: string, useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Camera access is required to take a photo.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
          updatePlayerAvatar(playerId, result.assets[0].uri);
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
          updatePlayerAvatar(playerId, result.assets[0].uri);
        }
      }
    } catch (e) {
      console.error("Photo pick error:", e);
    }
  };

  const showPhotoOptions = (playerId: string) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickPhoto(playerId, true);
          else if (buttonIndex === 2) pickPhoto(playerId, false);
        }
      );
    } else {
      Alert.alert("Set Photo", "Choose an option", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: () => pickPhoto(playerId, true) },
        { text: "Choose from Library", onPress: () => pickPhoto(playerId, false) },
      ]);
    }
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: Platform.OS === "web" ? webTopInset : insets.top }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Games</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => setShowLoveNote(true)} hitSlop={8}>
              <Ionicons name="heart" size={22} color={colors.tint} />
            </Pressable>
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
              <Ionicons name="add" size={20} color={colors.tintText} />
              <Text style={[styles.ctaText, { color: colors.tintText }]}>New Game</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Valentine's Day Card */}
            <Pressable
              onPress={() => setShowLoveNote(true)}
              style={[styles.vdayCard, { backgroundColor: '#1A6FA0' }]}
            >
              <Image
                source={require("../../assets/images/splash-vday.png")}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              <View style={styles.vdayOverlay}>
                <View style={styles.vdayRow}>
                  <Ionicons name="heart" size={20} color="#fff" />
                  <Text style={styles.vdayTitle}>Happy Valentine's Day</Text>
                </View>
                <Text style={styles.vdaySubtitle}>Tap to read</Text>
              </View>
            </Pressable>

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
                  isDark={isDark}
                  colors={colors}
                  onSelect={() => handleSelectGame(game.id)}
                  onArchive={() => archiveGame(game.id)}
                  onUnarchive={() => unarchiveGame(game.id)}
                  onReset={() => resetGame(game.id)}
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
                      isDark={isDark}
                      colors={colors}
                      onSelect={() => {}}
                      onArchive={() => archiveGame(game.id)}
                      onUnarchive={() => unarchiveGame(game.id)}
                      onReset={() => resetGame(game.id)}
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
          keyboardVerticalOffset={0}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowAdd(false)}>
            <Pressable
              style={[styles.addSheet, { backgroundColor: colors.card, maxHeight: '85%' }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.sheetHandle}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
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

              {/* Quick preset */}
              <Pressable
                onPress={() => {
                  setNewGameName("Rubik's Cube");
                  setSelectedType("timed");
                }}
                style={[styles.presetButton, {
                  backgroundColor: isDark ? colors.background : colors.card,
                }]}
              >
                <Ionicons name="cube-outline" size={18} color={colors.text} />
                <Text style={[styles.presetButtonText, { color: colors.text }]}>
                  Quick Add: Rubik's Cube (Timed)
                </Text>
              </Pressable>

              {/* Game type toggle */}
              <Text style={[styles.iconLabel, { color: colors.textSecondary }]}>
                Game type
              </Text>
              <View style={styles.typeRow}>
                <Pressable
                  onPress={() => setSelectedType("simple")}
                  style={[
                    styles.typeOption,
                    {
                      backgroundColor: selectedType === "simple" ? colors.tint : colors.surface,
                      borderColor: selectedType === "simple" ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Ionicons name="trophy-outline" size={16} color={selectedType === "simple" ? colors.tintText : colors.textSecondary} />
                  <Text style={[styles.typeOptionText, { color: selectedType === "simple" ? colors.tintText : colors.text }]}>
                    Simple (Tap to Win)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedType("timed")}
                  style={[
                    styles.typeOption,
                    {
                      backgroundColor: selectedType === "timed" ? colors.tint : colors.surface,
                      borderColor: selectedType === "timed" ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Ionicons name="timer-outline" size={16} color={selectedType === "timed" ? colors.tintText : colors.textSecondary} />
                  <Text style={[styles.typeOptionText, { color: selectedType === "timed" ? colors.tintText : colors.text }]}>
                    Timed (Stopwatch)
                  </Text>
                </Pressable>
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
                    { opacity: newGameName.trim() ? 1 : 0.4, color: colors.tintText },
                  ]}
                >
                  Create Game
                </Text>
              </Pressable>
              </ScrollView>
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
                Players
              </Text>
              <View style={styles.playerSettingsRow}>
                <Pressable
                  onPress={() => showPhotoOptions("player_a")}
                  style={[styles.playerAvatarPicker, { borderColor: colors.playerA }]}
                >
                  {data.players[0].avatarUri ? (
                    <Image
                      source={{ uri: data.players[0].avatarUri }}
                      style={styles.playerAvatarImg}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.playerAvatarPlaceholder, { backgroundColor: colors.playerA }]}>
                      <Text style={styles.playerAvatarInitial}>{data.players[0].initial}</Text>
                    </View>
                  )}
                  <View style={[styles.cameraIconBadge, { backgroundColor: colors.playerA }]}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                </Pressable>
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
              <View style={styles.playerSettingsRow}>
                <Pressable
                  onPress={() => showPhotoOptions("player_b")}
                  style={[styles.playerAvatarPicker, { borderColor: colors.playerB }]}
                >
                  {data.players[1].avatarUri ? (
                    <Image
                      source={{ uri: data.players[1].avatarUri }}
                      style={styles.playerAvatarImg}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.playerAvatarPlaceholder, { backgroundColor: colors.playerB }]}>
                      <Text style={styles.playerAvatarInitial}>{data.players[1].initial}</Text>
                    </View>
                  )}
                  <View style={[styles.cameraIconBadge, { backgroundColor: colors.playerB }]}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                </Pressable>
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
                <Text style={[styles.saveButtonText, { color: colors.tintText }]}>Save</Text>
              </Pressable>

              {/* Exit Room */}
              <Pressable
                onPress={() => {
                  const doExit = () => {
                    setShowSettings(false);
                    exitRoom();
                  };
                  if (Platform.OS === "web") {
                    if (confirm("Exit room? You'll keep your identity but leave the current room.")) {
                      doExit();
                    }
                  } else {
                    Alert.alert(
                      "Exit Room",
                      "You'll keep your identity but leave the current room. You can create or join a new room afterwards.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Exit", style: "destructive", onPress: doExit },
                      ]
                    );
                  }
                }}
                style={[styles.exitRoomBtn]}
              >
                <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
                <Text style={styles.exitRoomBtnText}>Exit Room</Text>
              </Pressable>

              {/* Sign Out */}
              <Pressable
                onPress={() => {
                  const doSignOut = () => {
                    setShowSettings(false);
                    signOut();
                  };
                  if (Platform.OS === "web") {
                    if (confirm("Sign out? You'll need to sign in again with your email.")) {
                      doSignOut();
                    }
                  } else {
                    Alert.alert(
                      "Sign Out",
                      "You'll need to sign in again with your email.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Sign Out", style: "destructive", onPress: doSignOut },
                      ]
                    );
                  }
                }}
                style={[styles.signOutBtn]}
              >
                <Ionicons name="power-outline" size={18} color="#999" />
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showLoveNote} transparent animationType="fade" onRequestClose={() => setShowLoveNote(false)}>
        <Pressable style={[styles.modalOverlay, { justifyContent: 'center' }]} onPress={() => setShowLoveNote(false)}>
          <Pressable style={[styles.loveNoteCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Pressable onPress={() => setShowLoveNote(false)} style={styles.loveNoteClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'stretch', gap: 16, paddingBottom: 8 }}>
              <Text style={[styles.loveNoteText, { color: colors.text }]}>
                hello sir{"\n"}happy valentines day{"\n\n"}congrats on not being shawty-lesss this year.{"\n"}I feel very lucky to have found someone who makes me smile as much as you do.{"\n\n"}thank you for opening up to me these past months, I feel like I've learned so much about how your mind works, what your goals and fears are and I dont take that for granted. I appreciate you trusting me with this and want you to know that I am your biggest fan. You're capable of doing amazing things and I hope you can lean on me when you need to. Im consistently inspired by your drive, self conviction and creativity. You push me, challenge me, and support me and Im very grateful to be growing alongside u. Even though we may not always see eye to eye, getting to understand you more deeply has been an infinitely rewarding experience.
              </Text>
            </ScrollView>
          </Pressable>
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
    paddingHorizontal: 16,
    gap: 10,
  },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
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
    fontFamily: "NunitoSans_700Bold",
  },
  archivedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  archivedText: {
    fontSize: 10,
    fontFamily: "NunitoSans_600SemiBold",
  },
  miniScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniScoreText: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
  },
  miniScoreDivider: {
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
  },
  moreButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "NunitoSans_700Bold",
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
    fontFamily: "NunitoSans_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
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
    fontFamily: "NunitoSans_700Bold",
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
    fontFamily: "NunitoSans_800ExtraBold",
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "NunitoSans_400Regular",
    fontSize: 16,
    marginBottom: 16,
  },
  iconLabel: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: 10,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 20,
  },
  iconOption: {
    width: '15%',
    aspectRatio: 1,
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
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
  },
  playerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playerSettingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  playerAvatarPicker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  playerAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  playerAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  playerAvatarInitial: {
    fontSize: 22,
    fontFamily: "NunitoSans_800ExtraBold",
    color: "#fff",
  },
  cameraIconBadge: {
    position: "absolute" as const,
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
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
    fontFamily: "NunitoSans_600SemiBold",
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  presetButtonText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeOptionText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
  },
  loveNoteCard: {
    marginHorizontal: 32,
    borderRadius: 18,
    padding: 28,
    paddingTop: 20,
    maxHeight: '80%',
    alignItems: "center" as const,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  loveNoteClose: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  loveNoteEmoji: {
    fontSize: 48,
  },
  loveNoteText: {
    fontSize: 16,
    fontFamily: "SUSE_400Regular",
    textAlign: "left" as const,
    lineHeight: 24,
  },
  loveNoteBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 4,
    alignSelf: "center" as const,
  },
  loveNoteBtnText: {
    color: "#fff",
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
  },
  vdayCard: {
    borderRadius: 18,
    overflow: "hidden" as const,
    height: 140,
    marginBottom: 12,
  },
  vdayOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  vdayRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  vdayTitle: {
    color: "#fff",
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
  },
  vdaySubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "NunitoSans_400Regular",
    fontSize: 13,
    marginTop: 4,
    marginLeft: 28,
  },
  exitRoomBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  exitRoomBtnText: {
    color: "#FF6B6B",
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
  },
  signOutBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
  },
  signOutBtnText: {
    color: "#999",
    fontFamily: "NunitoSans_400Regular",
    fontSize: 13,
  },
});
