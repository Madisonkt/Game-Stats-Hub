"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import { createGardenItem } from "@/lib/repos/gardenRepo";
import { IoArrowBack, IoArrowUndo, IoTrash, IoImage } from "react-icons/io5";

const INK_COLOR = "#4E6B3A";
const CANVAS_SIZE = 300;
const STROKE_WIDTH = 4;

type Point = { x: number; y: number };
type Stroke = Point[];

export default function NewDoodlePage() {
  const router = useRouter();
  const { session } = useSession();
  const couple = session.couple;
  const currentUser = session.currentUser;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Key to force SVG re-render during drawing
  const [drawKey, setDrawKey] = useState(0);

  const getPointerPos = useCallback(
    (e: React.PointerEvent): Point => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDrawing(true);
      const pt = getPointerPos(e);
      currentStroke.current = [pt];
      setDrawKey((k) => k + 1);
    },
    [getPointerPos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pt = getPointerPos(e);
      currentStroke.current.push(pt);
      setDrawKey((k) => k + 1);
    },
    [isDrawing, getPointerPos]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.current.length > 1) {
      setStrokes((prev) => [...prev, [...currentStroke.current]]);
    }
    currentStroke.current = [];
  }, [isDrawing]);

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
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
    (allStrokes: Stroke[]): string => {
      const paths = allStrokes
        .filter((s) => s.length > 1)
        .map((stroke) => {
          const d = stroke
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(" ");
          return `<path d="${d}" stroke="${INK_COLOR}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        })
        .join("");
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" width="100%" height="100%">${paths}</svg>`;
    },
    []
  );

  // Current SVG including in-progress stroke
  const currentSvgStrokes = isDrawing
    ? [...strokes, currentStroke.current]
    : strokes;

  const handleSave = async () => {
    if (!couple?.id || !currentUser?.id || !photo) return;
    if (strokes.length === 0) {
      alert("Draw something first!");
      return;
    }

    setSaving(true);
    try {
      const svgString = buildSvg(strokes);
      await createGardenItem({
        coupleId: couple.id,
        createdBy: currentUser.id,
        doodleSvg: svgString,
        photoFile: photo,
        caption: caption.trim() || undefined,
      });
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
        <p className="text-[#98989D] font-[family-name:var(--font-nunito)]">Not signed in</p>
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
          className="text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]"
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
              border: "2px solid rgba(78,107,58,0.2)",
            }}
          >
            <svg
              viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
              className="w-full h-full"
              style={{ borderRadius: 14 }}
            >
              {currentSvgStrokes.map((stroke, si) =>
                stroke.length > 1 ? (
                  <path
                    key={`${si}-${drawKey}`}
                    d={stroke
                      .map(
                        (p, i) =>
                          `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
                      )
                      .join(" ")}
                    stroke={INK_COLOR}
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
            disabled={strokes.length === 0}
            className="flex items-center gap-1 px-4 py-2 bg-[#ECE7DE] dark:bg-[#1A1A1C]
              text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]
              active:scale-[0.95] transition-all disabled:opacity-30"
            style={{ borderRadius: 12, fontSize: 13, fontWeight: 600 }}
          >
            <IoArrowUndo style={{ fontSize: 16 }} />
            Undo
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="flex items-center gap-1 px-4 py-2 bg-[#ECE7DE] dark:bg-[#1A1A1C]
              text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]
              active:scale-[0.95] transition-all disabled:opacity-30"
            style={{ borderRadius: 12, fontSize: 13, fontWeight: 600 }}
          >
            <IoTrash style={{ fontSize: 16 }} />
            Clear
          </button>
          <div className="flex-1" />
          <div
            className="flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: INK_COLOR,
              border: "2px solid rgba(255,255,255,0.5)",
            }}
          />
        </div>

        {/* Photo attachment */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 w-full px-4 py-3 bg-[#ECE7DE] dark:bg-[#1A1A1C]
            text-[#0A0A0C] dark:text-[#F3F0EA] font-[family-name:var(--font-nunito)]
            active:scale-[0.98] transition-all"
          style={{ borderRadius: 14, fontSize: 14, fontWeight: 600 }}
        >
          <IoImage style={{ fontSize: 18, color: "#4E6B3A" }} />
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
            placeholder:text-[#98989D] font-[family-name:var(--font-nunito)] outline-none"
          style={{ borderRadius: 14, fontSize: 14, fontWeight: 600 }}
        />

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !photo || strokes.length === 0}
          className="flex items-center justify-center gap-2 w-full text-white font-[family-name:var(--font-nunito)]
            active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderRadius: 999,
            padding: 16,
            fontSize: 16,
            fontWeight: 800,
            backgroundColor: "#4E6B3A",
          }}
        >
          {saving ? "Planting..." : "Plant in Garden 🌱"}
        </button>
      </div>
    </div>
  );
}
