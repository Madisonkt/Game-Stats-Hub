"use client";

import { useEffect, useState } from "react";

const CONFETTI_COLORS = ["#FFD93D", "#51CF66", "#748FFC", "#FF922B", "#CC5DE8"];

interface Piece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  rotation: number;
  size: number;
}

export default function ConfettiEffect({
  trigger,
  winnerColor,
}: {
  trigger: number; // increment to trigger
  winnerColor?: string;
}) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (trigger === 0) return;

    const colors = winnerColor
      ? [winnerColor, ...CONFETTI_COLORS]
      : CONFETTI_COLORS;

    const newPieces: Piece[] = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 200,
      duration: 1200 + Math.random() * 800,
      drift: (Math.random() - 0.5) * 120,
      rotation: Math.random() * 720,
      size: 6 + Math.random() * 6,
    }));

    setPieces(newPieces);

    const timer = setTimeout(() => setPieces([]), 2500);
    return () => clearTimeout(timer);
  }, [trigger, winnerColor]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute confetti-piece"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            borderRadius: 2,
            animationDuration: `${p.duration}ms`,
            animationDelay: `${p.delay}ms`,
            ["--drift" as string]: `${p.drift}px`,
            ["--rotation" as string]: `${p.rotation}deg`,
          }}
        />
      ))}
    </div>
  );
}
