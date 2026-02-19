"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import {
  listGardenItems,
  subscribeGardenItems,
  getGardenPhotoUrl,
  deleteGardenItem,
  type GardenItem,
} from "@/lib/repos/gardenRepo";
import { IoAdd, IoClose, IoArrowBack, IoGrid, IoLeaf } from "react-icons/io5";

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

  // Spread doodles across the fishtank interior.
  // Tank water area is roughly 10%–85% horizontally, 18%–62% from bottom.
  const baseLeft = total === 1 ? 50 : 12 + (index / Math.max(total - 1, 1)) * 72;
  const jitterX = ((s % 14) - 7);
  // Scatter vertically throughout the tank water area
  const TANK_BOTTOM = 20;  // bottom of water area (% from bottom of image)
  const TANK_TOP = 60;     // top of water area (% from bottom of image)
  const verticalRange = TANK_TOP - TANK_BOTTOM;
  const baseBottom = TANK_BOTTOM + ((s >> 4) % 100) / 100 * verticalRange;
  const rotation = ((s >> 8) % 16) - 8;
  const scale = 0.75 + ((s >> 12) % 25) / 100;

  return {
    leftPercent: Math.max(10, Math.min(86, baseLeft + jitterX)),
    bottomPercent: baseBottom,
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

// ── Grid View ───────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function groupByYearMonth(items: GardenItem[]): { label: string; year: number; month: number; items: GardenItem[] }[] {
  // Sort items newest first — use photoTakenAt for photos, createdAt otherwise
  const dateOf = (item: GardenItem) => item.photoTakenAt ?? item.createdAt;
  const sorted = [...items].sort((a, b) => dateOf(b) - dateOf(a));

  const groups = new Map<string, { year: number; month: number; items: GardenItem[] }>();

  for (const item of sorted) {
    const d = new Date(dateOf(item));
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month}`;
    if (!groups.has(key)) {
      groups.set(key, { year, month, items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  // Already in order since we iterate sorted items
  return Array.from(groups.entries()).map(([, g]) => ({
    label: `${MONTH_NAMES[g.month]} ${g.year}`,
    year: g.year,
    month: g.month,
    items: g.items,
  }));
}

function GridView({
  items,
  onSelect,
}: {
  items: GardenItem[];
  onSelect: (item: GardenItem) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState(0);
  const PAD = 6;

  useEffect(() => {
    if (!gridRef.current) return;
    const ro = new ResizeObserver(([e]) => setCellPx(e.contentRect.width / 4));
    ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, []);

  const groups = groupByYearMonth(items);

  // Build flat list of cells: separator labels + doodles + empty padding cells
  // Separators span 4 columns. After each group's doodles, pad to fill the row.
  type Cell =
    | { type: "label"; label: string; key: string }
    | { type: "doodle"; item: GardenItem }
    | { type: "empty"; key: string };

  const cells: Cell[] = [];
  groups.forEach((group) => {
    cells.push({ type: "label", label: group.label, key: `label-${group.year}-${group.month}` });
    group.items.forEach((item) => cells.push({ type: "doodle", item }));
    // Pad remaining cells in the last row so the next label starts on a fresh row
    const remainder = group.items.length % 4;
    if (remainder > 0) {
      for (let i = 0; i < 4 - remainder; i++) {
        cells.push({ type: "empty", key: `pad-${group.year}-${group.month}-${i}` });
      }
    }
  });

  // Add extra empty rows to fill the screen
  const MIN_EMPTY_ROWS = 8;
  for (let r = 0; r < MIN_EMPTY_ROWS; r++) {
    for (let c = 0; c < 4; c++) {
      cells.push({ type: "empty", key: `fill-${r}-${c}` });
    }
  }

  return (
    <div
      ref={gridRef}
      className="grid min-h-screen"
      style={{
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0,
        padding: PAD,
        backgroundColor: "#FAFAF7",
        ...(cellPx > 0
          ? {
              backgroundImage:
                "radial-gradient(circle, #D9D9D9 3px, transparent 3px)",
              backgroundSize: `${cellPx}px ${cellPx}px`,
              backgroundPosition: `${PAD - cellPx / 2}px ${PAD - cellPx / 2}px`,
            }
          : {}),
      }}
    >
      {cells.map((cell) => {
        if (cell.type === "label") {
          return (
            <div
              key={cell.key}
              className="font-[family-name:var(--font-suse-mono)] flex items-center"
              style={{
                gridColumn: "1 / -1",
                height: cellPx || "auto",
                paddingLeft: 8,
                fontSize: 13,
                fontWeight: 700,
                color: "#408052",
              }}
            >
              {cell.label}
            </div>
          );
        }
        if (cell.type === "doodle") {
          return (
            <button
              key={cell.item.id}
              onClick={() => onSelect(cell.item)}
              className="active:scale-[0.9] transition-transform overflow-hidden"
              style={{ aspectRatio: "1", padding: "14%" }}
            >
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: cell.item.doodleSvg }}
              />
            </button>
          );
        }
        return <div key={cell.key} style={{ aspectRatio: "1" }} />;
      })}
    </div>
  );
}

function GridDoodle({
  item,
  onClick,
}: {
  item: GardenItem;
  onClick: () => void;
}) {
  const photoUrl = item.photoPath ? getGardenPhotoUrl(item.photoPath) : null;

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden active:scale-[0.95] transition-transform"
      style={{
        aspectRatio: "1",
        borderRadius: 12,
        backgroundColor: "#FBF9F4",
        border: "1.5px solid rgba(0,0,0,0.04)",
      }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="w-full h-full p-2"
          dangerouslySetInnerHTML={{ __html: item.doodleSvg }}
        />
      )}
      {/* Link indicator */}
      {item.linkUrl && (
        <div
          className="absolute bottom-1 right-1 flex items-center justify-center"
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: "rgba(58,123,213,0.85)",
            fontSize: 9,
          }}
        >
          <span>🔗</span>
        </div>
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
              className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)] mb-2"
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
              className="flex items-center gap-1.5 text-[#3A7BD5] font-[family-name:var(--font-suse)] mb-2 hover:underline"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              🔗 {(() => { try { return new URL(item.linkUrl.startsWith("http") ? item.linkUrl : "https://" + item.linkUrl).hostname; } catch { return item.linkUrl; } })()}
            </button>
          )}

          <p
            className="text-[#98989D] font-[family-name:var(--font-suse)]"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            Created by {memberName} · {formatDate(item.createdAt)}
          </p>

          {canDelete && (
            <button
              onClick={onDelete}
              className="mt-3 text-red-500 font-[family-name:var(--font-suse)] text-sm font-semibold hover:underline"
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
  const [view, setView] = useState<"moss" | "grid">("moss");

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
        <p className="text-[#98989D] font-[family-name:var(--font-suse)]">Not signed in</p>
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
            <h1
              className="font-[family-name:var(--font-suse-mono)]"
              style={{ fontSize: 24, fontWeight: 800, color: "#408052" }}
            >
              Aquarium
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex items-center overflow-hidden"
            style={{ borderRadius: 10, backgroundColor: "rgba(0,0,0,0.06)" }}
          >
            <button
              onClick={() => setView("moss")}
              className="flex items-center justify-center transition-all"
              style={{
                width: 34, height: 30,
                borderRadius: 10,
                backgroundColor: view === "moss" ? "#fff" : "transparent",
                boxShadow: view === "moss" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <IoLeaf style={{ fontSize: 15, color: view === "moss" ? "#4CAF50" : "#98989D" }} />
            </button>
            <button
              onClick={() => setView("grid")}
              className="flex items-center justify-center transition-all"
              style={{
                width: 34, height: 30,
                borderRadius: 10,
                backgroundColor: view === "grid" ? "#fff" : "transparent",
                boxShadow: view === "grid" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <IoGrid style={{ fontSize: 14, color: view === "grid" ? "#3A7BD5" : "#98989D" }} />
            </button>
          </div>
          <button
            onClick={() => router.push("/garden/new")}
            className="flex items-center gap-1 font-[family-name:var(--font-suse-mono)]
              active:scale-[0.95] transition-all"
            style={{
              borderRadius: 0,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: "#408052",
              border: "2px solid #408052",
              backgroundColor: "transparent",
            }}
          >
            + new fish
          </button>
        </div>
      </div>
      </div>

      {/* Spacer for fixed header */}
      <div style={{ height: 64 }} />

      {/* Garden — moss with sprouting doodles */}
      <div className={`pb-8 ${view === "grid" ? "max-w-lg mx-auto" : ""}`}>
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
              className="text-[#98989D] font-[family-name:var(--font-suse)] text-center -mt-2"
              style={{ fontSize: 15, fontWeight: 600 }}
            >
              Your garden is empty
            </p>
            <p
              className="text-[#98989D] font-[family-name:var(--font-suse)] text-center px-8"
              style={{ fontSize: 13 }}
            >
              Tap &quot;New&quot; to plant your first doodle
            </p>
          </div>
        ) : view === "moss" ? (
          // Doodles overlaid ON the moss image
          <div
            style={{
              position: "relative",
              width: "100%",
            }}
          >
            <img
              src="/images/fishtank.svg"
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
        ) : (
          // Grid view — doodles organized by date
          <GridView items={items} onSelect={setSelected} />
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
