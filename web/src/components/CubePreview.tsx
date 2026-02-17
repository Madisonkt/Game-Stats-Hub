"use client";

import React, { useMemo } from "react";
import { applyScramble, COLOR_MAP } from "@/lib/cube-state";

/**
 * 3D CSS Rubik's Cube showing 3 visible faces (U, R, F) based on a scramble.
 * Uses CSS 3D transforms — no WebGL needed.
 */
export default function CubePreview({
  scramble,
  size = 54,
}: {
  scramble: string;
  size?: number;
}) {
  const state = useMemo(() => applyScramble(scramble), [scramble]);

  const half = size / 2;
  const gap = 1;

  function renderFace(faceIdx: number) {
    const face = state[faceIdx];
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr 1fr",
          gap,
          background: "#222",
          borderRadius: 2,
        }}
      >
        {face.map((color, i) => (
          <div
            key={i}
            style={{
              backgroundColor: COLOR_MAP[color] || "#333",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        width: size * 1.7,
        height: size * 1.7,
        perspective: size * 6,
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
            translateX(${size * 0.3}px)
            translateY(${size * 0.2}px)
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
          }}
        >
          {renderFace(0)}
        </div>

        {/* Hidden faces for depth */}
        <div style={{ position: "absolute", width: size, height: size, transform: `translateZ(-${half}px) rotateY(180deg)`, background: "#1a1a1a", borderRadius: 2 }} />
        <div style={{ position: "absolute", width: size, height: size, transform: `rotateY(-90deg) translateZ(${half}px)`, background: "#1a1a1a", borderRadius: 2 }} />
        <div style={{ position: "absolute", width: size, height: size, transform: `rotateX(-90deg) translateZ(${half}px)`, background: "#1a1a1a", borderRadius: 2 }} />
      </div>
    </div>
  );
}
