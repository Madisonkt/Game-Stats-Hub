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
  // Spread items across a grid-like pattern but with randomness
  const cols = 3;
  const col = index % cols;
  const row = Math.floor(index / cols);
  // Base position from grid, then add jitter
  const baseX = (col / cols) * 70 + 5; // 5-75% range
  const baseY = row * 130 + 20; // vertical spacing
  const jitterX = ((s % 20) - 10); // ±10%
  const jitterY = ((s >> 4) % 30) - 15; // ±15px
  const rotation = ((s >> 8) % 16) - 8; // -8 to +8 deg
  const scale = 0.85 + ((s >> 12) % 20) / 100; // 0.85 - 1.04

  return {
    x: Math.max(2, Math.min(68, baseX + jitterX)),
    y: baseY + jitterY,
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
  const { x, y, rotation, scale } = placement(item.id, index, total);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPopped(true), 60 * index);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <button
      onClick={onClick}
      className="absolute"
      style={{
        left: `${x}%`,
        top: y,
        width: 100,
        height: 100,
        transform: popped
          ? `rotate(${rotation}deg) scale(${scale})`
          : `rotate(${rotation + 10}deg) scale(0)`,
        opacity: popped ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease-out",
        transformOrigin: "center center",
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: item.doodleSvg }}
        className="w-full h-full"
      />
      {item.caption && (
        <p
          className="text-[#98989D] font-[family-name:var(--font-nunito)] text-center truncate mt-0.5"
          style={{ fontSize: 9, fontWeight: 600 }}
        >
          {item.caption}
        </p>
      )}
      {item.linkUrl && (
        <span style={{ fontSize: 10, position: "absolute", top: 2, right: 2 }}>🔗</span>
      )}
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
                  window.open(item.linkUrl!, "_blank", "noopener,noreferrer");
                }
              }}
              className="flex items-center gap-1.5 text-[#3A7BD5] font-[family-name:var(--font-nunito)] mb-2 hover:underline"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              🔗 {(() => { try { return new URL(item.linkUrl).hostname; } catch { return item.linkUrl; } })()}
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
    <div className="min-h-screen bg-[#F3F0EA] dark:bg-[#0A0A0C]">
      {/* Header — fixed */}
      <div className="fixed top-0 inset-x-0 z-40 bg-[#F3F0EA]/80 dark:bg-[#0A0A0C]/80 backdrop-blur-lg">
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
              className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
              style={{ fontSize: 24, fontWeight: 800 }}
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

      {/* Garden canvas — grid paper with scattered doodles */}
      <div className="px-2 pb-8 max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#E8A0BF] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span style={{ fontSize: 48, opacity: 0.3 }}>🌱</span>
            <p
              className="text-[#98989D] font-[family-name:var(--font-nunito)] text-center"
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
          <div
            className="relative w-full"
            style={{
              minHeight: Math.ceil(items.length / 3) * 130 + 100,
              borderRadius: 16,
            }}
          >
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
