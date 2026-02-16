"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "@/lib/auth-context";
import { getPartnerUser } from "@/lib/models";
import { getCoupleForUser } from "@/lib/repos/coupleRepo";
import {
  IoLogOutOutline,
  IoExitOutline,
  IoCopyOutline,
  IoCheckmark,
  IoHeart,
  IoPeople,
  IoAddCircle,
  IoEllipsisVertical,
  IoCamera,
  IoSave,
  IoTimerOutline,
} from "react-icons/io5";

const GRADIENT_A = "linear-gradient(160deg, #F5D5C8, #F0B89E, #E8956E, #E07850, #D4628A)";
const GRADIENT_B = "linear-gradient(160deg, #A8C8F0, #88BDE8, #6CB4EE, #7DD4D4, #90DBC8)";

function getPlayerColor(index: number): string {
  return index === 0 ? "#D4628A" : "#3A7BD5";
}

function getPlayerGradient(index: number): string {
  return index === 0 ? GRADIENT_A : GRADIENT_B;
}

export default function GamesPage() {
  const { session, exitRoom, signOut, setCurrentUser, setCouple } = useSession();
  const couple = session.couple;
  const currentUser = session.currentUser;

  const [codeCopied, setCodeCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [exitingRoom, setExitingRoom] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"signout" | "exit" | null>(null);
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);

  // ── Poll every 3s to pick up couple/member changes ────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const poll = async () => {
      try {
        const updatedCouple = await getCoupleForUser(currentUser.id);
        if (updatedCouple) setCouple(updatedCouple);
      } catch {
        // Silently ignore polling errors
      }
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [currentUser?.id, setCouple]);
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSavePlayer = () => {
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        name: editName || currentUser.name,
        avatarUrl: editAvatarUrl,
      });
    }
    setShowPlayerSettings(false);
  };

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditAvatarUrl(reader.result as string);
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
          <button className="text-[#3A7BD5]"><IoHeart style={{ fontSize: 22 }} /></button>
          <button onClick={handleOpenPlayerSettings} className="text-[#3A7BD5]"><IoPeople style={{ fontSize: 24 }} /></button>
        </div>
      </div>

      {/* ── Game Row: Rubik's Cube ───────────────────── */}
      <div
        className="flex items-center gap-3 bg-[#ECE7DE] dark:bg-[#1A1A1C] mb-3"
        style={{ borderRadius: 18, padding: 14 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: "rgba(58,123,213,0.15)",
          }}
        >
          <span style={{ fontSize: 22 }}><IoTimerOutline className="text-[#3A7BD5]" /></span>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <span
            className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] truncate"
            style={{ fontSize: 16, fontWeight: 700 }}
          >
            Rubik&apos;s Cube
          </span>
          <div className="flex items-center gap-2 mt-0.5">
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
          </div>
        </div>

        {/* Mini score */}
        {couple && couple.members.length >= 2 && (
          <div className="flex items-center gap-1.5">
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
              </div>
            ))}
          </div>
        )}

        <button className="text-[#98989D] p-1">
          <IoEllipsisVertical style={{ fontSize: 18 }} />
        </button>
      </div>

      {/* ── Invite Code ─────────────────────────────── */}
      {couple && (
        <div
          className="flex items-center gap-3 bg-[#ECE7DE] dark:bg-[#1A1A1C] mb-6"
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
            className="flex items-center gap-1 text-[#3A7BD5] hover:text-[#2C5F9E] transition-colors font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            {codeCopied ? (
              <>
                <IoCheckmark className="text-green-500" />
                Copied
              </>
            ) : (
              <>
                <IoCopyOutline />
                Copy
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Actions ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 mt-auto">
        {couple && (
          <button
            onClick={() => setShowConfirm("exit")}
            disabled={exitingRoom}
            className="flex items-center justify-center gap-2 w-full font-[family-name:var(--font-nunito)]
              active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderRadius: 16,
              padding: 14,
              fontSize: 15,
              fontWeight: 700,
              color: "#FF6B6B",
              backgroundColor: "rgba(255,107,107,0.08)",
            }}
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
          style={{
            borderRadius: 16,
            padding: 14,
            fontSize: 15,
            fontWeight: 600,
            color: "#999",
          }}
        >
          <IoLogOutOutline style={{ fontSize: 20 }} />
          Sign Out
        </button>
      </div>

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
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative"
              >
                <div
                  className="flex items-center justify-center overflow-hidden"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: getPlayerGradient(
                      couple?.members.findIndex((m) => m.id === currentUser.id) ?? 0
                    ),
                  }}
                >
                  {editAvatarUrl ? (
                    <img
                      src={editAvatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-white text-xl font-bold font-[family-name:var(--font-nunito)]">
                      {editName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 bg-[#3A7BD5] flex items-center justify-center"
                  style={{ width: 22, height: 22, borderRadius: 11 }}
                >
                  <IoCamera className="text-white" style={{ fontSize: 12 }} />
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
              />
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

            {/* Save button */}
            <button
              onClick={handleSavePlayer}
              className="flex items-center justify-center gap-2 w-full text-white font-[family-name:var(--font-nunito)]
                bg-[#3A7BD5] hover:bg-[#2C5F9E] active:scale-[0.98] transition-all"
              style={{ borderRadius: 14, padding: 14, fontSize: 16, fontWeight: 700 }}
            >
              <IoSave style={{ fontSize: 18 }} />
              Save
            </button>

            {/* Exit Room */}
            {couple && (
              <button
                onClick={() => { setShowPlayerSettings(false); setShowConfirm("exit"); }}
                className="flex items-center justify-center gap-2 w-full mt-4 font-[family-name:var(--font-nunito)]
                  active:scale-[0.98] transition-all"
                style={{ borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 700, color: "#FF6B6B" }}
              >
                <IoExitOutline style={{ fontSize: 18 }} />
                Exit Room
              </button>
            )}

            {/* Sign Out */}
            <button
              onClick={() => { setShowPlayerSettings(false); setShowConfirm("signout"); }}
              className="flex items-center justify-center gap-2 w-full mt-2 font-[family-name:var(--font-nunito)]
                active:scale-[0.98] transition-all"
              style={{ borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 600, color: "#999" }}
            >
              <IoLogOutOutline style={{ fontSize: 18 }} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmation dialog ─────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 modal-backdrop">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#0A0A0C] shadow-xl flex flex-col gap-4 modal-content"
            style={{ borderRadius: 20, padding: 24 }}
          >
            <h3
              className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
              style={{ fontSize: 18, fontWeight: 800 }}
            >
              {showConfirm === "signout" ? "Sign out?" : "Leave room?"}
            </h3>
            <p className="text-sm text-[#636366] dark:text-[#98989D] font-[family-name:var(--font-nunito)]">
              {showConfirm === "signout"
                ? "You'll need to sign in again with your email."
                : "You'll leave this room and your partner will be alone. You can re-join with the invite code."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 text-sm font-semibold text-[#0A0A0C] dark:text-[#F3F0EA]
                  bg-[#ECE7DE] dark:bg-[#1A1A1C] hover:opacity-80 transition-all
                  font-[family-name:var(--font-nunito)]"
                style={{ borderRadius: 12 }}
              >
                Cancel
              </button>
              <button
                onClick={showConfirm === "signout" ? handleSignOut : handleExitRoom}
                disabled={signingOut || exitingRoom}
                className="flex-1 py-3 text-sm font-semibold text-white
                  bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50
                  font-[family-name:var(--font-nunito)]"
                style={{ borderRadius: 12 }}
              >
                {showConfirm === "signout"
                  ? signingOut ? "Signing out..." : "Sign Out"
                  : exitingRoom ? "Leaving..." : "Leave Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
