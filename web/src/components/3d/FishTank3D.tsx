"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { DoodleTankModel } from "./DoodleTankModel";

// ── Inner scene (rendered inside <Canvas>) ───────────────────────────────────
function TankScene() {
  return (
    <>
      {/* Camera — positioned to see full 10 × 9 unit model */}
      <PerspectiveCamera makeDefault fov={45} position={[0, 0, 14]} near={0.1} far={200} />

      {/* Lighting */}
      <ambientLight intensity={1.4} />
      <directionalLight
        position={[6, 10, 8]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, -6, -4]} intensity={0.4} />

      {/* SVG-to-3D model */}
      <Suspense fallback={null}>
        <DoodleTankModel />
      </Suspense>

      {/* Orbit with gentle damping */}
      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={6}
        maxDistance={30}
        enablePan={false}
      />
    </>
  );
}

// ── Spinner shown while Three.js loads ───────────────────────────────────────
function LoadSpinner() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f5f0",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "3px solid #d4d0c8",
          borderTopColor: "#408052",
          animation: "spin 0.9s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Public component ─────────────────────────────────────────────────────────
interface FishTank3DProps {
  /** CSS height of the canvas container. Defaults to "360px". */
  height?: string | number;
  /** CSS width. Defaults to "100%". */
  width?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

function FishTank3DInner({ height = "360px", width = "100%", className, style }: FishTank3DProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        background: "#f6f5f0",
        borderRadius: 16,
        overflow: "hidden",
        ...style,
      }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: "100%", height: "100%" }}
      >
        <TankScene />
      </Canvas>
    </div>
  );
}

// Dynamic import prevents SSR errors (Three.js is browser-only)
export const FishTank3D = dynamic(() => Promise.resolve(FishTank3DInner), {
  ssr: false,
  loading: LoadSpinner,
});
