"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/lib/auth-context";
import { useGames } from "@/lib/game-context";
import type { Game, GameType } from "@/lib/models";
import * as gameRepoMod from "@/lib/repos/gameRepo";
import { getCoupleForUser, updateMember } from "@/lib/repos/coupleRepo";
import {
  IoLogOutOutline,
  IoExitOutline,
  IoCopyOutline,
  IoCheckmark,
  IoHeart,
  IoPeople,
  IoEllipsisVertical,
  IoCamera,
  IoSave,
  IoTimerOutline,
  IoLockClosedOutline,
  IoAddCircle,
  IoGameControllerOutline,
  IoTrashOutline,
  IoArchiveOutline,
  IoRefresh,
  IoNotificationsOutline,
} from "react-icons/io5";
import { isPushSupported, subscribeToPush, getPushPermission } from "@/lib/push";

const GRADIENT_A = "linear-gradient(160deg, #F5D5C8, #F0B89E, #E8956E, #E07850, #D4628A)";
const GRADIENT_B = "linear-gradient(160deg, #A8C8F0, #88BDE8, #6CB4EE, #7DD4D4, #90DBC8)";

function getPlayerColor(index: number): string {
  return index === 0 ? "#D4628A" : "#3A7BD5";
}

function getPlayerGradient(index: number): string {
  return index === 0 ? GRADIENT_A : GRADIENT_B;
}

// ── Game Row ────────────────────────────────────────────────

function GameRow({
  game,
  isActive,
  couple,
  onSelect,
  onArchive,
  onUnarchive,
  onReset,
  onDelete,
}: {
  game: Game;
  isActive: boolean;
  couple: { members: { id: string; name: string; avatarUrl?: string }[] };
  onSelect: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!couple) return;
    gameRepoMod
      .getGameScores(game.coupleId, game.id)
      .then(setScores)
      .catch(() => {});
  }, [game.coupleId, game.id, couple]);

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        className={`flex items-center gap-3 w-full text-left bg-[#ECE7DE] dark:bg-[#1A1A1C] mb-2 active:scale-[0.98] transition-all ${
          isActive ? "ring-2 ring-[#3A7BD5] dark:ring-white" : ""
        }`}
        style={{ borderRadius: 18, padding: 14 }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: isActive
              ? "rgba(58,123,213,0.15)"
              : "rgba(150,150,150,0.1)",
          }}
        >
          {game.type === "timed" ? (
            <IoTimerOutline
              className={isActive ? "text-[#3A7BD5] dark:text-white" : "text-[#98989D]"}
              style={{ fontSize: 22 }}
            />
          ) : (
            <IoGameControllerOutline
              className={isActive ? "text-[#3A7BD5] dark:text-white" : "text-[#98989D]"}
              style={{ fontSize: 22 }}
            />
          )}
        </div>

        {/* Name + badges */}
        <div className="flex-1 flex flex-col min-w-0">
          <span
            className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] truncate"
            style={{ fontSize: 16, fontWeight: 700 }}
          >
            {game.name}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            {game.isArchived && (
              <span
                className="text-[#98989D] font-[family-name:var(--font-nunito)]"
                style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(150,150,150,0.1)", paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 6 }}
              >
                Archived
              </span>
            )}
            {game.type === "timed" && (
              <span
                className="flex items-center gap-0.5 font-[family-name:var(--font-nunito)]"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#A56B5C",
                  backgroundColor: "rgba(255,217,61,0.1)",
                  paddingLeft: 6,
                  paddingRight: 6,
                  paddingTop: 2,
                  paddingBottom: 2,
                  borderRadius: 6,
                }}
              >
                <IoTimerOutline style={{ fontSize: 10 }} />
                Timed
              </span>
            )}
          </div>
        </div>

        {/* Mini score */}
        {couple.members.length >= 2 && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {couple.members.map((m, i) => (
              <div key={m.id} className="flex items-center gap-1">
                <div
                  className="flex items-center justify-center text-white"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: getPlayerColor(i),
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    m.name?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>
                <span
                  className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
                  style={{ fontSize: 12, fontWeight: 700 }}
                >
                  {scores[m.id] ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions toggle */}
        <div
          className="text-[#98989D] p-1 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
        >
          <IoEllipsisVertical style={{ fontSize: 18 }} />
        </div>
      </button>

      {/* Action menu */}
      {showActions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
          <div
            className="absolute right-2 top-12 z-50 bg-white dark:bg-[#1A1A1C] shadow-lg border border-[#ECE7DE] dark:border-[#2A2A2C] flex flex-col py-1"
            style={{ borderRadius: 12, minWidth: 160 }}
          >
            {game.isArchived ? (
              <button
                onClick={() => { onUnarchive(); setShowActions(false); }}
                className="flex items-center gap-2 px-4 py-2.5 text-left text-sm text-[#0A0A0C] dark:text-[#F3F0EA] hover:bg-[#ECE7DE] dark:hover:bg-[#2A2A2C] font-[family-name:var(--font-nunito)]"
              >
                <IoArchiveOutline style={{ fontSize: 16 }} />
                Unarchive
              </button>
            ) : (
              <button
                onClick={() => { onArchive(); setShowActions(false); }}
                className="flex items-center gap-2 px-4 py-2.5 text-left text-sm text-[#0A0A0C] dark:text-[#F3F0EA] hover:bg-[#ECE7DE] dark:hover:bg-[#2A2A2C] font-[family-name:var(--font-nunito)]"
              >
                <IoArchiveOutline style={{ fontSize: 16 }} />
                Archive
              </button>
            )}
            <button
              onClick={() => { onReset(); setShowActions(false); }}
              className="flex items-center gap-2 px-4 py-2.5 text-left text-sm text-[#FF9500] hover:bg-[#ECE7DE] dark:hover:bg-[#2A2A2C] font-[family-name:var(--font-nunito)]"
            >
              <IoRefresh style={{ fontSize: 16 }} />
              Reset Scores
            </button>
            <button
              onClick={() => { onDelete(); setShowActions(false); }}
              className="flex items-center gap-2 px-4 py-2.5 text-left text-sm text-[#FF3B30] hover:bg-[#ECE7DE] dark:hover:bg-[#2A2A2C] font-[family-name:var(--font-nunito)]"
            >
              <IoTrashOutline style={{ fontSize: 16 }} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Games Page ─────────────────────────────────────────

export default function GamesPage() {
  const { session, exitRoom, signOut, setCurrentUser, setCouple } = useSession();
  const { games, activeGame, setActiveGameId, refreshGames } = useGames();
  const couple = session.couple;
  const currentUser = session.currentUser;

  const [codeCopied, setCodeCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [exitingRoom, setExitingRoom] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"signout" | "exit" | null>(null);
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);
  const [showLoveNote, setShowLoveNote] = useState(false);
  const [loveNoteVisible, setLoveNoteVisible] = useState(false);

  const openLoveNote = () => {
    setShowLoveNote(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setLoveNoteVisible(true)));
  };
  const closeLoveNote = () => {
    setLoveNoteVisible(false);
    setTimeout(() => setShowLoveNote(false), 400);
  };
  const [showAddGame, setShowAddGame] = useState(false);

  // Add game state
  const [newGameName, setNewGameName] = useState("");
  const [selectedType, setSelectedType] = useState<GameType>("simple");
  const [addingGame, setAddingGame] = useState(false);

  // Player settings state
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | undefined>();
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGames = games.filter((g) => !g.isArchived);
  const archivedGames = games.filter((g) => g.isArchived);

  // ── Handlers ──────────────────────────────────────────────

  const handleAddGame = async () => {
    if (!newGameName.trim() || !couple?.id) return;
    setAddingGame(true);
    try {
      const icon = selectedType === "timed" ? "timer-outline" : "game-controller-outline";
      const game = await gameRepoMod.createGame(couple.id, newGameName.trim(), icon, selectedType);
      setActiveGameId(game.id);
      await refreshGames();
      setNewGameName("");
      setSelectedType("simple");
      setShowAddGame(false);
    } catch (e) {
      console.error("Failed to create game:", e);
    } finally {
      setAddingGame(false);
    }
  };

  const handleSelectGame = (gameId: string) => {
    setActiveGameId(gameId);
  };

  const handleArchive = async (gameId: string) => {
    await gameRepoMod.archiveGame(gameId);
    await refreshGames();
  };

  const handleUnarchive = async (gameId: string) => {
    await gameRepoMod.unarchiveGame(gameId);
    await refreshGames();
  };

  const handleReset = async (gameId: string) => {
    if (!couple?.id) return;
    if (!confirm("Reset all scores for this game? This cannot be undone.")) return;
    await gameRepoMod.resetGame(couple.id, gameId);
    await refreshGames();
  };

  const handleDelete = async (gameId: string) => {
    if (!couple?.id) return;
    if (!confirm("Delete this game and all its data? This cannot be undone.")) return;
    await gameRepoMod.resetGame(couple.id, gameId);
    await gameRepoMod.deleteGame(gameId);
    await refreshGames();
  };

  const handleCopyCode = async () => {
    if (!couple?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(couple.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = couple.inviteCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleExitRoom = async () => {
    setExitingRoom(true);
    try {
      await exitRoom();
      window.location.href = "/onboarding";
    } catch (e) {
      console.error("Failed to exit room:", e);
    } finally {
      setExitingRoom(false);
      setShowConfirm(null);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      window.location.href = "/login";
    } catch (e) {
      console.error("Failed to sign out:", e);
    } finally {
      setSigningOut(false);
      setShowConfirm(null);
    }
  };

  const handleOpenPlayerSettings = () => {
    setEditName(currentUser?.name || "");
    setEditAvatarUrl(currentUser?.avatarUrl);
    setShowPlayerSettings(true);
  };

  const handleSavePlayer = async () => {
    if (!currentUser || !couple) return;
    const newName = editName || currentUser.name;
    const newAvatar = editAvatarUrl;
    setCurrentUser({ ...currentUser, name: newName, avatarUrl: newAvatar });
    try {
      await updateMember(couple.id, currentUser.id, { displayName: newName, avatarUrl: newAvatar ?? null });
      const updated = await getCoupleForUser(currentUser.id);
      if (updated) setCouple(updated);
    } catch (e) {
      console.error("Failed to save profile:", e);
    }
    setShowPlayerSettings(false);
  };

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 200;
        let w = img.width;
        let h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        setEditAvatarUrl(canvas.toDataURL("image/jpeg", 0.7));
      };
    };
    reader.readAsDataURL(file);
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <p className="text-sm text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-nunito)]">
          Not signed in
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-5 pt-4 pb-4 max-w-lg mx-auto">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
          style={{ fontSize: 28, fontWeight: 800 }}
        >
          Games
        </h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowAddGame(true)} className="text-[#3A7BD5] dark:text-white">
            <IoAddCircle style={{ fontSize: 28 }} />
          </button>
          <button onClick={() => openLoveNote()} className="text-[#3A7BD5] dark:text-white">
            <IoHeart style={{ fontSize: 22 }} />
          </button>
          <button onClick={handleOpenPlayerSettings} className="text-[#3A7BD5] dark:text-white">
            <IoPeople style={{ fontSize: 24 }} />
          </button>
        </div>
      </div>

      {/* ── Game List ───────────────────────────────── */}
      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <IoGameControllerOutline className="text-[#98989D]" style={{ fontSize: 64 }} />
          <p className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]" style={{ fontSize: 18, fontWeight: 700 }}>
            Create your first game
          </p>
          <p className="text-[#98989D] font-[family-name:var(--font-nunito)] text-center" style={{ fontSize: 14 }}>
            Add a game to start tracking wins
          </p>
          <button
            onClick={() => setShowAddGame(true)}
            className="flex items-center gap-2 bg-[#3A7BD5] dark:bg-white text-white dark:text-[#0A0A0C]
              font-[family-name:var(--font-nunito)] active:scale-[0.98] transition-all"
            style={{ borderRadius: 14, padding: "12px 24px", fontSize: 15, fontWeight: 700 }}
          >
            <IoAddCircle style={{ fontSize: 20 }} />
            New Game
          </button>
        </div>
      ) : (
        <>
          {/* Active games */}
          {activeGames.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              isActive={activeGame?.id === game.id}
              couple={couple!}
              onSelect={() => handleSelectGame(game.id)}
              onArchive={() => handleArchive(game.id)}
              onUnarchive={() => handleUnarchive(game.id)}
              onReset={() => handleReset(game.id)}
              onDelete={() => handleDelete(game.id)}
            />
          ))}

          {/* Archived section */}
          {archivedGames.length > 0 && (
            <>
              <p
                className="text-[#98989D] font-[family-name:var(--font-nunito)] mt-4 mb-2"
                style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2 }}
              >
                Archived
              </p>
              {archivedGames.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  isActive={false}
                  couple={couple!}
                  onSelect={() => {}}
                  onArchive={() => handleArchive(game.id)}
                  onUnarchive={() => handleUnarchive(game.id)}
                  onReset={() => handleReset(game.id)}
                  onDelete={() => handleDelete(game.id)}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* ── Valentine's Day Card ─────────────────────── */}
      <button
        onClick={() => openLoveNote()}
        className="w-full relative overflow-hidden active:scale-[0.98] transition-all mt-4"
        style={{ borderRadius: 18, height: 140, backgroundColor: "#1A6FA0" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/splash-vday-small.jpg"
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 flex flex-col justify-end"
          style={{ padding: 16, backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          <div className="flex items-center gap-2">
            <IoHeart style={{ fontSize: 20, color: "#fff" }} />
            <span
              className="text-white font-[family-name:var(--font-nunito)]"
              style={{ fontSize: 18, fontWeight: 800 }}
            >
              Happy Valentine&apos;s Day
            </span>
          </div>
        </div>
      </button>

      {/* ── Invite Code ─────────────────────────────── */}
      {couple && (
        <div
          className="flex items-center gap-3 bg-[#ECE7DE] dark:bg-[#1A1A1C] mt-4 mb-6"
          style={{ borderRadius: 18, padding: 14 }}
        >
          <div className="flex flex-col flex-1 min-w-0">
            <span
              className="text-[#98989D] font-[family-name:var(--font-nunito)]"
              style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2 }}
            >
              Invite Code
            </span>
            <span
              className="text-[#0A0A0C] dark:text-[#F3F0EA] font-mono tracking-widest"
              style={{ fontSize: 20, fontWeight: 800 }}
            >
              {couple.inviteCode}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 text-[#3A7BD5] dark:text-white hover:text-[#2C5F9E] dark:hover:text-[#ECE7DE] transition-colors font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            {codeCopied ? (<><IoCheckmark className="text-green-500" /> Copied</>) : (<><IoCopyOutline /> Copy</>)}
          </button>
        </div>
      )}

      {/* ── Actions ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 mt-auto">        {isPushSupported() && getPushPermission() !== "granted" && couple && (
          <button
            onClick={async () => {
              if (currentUser && couple) {
                const ok = await subscribeToPush(currentUser.id, couple.id);
                if (ok) {
                  alert("Notifications enabled! You'll be notified when your partner starts a round.");
                } else {
                  alert("Couldn't enable notifications. Make sure you tap Allow when prompted.");
                }
              }
            }}
            className="flex items-center justify-center gap-2 w-full font-[family-name:var(--font-nunito)]
              active:scale-[0.98] transition-all"
            style={{ borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 700, color: "#3A7BD5", backgroundColor: "rgba(58,123,213,0.08)" }}
          >
            <IoNotificationsOutline style={{ fontSize: 20 }} />
            Enable Notifications
          </button>
        )}        {couple && (
          <button
            onClick={() => setShowConfirm("exit")}
            disabled={exitingRoom}
            className="flex items-center justify-center gap-2 w-full font-[family-name:var(--font-nunito)]
              active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 700, color: "#FF6B6B", backgroundColor: "rgba(255,107,107,0.08)" }}
          >
            <IoExitOutline style={{ fontSize: 20 }} />
            Exit Room
          </button>
        )}
        <button
          onClick={() => setShowConfirm("signout")}
          disabled={signingOut}
          className="flex items-center justify-center gap-2 w-full font-[family-name:var(--font-nunito)]
            active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 600, color: "#999" }}
        >
          <IoLogOutOutline style={{ fontSize: 20 }} />
          Sign Out
        </button>
      </div>

      {/* ── Add Game Modal ──────────────────────────── */}
      {showAddGame && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center modal-backdrop"
          onClick={() => setShowAddGame(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-[#F3F0EA] dark:bg-[#0A0A0C] safe-area-bottom modal-content"
            style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#98989D]/40 rounded-full mx-auto mb-6" />
            <h2
              className="text-center text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] mb-6"
              style={{ fontSize: 20, fontWeight: 800 }}
            >
              New Game
            </h2>

            {/* Name input */}
            <input
              type="text"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              placeholder="Game name"
              autoFocus
              className="w-full px-4 py-3 bg-[#ECE7DE] dark:bg-[#1A1A1C] text-[#0A0A0C] dark:text-[#F3F0EA]
                placeholder:text-[#98989D] font-[family-name:var(--font-nunito)] outline-none mb-4"
              style={{ borderRadius: 14, fontSize: 16, fontWeight: 600 }}
            />

            {/* Quick preset */}
            <button
              onClick={() => { setNewGameName("Rubik's Cube"); setSelectedType("timed"); }}
              className="flex items-center gap-2 w-full px-4 py-3 bg-[#ECE7DE] dark:bg-[#1A1A1C]
                text-[#0A0A0C] dark:text-[#F3F0EA] active:scale-[0.98] transition-all mb-4 font-[family-name:var(--font-nunito)]"
              style={{ borderRadius: 14, fontSize: 14, fontWeight: 600 }}
            >
              <IoTimerOutline style={{ fontSize: 18 }} />
              Quick Add: Rubik&apos;s Cube (Timed)
            </button>

            {/* Type selector */}
            <p
              className="text-[#98989D] font-[family-name:var(--font-nunito)] mb-2"
              style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}
            >
              Game Type
            </p>
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setSelectedType("simple")}
                className={`flex-1 flex flex-col items-center gap-2 py-4 transition-all active:scale-[0.98] ${
                  selectedType === "simple"
                    ? "ring-2 ring-[#3A7BD5] dark:ring-white bg-[#3A7BD5]/10 dark:bg-white/10"
                    : "bg-[#ECE7DE] dark:bg-[#1A1A1C]"
                }`}
                style={{ borderRadius: 14 }}
              >
                <IoGameControllerOutline
                  className={selectedType === "simple" ? "text-[#3A7BD5] dark:text-white" : "text-[#98989D]"}
                  style={{ fontSize: 24 }}
                />
                <span
                  className={`font-[family-name:var(--font-nunito)] ${
                    selectedType === "simple" ? "text-[#3A7BD5] dark:text-white" : "text-[#98989D]"
                  }`}
                  style={{ fontSize: 13, fontWeight: 700 }}
                >
                  Simple
                </span>
                <span className="text-[#98989D] font-[family-name:var(--font-nunito)]" style={{ fontSize: 10 }}>
                  Tap to win
                </span>
              </button>
              <button
                onClick={() => setSelectedType("timed")}
                className={`flex-1 flex flex-col items-center gap-2 py-4 transition-all active:scale-[0.98] ${
                  selectedType === "timed"
                    ? "ring-2 ring-[#3A7BD5] dark:ring-white bg-[#3A7BD5]/10 dark:bg-white/10"
                    : "bg-[#ECE7DE] dark:bg-[#1A1A1C]"
                }`}
                style={{ borderRadius: 14 }}
              >
                <IoTimerOutline
                  className={selectedType === "timed" ? "text-[#3A7BD5] dark:text-white" : "text-[#98989D]"}
                  style={{ fontSize: 24 }}
                />
                <span
                  className={`font-[family-name:var(--font-nunito)] ${
                    selectedType === "timed" ? "text-[#3A7BD5] dark:text-white" : "text-[#98989D]"
                  }`}
                  style={{ fontSize: 13, fontWeight: 700 }}
                >
                  Timed
                </span>
                <span className="text-[#98989D] font-[family-name:var(--font-nunito)]" style={{ fontSize: 10 }}>
                  Best time wins
                </span>
              </button>
            </div>

            {/* Create button */}
            <button
              onClick={handleAddGame}
              disabled={!newGameName.trim() || addingGame}
              className="flex items-center justify-center gap-2 w-full text-white dark:text-[#0A0A0C] font-[family-name:var(--font-nunito)]
                bg-[#3A7BD5] dark:bg-white hover:bg-[#2C5F9E] dark:hover:bg-[#ECE7DE]
                active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderRadius: 14, padding: 14, fontSize: 16, fontWeight: 700 }}
            >
              {addingGame ? "Creating..." : "Create Game"}
            </button>
          </div>
        </div>
      )}

      {/* ── Player Settings Modal ───────────────────── */}
      {showPlayerSettings && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center modal-backdrop"
          onClick={() => setShowPlayerSettings(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-[#F3F0EA] dark:bg-[#0A0A0C] safe-area-bottom modal-content"
            style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#98989D]/40 rounded-full mx-auto mb-6" />
            <h2
              className="text-center text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] mb-6"
              style={{ fontSize: 20, fontWeight: 800 }}
            >
              Player Settings
            </h2>

            {/* Avatar picker */}
            <div className="flex justify-center mb-6">
              <button onClick={() => fileInputRef.current?.click()} className="relative">
                <div
                  className="flex items-center justify-center overflow-hidden"
                  style={{
                    width: 56, height: 56, borderRadius: 28,
                    background: getPlayerGradient(couple?.members.findIndex((m) => m.id === currentUser.id) ?? 0),
                  }}
                >
                  {editAvatarUrl ? (
                    <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-white text-xl font-bold font-[family-name:var(--font-nunito)]">
                      {editName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 bg-[#3A7BD5] dark:bg-white flex items-center justify-center"
                  style={{ width: 22, height: 22, borderRadius: 11 }}
                >
                  <IoCamera className="text-white dark:text-[#0A0A0C]" style={{ fontSize: 12 }} />
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
            </div>

            {/* Name input */}
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 bg-[#ECE7DE] dark:bg-[#1A1A1C] text-[#0A0A0C] dark:text-[#F3F0EA]
                font-[family-name:var(--font-nunito)] outline-none mb-4"
              style={{ borderRadius: 14, fontSize: 16, fontWeight: 600 }}
            />

            {/* Save */}
            <button
              onClick={handleSavePlayer}
              className="flex items-center justify-center gap-2 w-full text-white dark:text-[#0A0A0C] font-[family-name:var(--font-nunito)]
                bg-[#3A7BD5] dark:bg-white hover:bg-[#2C5F9E] dark:hover:bg-[#ECE7DE] active:scale-[0.98] transition-all"
              style={{ borderRadius: 14, padding: 14, fontSize: 16, fontWeight: 700 }}
            >
              <IoSave style={{ fontSize: 18 }} />
              Save
            </button>

            {/* Set Password */}
            <div className="w-full mt-5 pt-5" style={{ borderTop: "1px solid rgba(150,150,150,0.2)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#636366] dark:text-[#98989D] mb-2 font-[family-name:var(--font-nunito)]">
                Set / Update Password
              </p>
              <input
                type="password"
                placeholder="New password (6+ chars)"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordMsg(null); }}
                className="w-full px-4 py-3 bg-[#ECE7DE] dark:bg-[#1A1A1C] text-[#0A0A0C] dark:text-[#F3F0EA]
                  placeholder:text-[#636366] dark:placeholder:text-[#98989D]
                  font-[family-name:var(--font-nunito)] outline-none mb-2"
                style={{ borderRadius: 14, fontSize: 15, fontWeight: 600 }}
              />
              {passwordMsg && (
                <p className={`text-sm font-semibold mb-2 font-[family-name:var(--font-nunito)] ${passwordMsg.type === "ok" ? "text-green-500" : "text-red-500"}`}>
                  {passwordMsg.text}
                </p>
              )}
              <button
                onClick={async () => {
                  if (newPassword.length < 6) { setPasswordMsg({ type: "err", text: "Password must be at least 6 characters" }); return; }
                  setSavingPassword(true);
                  setPasswordMsg(null);
                  try {
                    const supabase = (await import("@/lib/supabase/browser")).createSupabaseBrowserClient();
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                    setNewPassword("");
                    setPasswordMsg({ type: "ok", text: "Password saved!" });
                  } catch (e: unknown) {
                    setPasswordMsg({ type: "err", text: e instanceof Error ? e.message : "Failed to set password" });
                  } finally { setSavingPassword(false); }
                }}
                disabled={savingPassword || !newPassword}
                className="flex items-center justify-center gap-2 w-full font-[family-name:var(--font-nunito)]
                  text-[#3A7BD5] dark:text-white border border-[#3A7BD5] dark:border-white
                  hover:bg-[#3A7BD5]/10 dark:hover:bg-white/10 active:scale-[0.98] transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: 14, padding: 12, fontSize: 15, fontWeight: 700 }}
              >
                <IoLockClosedOutline style={{ fontSize: 16 }} />
                {savingPassword ? "Saving..." : "Set Password"}
              </button>
            </div>

            {/* Close */}
            <button
              onClick={() => setShowPlayerSettings(false)}
              className="flex items-center justify-center gap-2 w-full mt-4 font-[family-name:var(--font-nunito)]
                active:scale-[0.98] transition-all bg-[#ECE7DE] dark:bg-[#1A1A1C]
                text-[#0A0A0C] dark:text-[#F3F0EA]"
              style={{ borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 700 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Valentine's Day Note ─ Full-screen slide-up sheet ── */}
      {showLoveNote && createPortal(
        <div
          className="fixed inset-0 bg-[#F3F0EA] dark:bg-[#0A0A0C] overflow-y-auto"
          style={{
            zIndex: 99999,
            transform: loveNoteVisible ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
            willChange: "transform",
          }}
        >
          {/* X close button */}
          <button
            onClick={closeLoveNote}
            className="fixed top-4 right-4 flex items-center justify-center
              bg-[#ECE7DE] dark:bg-[#1A1A1C] hover:bg-[#D6D1C8] dark:hover:bg-[#2A2A2C]
              transition-colors active:scale-95"
            style={{ zIndex: 100000, width: 36, height: 36, borderRadius: 18 }}
          >
            <span className="text-[#0A0A0C] dark:text-[#F3F0EA]" style={{ fontSize: 18, lineHeight: 1 }}>&times;</span>
          </button>

          {/* Content */}
          <div className="flex flex-col items-center px-8 pt-16 pb-16 min-h-full justify-center">
            <div className="max-w-sm w-full">
              <p
                className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] whitespace-pre-line leading-relaxed"
                style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.8 }}
              >
                hello sir{"\n"}happy valentines day{"\n"}{"\n"}congrats on not being shawty-lesss this year.{"\n"}I feel very lucky to have found someone who makes me smile as much as you do.{"\n"}{"\n"}thank you for opening up to me these past months, I feel like I&apos;ve learned so much about how your mind works, what your goals and fears are and I dont take that for granted. I appreciate you trusting me with this and want you to know that I am your biggest fan. You&apos;re capable of doing amazing things and I hope you can lean on me when you need to. Im consistently inspired by your drive, self conviction and creativity. You push me, challenge me, and support me and Im very grateful to be growing alongside u. Even though we may not always see eye to eye, getting to understand you more deeply has been an infinitely rewarding experience. love madison {"<3"}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Confirmation dialog ─────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 modal-backdrop">
          <div className="w-full max-w-sm bg-white dark:bg-[#0A0A0C] shadow-xl flex flex-col gap-4 modal-content" style={{ borderRadius: 20, padding: 24 }}>
            <h3 className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]" style={{ fontSize: 18, fontWeight: 800 }}>
              {showConfirm === "signout" ? "Sign out?" : "Leave room?"}
            </h3>
            <p className="text-sm text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-nunito)]">
              {showConfirm === "signout"
                ? "You'll need to sign in again with your email."
                : "You'll leave this room and your partner will be alone. You can re-join with the invite code."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)} className="flex-1 py-3 text-sm font-semibold text-[#0A0A0C] dark:text-[#F3F0EA] bg-[#ECE7DE] dark:bg-[#1A1A1C] hover:opacity-80 transition-all font-[family-name:var(--font-nunito)]" style={{ borderRadius: 12 }}>Cancel</button>
              <button
                onClick={showConfirm === "signout" ? handleSignOut : handleExitRoom}
                disabled={signingOut || exitingRoom}
                className="flex-1 py-3 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50 font-[family-name:var(--font-nunito)]"
                style={{ borderRadius: 12 }}
              >
                {showConfirm === "signout" ? (signingOut ? "Signing out..." : "Sign Out") : (exitingRoom ? "Leaving..." : "Leave Room")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
