"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import { createGardenItem } from "@/lib/repos/gardenRepo";
import { extractPhotoDate } from "@/lib/exif-date";
import { IoArrowBack, IoArrowUndo, IoTrash, IoImage } from "react-icons/io5";

const COLORS = ["#3A7BD5", "#F5C842", "#F4724A", "#B57BCC"];
const CANVAS_SIZE = 300;
const STROKE_WIDTH = 6;

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string };

export default function NewDoodlePage() {
  const router = useRouter();
  const { session } = useSession();
  const couple = session.couple;
  const currentUser = session.currentUser;

  const canvasRef = useRef<HTMLDivElement>(null);
  // Use a ref to hold ALL stroke data (committed + in-progress) to avoid async state issues
  const committedStrokes = useRef<Stroke[]>([]);
  const activeStroke = useRef<Point[]>([]);
  const activeColor = useRef(COLORS[0]);
  const isDrawingRef = useRef(false);
  const [inkColor, setInkColor] = useState(COLORS[0]);
  const [renderKey, setRenderKey] = useState(0); // bump to re-render
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const forceRender = () => setRenderKey((k) => k + 1);

  const getPointerPos = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    activeColor.current = inkColor;
    activeStroke.current = [getPointerPos(e)];
    forceRender();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    activeStroke.current.push(getPointerPos(e));
    forceRender();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;
    if (activeStroke.current.length > 1) {
      committedStrokes.current = [...committedStrokes.current, { points: [...activeStroke.current], color: activeColor.current }];
    }
    activeStroke.current = [];
    forceRender();
  };

  const handleUndo = () => {
    committedStrokes.current = committedStrokes.current.slice(0, -1);
    forceRender();
  };

  const handleClear = () => {
    committedStrokes.current = [];
    forceRender();
  };

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Build SVG string from strokes
  const buildSvg = useCallback(
    (strokes: Stroke[]): string => {
      const paths = strokes
        .filter((s) => s.points.length > 1)
        .map((stroke) => {
          const d = stroke.points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(" ");
          return `<path d="${d}" stroke="${stroke.color}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        })
        .join("");
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" width="100%" height="100%">${paths}</svg>`;
    },
    []
  );

  // All strokes to render (committed + in-progress)
  const allStrokes: Stroke[] = activeStroke.current.length > 0
    ? [...committedStrokes.current, { points: activeStroke.current, color: activeColor.current }]
    : committedStrokes.current;

  const handleSave = async () => {
    if (!couple?.id || !currentUser?.id) return;
    if (committedStrokes.current.length === 0) {
      alert("Draw something first!");
      return;
    }
    if (!photo && !linkUrl.trim()) {
      alert("Attach a photo or a link!");
      return;
    }

    setSaving(true);
    try {
      const svgString = buildSvg(committedStrokes.current);

      // Extract EXIF date from the photo (if any)
      let photoTakenAt: Date | null = null;
      if (photo) {
        photoTakenAt = await extractPhotoDate(photo);
      }

      await createGardenItem({
        coupleId: couple.id,
        createdBy: currentUser.id,
        doodleSvg: svgString,
        photoFile: photo || undefined,
        caption: caption.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        photoTakenAt,
      });

      // Send push notification to partner
      try {
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coupleId: couple.id,
            senderUserId: currentUser.id,
            senderName: currentUser.name || "Your partner",
            message: "new plant alert 🌱",
          }),
        });
      } catch {
        // Push is best-effort
      }

      router.push("/garden");
    } catch (e) {
      console.error("Failed to save:", e);
      alert("Failed to save. Try again.");
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-[#F3F0EA] dark:bg-[#0A0A0C]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 max-w-lg mx-auto">
        <button
          onClick={() => router.push("/garden")}
          className="text-[#98989D] hover:text-[#636366] transition-colors"
        >
          <IoArrowBack style={{ fontSize: 22 }} />
        </button>
        <h1
          className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]"
          style={{ fontSize: 18, fontWeight: 800 }}
        >
          New Doodle
        </h1>
        <div style={{ width: 22 }} /> {/* spacer */}
      </div>

      <div className="px-5 pb-8 max-w-lg mx-auto flex flex-col gap-4">
        {/* Drawing area */}
        <div className="relative">
          {/* Photo background (if attached) */}
          {photoPreview && (
            <img
              src={photoPreview}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ borderRadius: 16, opacity: 0.4 }}
            />
          )}

          {/* SVG drawing layer */}
          <div
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative bg-white dark:bg-[#1A1A1C] touch-none select-none"
            style={{
              borderRadius: 16,
              aspectRatio: "1",
              cursor: "crosshair",
              border: "2px solid rgba(232,160,191,0.3)",
            }}
          >
            <svg
              viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
              className="w-full h-full"
              style={{ borderRadius: 14 }}
            >
              {allStrokes.map((stroke, si) =>
                stroke.points.length > 1 ? (
                  <path
                    key={si}
                    d={stroke.points
                      .map(
                        (p, i) =>
                          `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
                      )
                      .join(" ")}
                    stroke={stroke.color}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ) : null
              )}
            </svg>
          </div>
        </div>

        {/* Drawing controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleUndo}
            disabled={committedStrokes.current.length === 0}
            className="flex items-center gap-1 px-4 py-2 bg-[#ECE7DE] dark:bg-[#1A1A1C]
              text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]
              active:scale-[0.95] transition-all disabled:opacity-30"
            style={{ borderRadius: 12, fontSize: 13, fontWeight: 600 }}
          >
            <IoArrowUndo style={{ fontSize: 16 }} />
            Undo
          </button>
          <button
            onClick={handleClear}
            disabled={committedStrokes.current.length === 0}
            className="flex items-center gap-1 px-4 py-2 bg-[#ECE7DE] dark:bg-[#1A1A1C]
              text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]
              active:scale-[0.95] transition-all disabled:opacity-30"
            style={{ borderRadius: 12, fontSize: 13, fontWeight: 600 }}
          >
            <IoTrash style={{ fontSize: 16 }} />
            Clear
          </button>
          <div className="flex-1" />
          {/* Color swatches */}
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setInkColor(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: c,
                border: inkColor === c ? "3px solid #0A0A0C" : "2px solid rgba(255,255,255,0.6)",
                transform: inkColor === c ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.15s, border 0.15s",
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Photo attachment */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 w-full px-4 py-3 bg-[#ECE7DE] dark:bg-[#1A1A1C]
            text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-suse)]
            active:scale-[0.98] transition-all"
          style={{ borderRadius: 14, fontSize: 14, fontWeight: 600 }}
        >
          <IoImage style={{ fontSize: 18, color: "#3A7BD5" }} />
          {photo ? `📷 ${photo.name}` : "Attach a photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoPick}
        />

        {/* Caption */}
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption (optional)"
          className="w-full px-4 py-3 bg-[#ECE7DE] dark:bg-[#1A1A1C] text-[#0A0A0C] dark:text-[#F3F0EA]
            placeholder:text-[#98989D] font-[family-name:var(--font-suse)] outline-none"
          style={{ borderRadius: 14, fontSize: 14, fontWeight: 600 }}
        />

        {/* Link URL */}
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Attach a link (optional)"
          className="w-full px-4 py-3 bg-[#ECE7DE] dark:bg-[#1A1A1C] text-[#0A0A0C] dark:text-[#F3F0EA]
            placeholder:text-[#98989D] font-[family-name:var(--font-suse)] outline-none"
          style={{ borderRadius: 14, fontSize: 14, fontWeight: 600 }}
        />

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || committedStrokes.current.length === 0 || (!photo && !linkUrl.trim())}
          className="flex items-center justify-center gap-2 w-full text-white font-[family-name:var(--font-suse)]
            active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderRadius: 999,
            padding: 16,
            fontSize: 16,
            fontWeight: 800,
            backgroundColor: "#3A7BD5",
          }}
        >
          {saving ? "Adding..." : "Add to Tank 🐟"}
        </button>
      </div>
    </div>
  );
}
