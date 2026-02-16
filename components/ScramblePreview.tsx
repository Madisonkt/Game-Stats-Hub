import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { applyScramble, COLOR_MAP } from "@/lib/cube-state";

/**
 * Isometric 3D Rubik's cube preview using SVG polygons.
 * Shows Front (left), Right (right), and Upper (top) faces.
 * Uses proper isometric projection: px = (x-z)*cos30, py = (x+z)*sin30 - y
 */

const SIN30 = 0.5;
const COS30 = Math.cos(Math.PI / 6); // ~0.866

export function ScramblePreview({
  scramble,
  cellSize = 14,
}: {
  scramble: string;
  cellSize?: number;
}) {
  const state = useMemo(() => applyScramble(scramble), [scramble]);

  const faceU = state[0];
  const faceR = state[1];
  const faceF = state[2];

  const N = 3;
  const C = cellSize;

  // Isometric projection: 3D → 2D
  // x goes right along front face, z goes back along right face, y goes up
  const project = (x3d: number, y3d: number, z3d: number): [number, number] => {
    const px = (x3d + z3d) * COS30;
    const py = (x3d - z3d) * SIN30 - y3d;
    return [px, py];
  };

  // Compute bounding box from all 8 cube corners
  const corners3d = [
    [0, 0, 0], [N*C, 0, 0], [0, N*C, 0], [N*C, N*C, 0],
    [0, 0, N*C], [N*C, 0, N*C], [0, N*C, N*C], [N*C, N*C, N*C],
  ];
  const projected = corners3d.map(([x, y, z]) => project(x, y, z));
  const allX = projected.map((p) => p[0]);
  const allY = projected.map((p) => p[1]);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const pad = 2;
  const svgW = maxX - minX + pad * 2;
  const svgH = maxY - minY + pad * 2;
  const offX = -minX + pad;
  const offY = -minY + pad;

  const proj = (x3d: number, y3d: number, z3d: number): [number, number] => {
    const [px, py] = project(x3d, y3d, z3d);
    return [px + offX, py + offY];
  };

  const stickers: { points: string; fill: string }[] = [];

  // Front face (z = 0)
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const colorIdx = (N - 1 - row) * N + col;
      const color = faceF[colorIdx];
      const x0 = col * C, x1 = (col + 1) * C;
      const y0 = row * C, y1 = (row + 1) * C;
      const tl = proj(x0, y1, 0);
      const tr = proj(x1, y1, 0);
      const br = proj(x1, y0, 0);
      const bl = proj(x0, y0, 0);
      stickers.push({
        points: `${tl[0]},${tl[1]} ${tr[0]},${tr[1]} ${br[0]},${br[1]} ${bl[0]},${bl[1]}`,
        fill: COLOR_MAP[color] || "#888",
      });
    }
  }

  // Right face (x = N*C)
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const colorIdx = (N - 1 - row) * N + col;
      const color = faceR[colorIdx];
      const z0 = col * C, z1 = (col + 1) * C;
      const y0 = row * C, y1 = (row + 1) * C;
      const tl = proj(N * C, y1, z0);
      const tr = proj(N * C, y1, z1);
      const br = proj(N * C, y0, z1);
      const bl = proj(N * C, y0, z0);
      stickers.push({
        points: `${tl[0]},${tl[1]} ${tr[0]},${tr[1]} ${br[0]},${br[1]} ${bl[0]},${bl[1]}`,
        fill: COLOR_MAP[color] || "#888",
      });
    }
  }

  // Top face (y = N*C)
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const colorIdx = row * N + col;
      const color = faceU[colorIdx];
      const x0 = col * C, x1 = (col + 1) * C;
      const z0 = row * C, z1 = (row + 1) * C;
      const tl = proj(x0, N * C, z0);
      const tr = proj(x1, N * C, z0);
      const br = proj(x1, N * C, z1);
      const bl = proj(x0, N * C, z1);
      stickers.push({
        points: `${tl[0]},${tl[1]} ${tr[0]},${tr[1]} ${br[0]},${br[1]} ${bl[0]},${bl[1]}`,
        fill: COLOR_MAP[color] || "#888",
      });
    }
  }

  return (
    <View style={{ width: svgW, height: svgH }}>
      <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {stickers.map((s, i) => (
          <Polygon
            key={i}
            points={s.points}
            fill={s.fill}
            stroke="#222"
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}
