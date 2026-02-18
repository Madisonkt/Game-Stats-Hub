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
import { IoAdd, IoClose, IoLeaf, IoArrowBack } from "react-icons/io5";

// ── Deterministic jitter from id ────────────────────────────
function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return h;
}

function jitter(id: string) {
  const s = seedFromId(id);
  const rotation = ((s % 9) - 4); // -4 to +4 deg
  const scale = 0.94 + ((Math.abs(s >> 4) % 12) / 100); // 0.94 - 1.05
  const ty = ((s >> 8) % 7) - 3; // -3 to +3 px
  return { rotation, scale, ty };
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

// ── Tile ────────────────────────────────────────────────────

function GardenTile({
  item,
  onClick,
}: {
  item: GardenItem;
  onClick: () => void;
}) {
  const { rotation, scale, ty } = jitter(item.id);
  const photoUrl = getGardenPhotoUrl(item.photoPath);

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden card-press bg-[#ECE7DE] dark:bg-[#1A1A1C]"
      style={{
        borderRadius: 16,
        aspectRatio: "1",
        transform: `rotate(${rotation}deg) scale(${scale}) translateY(${ty}px)`,
      }}
    >
      {/* Photo background */}
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Doodle overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        dangerouslySetInnerHTML={{ __html: item.doodleSvg }}
        style={{ opacity: 0.85 }}
      />

      {/* Bottom gradient + caption */}
      {item.caption && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
          <p
            className="absolute bottom-2 left-2 right-2 text-white font-[family-name:var(--font-nunito)] truncate"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            {item.caption}
          </p>
        </>
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
  const photoUrl = getGardenPhotoUrl(item.photoPath);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-[#F3F0EA] dark:bg-[#0A0A0C] overflow-hidden"
        style={{ borderRadius: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex items-center justify-center
            bg-black/30 backdrop-blur-sm text-white active:scale-95"
          style={{ width: 32, height: 32, borderRadius: 16 }}
        >
          <IoClose style={{ fontSize: 18 }} />
        </button>

        {/* Photo */}
        <div className="relative" style={{ aspectRatio: "1" }}>
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0 pointer-events-none"
            dangerouslySetInnerHTML={{ __html: item.doodleSvg }}
            style={{ opacity: 0.8 }}
          />
        </div>

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
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/games")}
            className="text-[#98989D] hover:text-[#636366] transition-colors"
          >
            <IoArrowBack style={{ fontSize: 22 }} />
          </button>
          <div className="flex items-center gap-2">
            <IoLeaf className="text-[#E8A0BF]" style={{ fontSize: 22 }} />
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

      {/* Garden grid */}
      <div className="px-4 pb-8 max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#E8A0BF] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <IoLeaf className="text-[#E8A0BF]/30" style={{ fontSize: 48 }} />
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
              Tap &quot;New&quot; to plant your first memory
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <GardenTile
                key={item.id}
                item={item}
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
