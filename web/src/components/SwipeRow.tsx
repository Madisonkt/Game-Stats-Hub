"use client";

import React from "react";
import { useSwipeable } from "react-swipeable";
import { IoTrashOutline } from "react-icons/io5";

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
  actionWidth = 80,
}: SwipeRowProps) {
  const [dx, setDx] = React.useState(0);
  const [swiping, setSwiping] = React.useState(false);
  const startDxRef = React.useRef(0);

  const clamp = (n: number, min: number, max: number) =>
    Math.min(max, Math.max(min, n));

  // Compute the actual translateX: use dx while swiping, otherwise snap to open/closed
  const translateX = swiping ? dx : isOpen ? -actionWidth : 0;

  const handlers = useSwipeable({
    onSwipeStart: () => {
      setSwiping(true);
      startDxRef.current = isOpen ? -actionWidth : 0;
      setDx(startDxRef.current);
    },
    onSwiping: (e) => {
      const next = clamp(startDxRef.current + e.deltaX, -actionWidth, 0);
      setDx(next);
    },
    onSwiped: () => {
      const shouldOpen = dx < -actionWidth * 0.4;
      setOpenId(shouldOpen ? id : null);
      setSwiping(false);
      setDx(0);
    },
    trackTouch: true,
    trackMouse: false,
    preventScrollOnSwipe: false,
    delta: 10,
  });

  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 18 }}>
      {/* Delete action behind the card — fixed in place */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-rose-600"
        style={{ width: actionWidth }}
      >
        <button
          onClick={() => onDelete(id)}
          className="flex flex-col items-center gap-0.5 active:opacity-70"
        >
          <IoTrashOutline className="text-white" style={{ fontSize: 20 }} />
          <span
            className="text-white font-[family-name:var(--font-nunito)]"
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            Delete
          </span>
        </button>
      </div>

      {/* The entire card slides left as one unit */}
      <div
        {...handlers}
        className="relative touch-pan-y"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: swiping ? "none" : "transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
          willChange: "transform",
        }}
        onClick={() => {
          if (isOpen) {
            setOpenId(null);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
