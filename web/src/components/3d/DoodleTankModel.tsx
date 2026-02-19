"use client";

import { useRef, useMemo } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import * as THREE from "three";

// ── Constants ────────────────────────────────────────────────────────────────
const SVG_W = 402;
const SVG_H = 356;
const K = 1 / 40; // world-space scale  →  model fills ~10 × 9 world units

// Shapes with bounding-box area below this (in SVG pixels²) and whose centroid
// sits inside the tank interior are treated as "fish" and animated.
const FISH_AREA_MAX = 3200;
const FISH_X_RANGE = [35, 375] as const;
const FISH_Y_RANGE = [80, 310] as const;

// Extrusion depths in SVG units (multiplied by K they become world units)
const DEPTH_TANK = 10; // ~0.25 wu  — large outlines
const DEPTH_FISH = 6; // ~0.15 wu  — small interior doodles

// ── Shape analysis ───────────────────────────────────────────────────────────
interface ShapeInfo {
  cx: number;
  cy: number;
  area: number;
  isFish: boolean;
}

function analyzeShape(shape: THREE.Shape): ShapeInfo {
  const pts = shape.getPoints(20);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const area = (maxX - minX) * (maxY - minY);
  const isFish =
    area < FISH_AREA_MAX &&
    cx > FISH_X_RANGE[0] &&
    cx < FISH_X_RANGE[1] &&
    cy > FISH_Y_RANGE[0] &&
    cy < FISH_Y_RANGE[1];
  return { cx, cy, area, isFish };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShapeDef {
  geometry: THREE.ExtrudeGeometry;
  edgesGeometry: THREE.EdgesGeometry;
  material: THREE.MeshStandardMaterial;
  isFish: boolean;
  fishIndex: number; // -1 when not a fish
}

interface FishAnim {
  speed: number;
  phase: number;
  amplitude: number; // in SVG units
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DoodleTankModel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svgData = useLoader(SVGLoader, "/images/fishtank.svg") as any;

  const fishGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const fishAnims = useRef<FishAnim[]>([]);

  // ── Build all geometry / material pairs once ─────────────────────────────
  const shapeDefs = useMemo<ShapeDef[]>(() => {
    const defs: ShapeDef[] = [];
    let fishCount = 0;
    fishAnims.current = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svgData.paths.forEach((path: any) => {
      const col: THREE.Color = path.color;
      const isWhite = col.r > 0.85 && col.g > 0.85 && col.b > 0.85;
      const hexColor = "#" + col.getHexString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shapes = (SVGLoader as any).createShapes(path) as THREE.Shape[];

      shapes.forEach((shape) => {
        const { area, isFish } = analyzeShape(shape);
        const isLarge = area > 40000;
        const depth = isLarge ? DEPTH_TANK * 1.4 : isFish ? DEPTH_FISH : DEPTH_TANK;

        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
          depth,
          bevelEnabled: false,
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const edgesGeometry = new THREE.EdgesGeometry(geometry);

        let material: THREE.MeshStandardMaterial;
        if (isWhite) {
          material = new THREE.MeshStandardMaterial({
            color: "#f8f8f8",
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
        } else {
          material = new THREE.MeshStandardMaterial({
            color: hexColor,
            roughness: 0.88,
            metalness: 0.0,
          });
        }

        let fishIndex = -1;
        if (isFish) {
          fishIndex = fishCount++;
          fishAnims.current.push({
            speed: 0.35 + Math.random() * 0.55,
            phase: Math.random() * Math.PI * 2,
            amplitude: 3 + Math.random() * 4, // SVG units ~0.075–0.175 wu
          });
        }

        defs.push({ geometry, edgesGeometry, material, isFish, fishIndex });
      });
    });

    return defs;
  }, [svgData]);

  // ── Fish animation ───────────────────────────────────────────────────────
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    fishGroupRefs.current.forEach((group, i) => {
      if (!group) return;
      const anim = fishAnims.current[i];
      if (!anim) return;
      // Group is in SVG-local space; parent scale.y = -K flips the direction,
      // so +y here = visual DOWN. A simple sin gives natural oscillation.
      group.position.y = Math.sin(t * anim.speed + anim.phase) * anim.amplitude;
      group.rotation.z = Math.sin(t * anim.speed * 0.65 + anim.phase) * 0.045;
    });
  });

  // ── Render ──────────────────────────────────────────────────────────────
  // The parent group:
  //  • scale(K, -K, K)  →  converts SVG px to world units AND flips Y
  //  • position offsets the origin to the SVG centre so the model is centred at 0,0,0
  return (
    <group
      scale={[K, -K, K]}
      position={[(-SVG_W / 2) * K, (SVG_H / 2) * K, 0]}
    >
      {shapeDefs.map((def, i) => {
        const mesh = (
          <>
            <mesh geometry={def.geometry} material={def.material} castShadow receiveShadow />
            {/* Doodle outline overlay */}
            <lineSegments geometry={def.edgesGeometry}>
              <lineBasicMaterial color="#0a0a0a" transparent opacity={0.55} />
            </lineSegments>
          </>
        );

        if (def.isFish) {
          return (
            <group
              key={i}
              ref={(el) => {
                fishGroupRefs.current[def.fishIndex] = el;
              }}
            >
              {mesh}
            </group>
          );
        }

        return <group key={i}>{mesh}</group>;
      })}
    </group>
  );
}
