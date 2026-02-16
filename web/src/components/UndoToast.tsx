"use client";

import { useEffect, useState } from "react";

export default function UndoToast({
  message,
  visible,
  color,
  onUndo,
  onDismiss,
  timeoutMs = 10000,
}: {
  message: string;
  visible: boolean;
  color?: string;
  onUndo: () => void;
  onDismiss: () => void;
  timeoutMs?: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      // Delay so CSS transition kicks in
      requestAnimationFrame(() => setShow(true));
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onDismiss, 300);
      }, timeoutMs);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, timeoutMs, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 z-[150] transition-all duration-300 ease-out"
      style={{
        transform: show
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(40px)",
        opacity: show ? 1 : 0,
      }}
    >
      <div
        className="flex items-center justify-between gap-3 w-full shadow-xl"
        style={{
          backgroundColor: color || "#0A0A0C",
          borderRadius: 16,
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 14,
          paddingBottom: 14,
          maxWidth: 360,
          minWidth: 280,
        }}
      >
        <span className="text-white font-[family-name:var(--font-nunito)]" style={{ fontSize: 15, fontWeight: 700 }}>
          {message}
        </span>
        <button
          onClick={() => {
            onUndo();
            setShow(false);
            setTimeout(onDismiss, 300);
          }}
          className="font-[family-name:var(--font-nunito)]"
          style={{
            backgroundColor: "rgba(255,255,255,0.25)",
            borderRadius: 12,
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 6,
            paddingBottom: 6,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Undo
        </button>
      </div>
    </div>
  );
}
