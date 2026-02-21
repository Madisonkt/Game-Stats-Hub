"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import * as plantRepo from "@/lib/repos/plantRepo";
import type { PlantState } from "@/lib/repos/plantRepo";
import { IoArrowBack, IoEllipsisVertical, IoRefresh } from "react-icons/io5";

// ── Icons ────────────────────────────────────────────────────

function WaterIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6 8.5 4 12 4 15a8 8 0 0016 0c0-3-2-6.5-8-13z"/>
      <path d="M12 12v6M9 15l3 3 3-3" strokeWidth="1.5"/>
    </svg>
  );
}

function SunIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

// ── Status text ──────────────────────────────────────────────

function statusLabel(status: PlantState["status"]): string | null {
  if (status === "needs-water") return "Thirsty 💧";
  if (status === "needs-sun") return "Needs sunshine ☀️";
  return null;
}

// ── Stage label ──────────────────────────────────────────────

const STAGE_LABELS: Record<number, string> = {
  1: "seedling",
  2: "sprouting",
  3: "growing",
  4: "blooming",
  5: "thriving",
};

// ── Main component ───────────────────────────────────────────

export default function PlantPage() {
  const router = useRouter();
  const { session } = useSession();
  const couple = session.couple;
  const currentUser = session.currentUser;

  const [plant, setPlant] = useState<PlantState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyWater, setBusyWater] = useState(false);
  const [tapAnim, setTapAnim] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [busyReset, setBusyReset] = useState(false);

  const showToast = useCallback((msg: string) => {
    setActionToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setActionToast(null), 2200);
  }, []);

  // Load + subscribe
  useEffect(() => {
    if (!couple?.id) return;
    let unsub: (() => void) | null = null;

    plantRepo.getOrCreatePlant(couple.id).then((state) => {
      setPlant(state);
      setLoading(false);
    }).catch(() => setLoading(false));

    unsub = plantRepo.subscribePlant(couple.id, (state) => {
      setPlant(state);
    });

    return () => { unsub?.(); };
  }, [couple?.id]);

  const handleWater = async () => {
    if (!couple?.id || !currentUser?.id || busyWater) return;
    setTapAnim(true);
    setTimeout(() => setTapAnim(false), 400);
    setBusyWater(true);
    // Optimistic update
    if (plant) {
      const newPts = Math.min(plantRepo.MAX_POINTS, plant.growthPoints + plantRepo.WATER_BOOST);
      setPlant({ ...plant, growthPoints: newPts, stage: plantRepo.computeStage(newPts), lastWateredAt: new Date(), status: "happy" });
    }
    try {
      const updated = await plantRepo.water(couple.id, currentUser.id);
      setPlant(updated);
      showToast("Watered 💧");
    } catch (e) {
      console.error(e);
    } finally {
      setBusyWater(false);
    }
  };

  const handleReset = async () => {
    if (!couple?.id || busyReset) return;
    setShowMenu(false);
    if (!confirm("Reset the plant back to a seedling? This can't be undone.")) return;
    setBusyReset(true);
    try {
      const updated = await plantRepo.resetPlant(couple.id);
      setPlant(updated);
      showToast("Plant reset 🌱");
    } catch (e) {
      console.error(e);
    } finally {
      setBusyReset(false);
    }
  };

  if (!currentUser || !couple) {
    return null;
  }

  const stage = plant?.stage ?? 1;
  const isDying = plant?.status === "needs-water" || plant?.status === "needs-sun";
  const imgSrc = isDying ? `/plant/anthurium-dead-${stage}.png?v=3` : `/plant/anthurium-${stage}.png?v=3`;
  const stageLabel = STAGE_LABELS[stage];
  const hint = plant ? statusLabel(plant.status) : null;

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#F8F4D1" }}
    >
      <style>{`
        @keyframes plantTap {
          0%   { transform: translateX(-50%) scale(1); }
          25%  { transform: translateX(-50%) scale(0.91); }
          60%  { transform: translateX(-50%) scale(1.06); }
          80%  { transform: translateX(-50%) scale(0.97); }
          100% { transform: translateX(-50%) scale(1); }
        }
      `}</style>
      {/* ── Header (fixed, frosted) ───────────────────── */}
      <div
        className="shrink-0 fixed top-0 inset-x-0 z-40"
        style={{
          backgroundColor: "rgba(248,244,209,0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 max-w-lg mx-auto">
          {/* Back + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-[#98989D] hover:text-[#636366] transition-colors"
            >
              <IoArrowBack style={{ fontSize: 22 }} />
            </button>
            <h1
              className="font-[family-name:var(--font-suse-mono)]"
              style={{ fontSize: 24, fontWeight: 800, color: "#292929" }}
            >
              Anthurium
            </h1>
          </div>

          {/* ⋯ menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center justify-center text-[#98989D] hover:text-[#636366] transition-colors"
              style={{ width: 36, height: 36 }}
              aria-label="More options"
            >
              <IoEllipsisVertical style={{ fontSize: 20 }} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div
                  className="absolute right-0 top-10 z-50 bg-white rounded-2xl overflow-hidden"
                  style={{ minWidth: 160, boxShadow: "0 4px 24px rgba(0,0,0,0.13)" }}
                >
                  <button
                    onClick={handleReset}
                    disabled={busyReset}
                    className="flex items-center gap-2 w-full px-4 py-3 text-left text-sm text-[#FF3B30] hover:bg-[#FFF5F5] font-[family-name:var(--font-suse)] disabled:opacity-40"
                    style={{ fontWeight: 600 }}
                  >
                    <IoRefresh style={{ fontSize: 16 }} />
                    Reset plant
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes plantTap {
          0%   { transform: translateX(-50%) scale(1); }
          25%  { transform: translateX(-50%) scale(0.91); }
          60%  { transform: translateX(-50%) scale(1.06); }
          80%  { transform: translateX(-50%) scale(0.97); }
          100% { transform: translateX(-50%) scale(1); }
        }
      `}</style>

      {/* Spacer for fixed header */}
      <div style={{ height: 64 }} />

      {/* ── Scene ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-0">

        {/* Stage + status text + progress bar — above scene */}
        <div className="flex flex-col items-center gap-1 mb-4">
          <span
            className="font-[family-name:var(--font-suse)] uppercase tracking-widest"
            style={{ fontSize: 11, fontWeight: 700, color: "#8B6E45", letterSpacing: "0.15em" }}
          >
            {stageLabel}
          </span>
          {hint && (
            <span
              className="font-[family-name:var(--font-suse)]"
              style={{ fontSize: 12, fontWeight: 500, color: "#9E7A50" }}
            >
              {hint}
            </span>
          )}
          {/* Growth bar — directly below status text */}
          {plant && (
            <div style={{ width: 140, marginTop: 6 }}>
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ height: 3, backgroundColor: "rgba(139,110,69,0.22)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, plant.growthPoints)}%`,
                    backgroundColor: "#7DC858",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          )}
          <span
            className="font-[family-name:var(--font-suse)]"
            style={{ fontSize: 13, color: "rgba(139,110,69,0.55)", marginTop: 6, letterSpacing: "0.03em" }}
          >
            tap to water
          </span>
        </div>

        {/* Table + plant — centered block */}
        <div className="relative w-full" style={{ maxWidth: 420 }}>
          {/* Table / tile background image — full image visible */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/plant/anthurium-table.png?v=3"
            alt=""
            className="w-full pointer-events-none select-none block"
            style={{ objectFit: "contain" }}
          />

          {/* Plant illustration — centered, sits on the counter surface */}
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="rounded-full border-2 border-[#7DC858] border-t-transparent animate-spin"
                style={{ width: 36, height: 36 }}
              />
            </div>
          ) : (
            <button
              onClick={handleWater}
              disabled={busyWater}
              className="absolute left-1/2 cursor-pointer select-none bg-transparent border-0 p-0"
              style={{
                transform: "translateX(-50%)",
                bottom: "38%",
                width: "68%",
                zIndex: 10,
                animation: tapAnim ? "plantTap 0.4s ease" : "none",
              }}
              aria-label="Water plant"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt={`Anthurium stage ${stage}`}
                className="w-full object-contain"
                style={{
                  transition: "opacity 0.5s ease",
                  filter: "drop-shadow(0 8px 20px rgba(60,40,10,0.22))",
                  pointerEvents: "none",
                }}
              />
            </button>
          )}
        </div>
      </div>

      {/* ── Toast ─────────────────────────────────────── */}
      {actionToast && (
        <div
          className="fixed bottom-20 left-1/2 font-[family-name:var(--font-suse)]"
          style={{
            transform: "translateX(-50%)",
            backgroundColor: "rgba(40,30,18,0.82)",
            color: "#fff",
            borderRadius: 20,
            padding: "8px 20px",
            fontSize: 14,
            fontWeight: 600,
            pointerEvents: "none",
            zIndex: 9999,
            backdropFilter: "blur(6px)",
          }}
        >
          {actionToast}
        </div>
      )}
    </div>
  );
}
