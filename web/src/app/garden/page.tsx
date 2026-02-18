"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import {
  listGardenItems,
  subscribeGardenItems,
  getGardenPhotoUrl,
  deleteGardenItem,
  type GardenItem,
} from "@/lib/repos/gardenRepo";
import { IoAdd, IoClose, IoArrowBack } from "react-icons/io5";

// ── Deterministic position from id ──────────────────────────
function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function placement(id: string, index: number, total: number) {
  const s = seedFromId(id);
  const cols = Math.min(total, 4);
  const col = index % cols;
  const row = Math.floor(index / cols);

  // SVG is 800×1280. Moss surface is at y≈730 → that is (1280-730)/1280 ≈ 43% from the BOTTOM.
  // We use CSS `bottom` so the doodle's base is anchored TO the moss surface.
  // Row 0 base = 40% from bottom (slightly embedded so it looks planted, not floating).
  // Each extra row adds ~12% (≈ one doodle height).
  const MOSS_BOTTOM_PCT = 40;
  const ROW_STEP_PCT = 12;
  const bottomPct = MOSS_BOTTOM_PCT + row * ROW_STEP_PCT;

  // Center-based horizontal spread (left% refers to the doodle center via translateX(-50%))
  const baseLeft = cols === 1 ? 50 : 15 + (col / Math.max(cols - 1, 1)) * 68;
  const jitterX = ((s % 16) - 8);
  // Only jitter downward (0 to -4%) so doodles never float above the moss
  const jitterY = -((s >> 4) % 5);
  const rotation = ((s >> 8) % 16) - 8;
  const scale = 0.85 + ((s >> 12) % 20) / 100;

  return {
    leftPercent: Math.max(8, Math.min(88, baseLeft + jitterX)),
    bottomPercent: bottomPct + jitterY,
    rotation,
    scale,
  };
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Doodle on the canvas ────────────────────────────────────

function DoodleSprite({
  item,
  index,
  total,
  onClick,
}: {
  item: GardenItem;
  index: number;
  total: number;
  onClick: () => void;
}) {
  const { leftPercent, bottomPercent, rotation, scale } = placement(item.id, index, total);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPopped(true), 60 * index);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        left: `${leftPercent}%`,
        bottom: `${bottomPercent}%`,
        width: 70,
        height: 70,
        // translateX(-50%) so leftPercent is the doodle's CENTER, not its left edge
        transform: popped
          ? `translateX(-50%) rotate(${rotation}deg) scale(${scale})`
          : `translateX(-50%) rotate(${rotation + 10}deg) scale(0)`,
        opacity: popped ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease-out",
        transformOrigin: "bottom center",
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: item.doodleSvg }}
        className="w-full h-full"
      />
    </button>
  );
}

// ── Detail Modal ────────────────────────────────────────────

function DetailModal({
  item,
  memberName,
  onClose,
  onDelete,
  canDelete,
}: {
  item: GardenItem;
  memberName: string;
  onClose: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const photoUrl = item.photoPath ? getGardenPhotoUrl(item.photoPath) : null;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-colors duration-250"
      style={{ backgroundColor: visible ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0)" }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm bg-[#F3F0EA] dark:bg-[#0A0A0C] overflow-hidden transition-all duration-250"
        style={{
          borderRadius: 20,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.9) translateY(20px)",
          opacity: visible ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 flex items-center justify-center
            bg-black/30 backdrop-blur-sm text-white active:scale-95"
          style={{ width: 32, height: 32, borderRadius: 16 }}
        >
          <IoClose style={{ fontSize: 18 }} />
        </button>

        {/* Photo (if exists) */}
        {photoUrl && (
          <div className="relative" style={{ aspectRatio: "1" }}>
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Doodle preview (if no photo) */}
        {!photoUrl && (
          <div
            className="bg-white dark:bg-[#1A1A1C]"
            style={{ aspectRatio: "1", padding: 16 }}
            dangerouslySetInnerHTML={{ __html: item.doodleSvg }}
          />
        )}

        {/* Info */}
        <div className="p-4">
          {item.caption && (
            <p
              className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)] mb-2"
              style={{ fontSize: 16, fontWeight: 700 }}
            >
              {item.caption}
            </p>
          )}

          {/* Link */}
          {item.linkUrl && (
            <button
              onClick={() => {
                if (confirm("Open this link in a new tab?")) {
                  let url = item.linkUrl!;
                  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
                  window.open(url, "_blank", "noopener,noreferrer");
                }
              }}
              className="flex items-center gap-1.5 text-[#3A7BD5] font-[family-name:var(--font-nunito)] mb-2 hover:underline"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              🔗 {(() => { try { return new URL(item.linkUrl.startsWith("http") ? item.linkUrl : "https://" + item.linkUrl).hostname; } catch { return item.linkUrl; } })()}
            </button>
          )}

          <p
            className="text-[#98989D] font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            Created by {memberName} · {formatDate(item.createdAt)}
          </p>

          {canDelete && (
            <button
              onClick={onDelete}
              className="mt-3 text-red-500 font-[family-name:var(--font-nunito)] text-sm font-semibold hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Garden Page ────────────────────────────────────────

export default function GardenPage() {
  const router = useRouter();
  const { session } = useSession();
  const couple = session.couple;
  const currentUser = session.currentUser;

  const [items, setItems] = useState<GardenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GardenItem | null>(null);

  const coupleId = couple?.id;
  const members = couple?.members ?? [];

  // Load items
  useEffect(() => {
    if (!coupleId) { setLoading(false); return; }
    listGardenItems(coupleId).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [coupleId]);

  // Realtime subscription
  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeGardenItems(coupleId, setItems);
    return () => unsub();
  }, [coupleId]);

  const getMemberName = useCallback(
    (userId: string) => {
      const m = members.find((m) => m.id === userId);
      return m?.name || "Someone";
    },
    [members]
  );

  const handleDelete = async (item: GardenItem) => {
    if (!confirm("Delete this memory?")) return;
    try {
      await deleteGardenItem(item.id, item.photoPath);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelected(null);
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  if (!couple || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F3F0EA] dark:bg-[#0A0A0C]">
        <p className="text-[#98989D] font-[family-name:var(--font-nunito)]">Not signed in</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF7" }}>
      {/* Header — fixed */}
      <div className="fixed top-0 inset-x-0 z-40" style={{ backgroundColor: "rgba(250,250,247,0.8)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/games")}
            className="text-[#98989D] hover:text-[#636366] transition-colors"
          >
            <IoArrowBack style={{ fontSize: 22 }} />
          </button>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 22 }}>🌱</span>
            <h1
              className="font-[family-name:var(--font-nunito)]"
              style={{ fontSize: 24, fontWeight: 800, color: "#1C1C1E" }}
            >
              Garden
            </h1>
          </div>
        </div>
        <button
          onClick={() => router.push("/garden/new")}
          className="flex items-center gap-1 bg-[#E8A0BF] text-white font-[family-name:var(--font-nunito)]
            active:scale-[0.95] transition-all"
          style={{ borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 700 }}
        >
          <IoAdd style={{ fontSize: 16 }} />
          New
        </button>
      </div>
      </div>

      {/* Spacer for fixed header */}
      <div style={{ height: 64 }} />

      {/* Garden — moss with sprouting doodles */}
      <div className="px-2 pb-8 max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#E8A0BF] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            {/* Moss base — empty state */}
            <img
              src="/images/moss-garden.png"
              alt=""
              className="w-3/4 max-w-xs"
              style={{ opacity: 0.7 }}
            />
            <p
              className="text-[#98989D] font-[family-name:var(--font-nunito)] text-center -mt-2"
              style={{ fontSize: 15, fontWeight: 600 }}
            >
              Your garden is empty
            </p>
            <p
              className="text-[#98989D] font-[family-name:var(--font-nunito)] text-center px-8"
              style={{ fontSize: 13 }}
            >
              Tap &quot;New&quot; to plant your first doodle
            </p>
          </div>
        ) : (
          // Doodles overlaid ON the moss image via absolute positioning inside a relative container
          <div style={{ position: "relative", width: "100%", maxWidth: 448, margin: "0 auto" }}>
            <img
              src="/images/garden-moss-vector.svg"
              alt=""
              style={{ width: "100%", display: "block" }}
            />
            {items.map((item, i) => (
              <DoodleSprite
                key={item.id}
                item={item}
                index={i}
                total={items.length}
                onClick={() => setSelected(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          item={selected}
          memberName={getMemberName(selected.createdBy)}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected)}
          canDelete={selected.createdBy === currentUser.id}
        />
      )}
    </div>
  );
}
