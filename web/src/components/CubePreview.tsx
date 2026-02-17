"use client";

import React, { useMemo } from "react";
import { applyScramble, COLOR_MAP } from "@/lib/cube-state";

/**
 * 3D CSS Rubik's Cube showing 3 visible faces (U, R, F) based on a scramble.
 * Uses CSS 3D transforms — no WebGL needed.
 */
export default function CubePreview({
  scramble,
  size = 90,
}: {
  scramble: string;
  size?: number;
}) {
  const state = useMemo(() => applyScramble(scramble), [scramble]);

  // Face indices: U=0, R=1, F=2, D=3, L=4, B=5
  const cellSize = size / 3;
  const gap = 1;
  const half = size / 2;

  function renderFace(faceIdx: number) {
    const face = state[faceIdx];
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "grid",
          gridTemplateColumns: `repeat(3, ${cellSize}px)`,
          gridTemplateRows: `repeat(3, ${cellSize}px)`,
          gap: `${gap}px`,
          padding: gap,
        }}
      >
        {face.map((color, i) => (
          <div
            key={i}
            style={{
              backgroundColor: COLOR_MAP[color] || "#333",
              borderRadius: Math.max(2, cellSize * 0.12),
              border: "1px solid rgba(0,0,0,0.15)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        width: size * 1.8,
        height: size * 1.8,
        perspective: size * 5,
        perspectiveOrigin: "50% 50%",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `
            translateX(${size * 0.35}px)
            translateY(${size * 0.25}px)
            rotateX(-30deg)
            rotateY(-35deg)
          `,
        }}
      >
        {/* Front face (F) */}
        <div
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: `translateZ(${half}px)`,
            backfaceVisibility: "hidden",
            background: "#111",
            borderRadius: 4,
            padding: 1,
          }}
        >
          {renderFace(2)}
        </div>

        {/* Right face (R) */}
        <div
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: `rotateY(90deg) translateZ(${half}px)`,
            backfaceVisibility: "hidden",
            background: "#111",
            borderRadius: 4,
            padding: 1,
          }}
        >
          {renderFace(1)}
        </div>

        {/* Top face (U) */}
        <div
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: `rotateX(90deg) translateZ(${half}px)`,
            backfaceVisibility: "hidden",
            background: "#111",
            borderRadius: 4,
            padding: 1,
          }}
        >
          {renderFace(0)}
        </div>

        {/* Back face — dark to give depth */}
        <div
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: `translateZ(-${half}px) rotateY(180deg)`,
            backfaceVisibility: "hidden",
            background: "#1a1a1a",
            borderRadius: 4,
          }}
        />

        {/* Left face — dark to give depth */}
        <div
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: `rotateY(-90deg) translateZ(${half}px)`,
            backfaceVisibility: "hidden",
            background: "#1a1a1a",
            borderRadius: 4,
          }}
        />

        {/* Bottom face — dark to give depth */}
        <div
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: `rotateX(-90deg) translateZ(${half}px)`,
            backfaceVisibility: "hidden",
            background: "#1a1a1a",
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}
