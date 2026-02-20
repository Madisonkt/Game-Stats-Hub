"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/lib/auth-context";
import * as plantRepo from "@/lib/repos/plantRepo";
import type { PlantState } from "@/lib/repos/plantRepo";
import { IoArrowBack } from "react-icons/io5";

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
  const [waterPressed, setWaterPressed] = useState(false);
  const [sunPressed, setSunPressed] = useState(false);
  const [busyWater, setBusyWater] = useState(false);
  const [busySun, setBusySun] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setWaterPressed(true);
    setTimeout(() => setWaterPressed(false), 180);
    setBusyWater(true);
    // Optimistic update
    if (plant) {
      const newPts = Math.min(plantRepo.MAX_POINTS, plant.growthPoints + plantRepo.WATER_BOOST);
      setPlant({ ...plant, growthPoints: newPts, stage: plantRepo.computeStage(newPts), lastWateredAt: new Date(), status: plantRepo.computeStage(newPts) >= 3 ? "happy" : plant.status });
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

  const handleSun = async () => {
    if (!couple?.id || !currentUser?.id || busySun) return;
    setSunPressed(true);
    setTimeout(() => setSunPressed(false), 180);
    setBusySun(true);
    if (plant) {
      const newPts = Math.min(plantRepo.MAX_POINTS, plant.growthPoints + plantRepo.SUN_BOOST);
      setPlant({ ...plant, growthPoints: newPts, stage: plantRepo.computeStage(newPts), lastSunnedAt: new Date(), status: "happy" });
    }
    try {
      const updated = await plantRepo.sun(couple.id, currentUser.id);
      setPlant(updated);
      showToast("Sunshine ☀️");
    } catch (e) {
      console.error(e);
    } finally {
      setBusySun(false);
    }
  };

  if (!currentUser || !couple) {
    return null;
  }

  const stage = plant?.stage ?? 1;
  const imgSrc = `/plant/anthurium-${stage}.png`;
  const stageLabel = STAGE_LABELS[stage];
  const hint = plant ? statusLabel(plant.status) : null;

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#F5EED8" }}
    >
      {/* ── Header ───────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-10 pb-3 max-w-lg mx-auto w-full">
        {/* Back + title */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[#3A2A18] active:opacity-60 transition-opacity"
        >
          <IoArrowBack style={{ fontSize: 20 }} />
          <span
            className="font-[family-name:var(--font-suse)]"
            style={{ fontSize: 18, fontWeight: 800, color: "#3A2A18" }}
          >
            Anthurium
          </span>
        </button>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {/* Water button */}
          <button
            onClick={handleWater}
            disabled={busyWater}
            className="flex items-center justify-center transition-all disabled:opacity-50"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: waterPressed ? "#B8D8F0" : "#D6EEF8",
              color: "#1A6FA0",
              transform: waterPressed ? "scale(0.90)" : "scale(1)",
              transition: "transform 0.15s ease, background-color 0.15s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            }}
            aria-label="Water plant"
          >
            <WaterIcon size={20} />
          </button>

          {/* Sun button */}
          <button
            onClick={handleSun}
            disabled={busySun}
            className="flex items-center justify-center transition-all disabled:opacity-50"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: sunPressed ? "#F5D870" : "#FFF0A0",
              color: "#B87800",
              transform: sunPressed ? "scale(0.90)" : "scale(1)",
              transition: "transform 0.15s ease, background-color 0.15s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            }}
            aria-label="Give sunlight"
          >
            <SunIcon size={20} />
          </button>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-6 relative">

        {/* Subtle tiled wall grid mid-section */}
        <div
          className="absolute inset-x-0"
          style={{
            top: "10%",
            height: "55%",
            backgroundImage: `
              linear-gradient(rgba(180,148,100,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(180,148,100,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
            borderTop: "1px solid rgba(180,148,100,0.15)",
            borderBottom: "1px solid rgba(180,148,100,0.12)",
          }}
        />

        {/* Plant illustration */}
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ width: 200, height: 200 }}
          >
            <div
              className="rounded-full border-2 border-[#7DC858] border-t-transparent animate-spin"
              style={{ width: 36, height: 36 }}
            />
          </div>
        ) : (
          <div
            className="relative flex items-center justify-center"
            style={{ width: 220, height: 270 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={`Anthurium stage ${stage}`}
              className="w-full h-full object-contain drop-shadow-md"
              style={{
                transition: "opacity 0.5s ease",
                filter: "drop-shadow(0 6px 18px rgba(80,60,20,0.18))",
              }}
            />
          </div>
        )}

        {/* Stage + status text */}
        <div className="mt-4 flex flex-col items-center gap-1 z-10">
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
        </div>

        {/* Growth points bar (minimal) */}
        {plant && (
          <div
            className="mt-5 z-10"
            style={{ width: 160 }}
          >
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: 4, backgroundColor: "rgba(139,110,69,0.18)" }}
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
