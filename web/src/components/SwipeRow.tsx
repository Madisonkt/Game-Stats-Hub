"use client";

import React from "react";
import { useSwipeable } from "react-swipeable";

type SwipeRowProps = {
  id: string;
  isOpen: boolean;
  setOpenId: (id: string | null) => void;
  onDelete: (id: string) => void;
  children: React.ReactNode;
  actionWidth?: number; // px
};

export function SwipeRow({
  id,
  isOpen,
  setOpenId,
  onDelete,
  children,
  actionWidth = 88,
}: SwipeRowProps) {
  const [dx, setDx] = React.useState(0);
  const startDxRef = React.useRef(0);

  // Clamp drag so we only move left up to actionWidth
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const handlers = useSwipeable({
    onSwipeStart: () => {
      startDxRef.current = isOpen ? -actionWidth : 0;
      setDx(startDxRef.current);
    },
    onSwiping: (e) => {
      // negative = left swipe
      const next = clamp(startDxRef.current + e.deltaX, -actionWidth, 0);
      setDx(next);
    },
    onSwiped: () => {
      // snap based on how far you pulled
      const shouldOpen = dx < -actionWidth * 0.45;
      setOpenId(shouldOpen ? id : null);
      setDx(0); // reset; we'll use isOpen for final position
    },
    // Important so vertical scroll still works well:
    trackTouch: true,
    trackMouse: false,
    preventScrollOnSwipe: false,
    delta: 10,
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-[#ECE7DE] dark:bg-[#1A1A1C] dark:border-[#2A2A2C]">
      {/* Back layer (actions) */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        <button
          onClick={() => onDelete(id)}
          className="h-10 w-[88px] rounded-xl bg-rose-600 text-sm font-extrabold uppercase tracking-wide text-[#F3F0EA] active:scale-[0.98]"
        >
          Delete
        </button>
      </div>

      {/* Front layer (content) */}
      <div
        {...handlers}
        className={[
          "relative bg-[#ECE7DE] dark:bg-[#1A1A1C]",
          "transition-transform duration-200 ease-out",
          // Helps mobile scroll + swipe coexist:
          "touch-pan-y",
        ].join(" ")}
        style={{
          transform: `translateX(${isOpen ? -actionWidth : 0}px)`,
        }}
        onClick={() => {
          // Tap closes if open
          if (isOpen) setOpenId(null);
        }}
      >
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
