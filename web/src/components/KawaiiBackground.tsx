"use client";

import type { ReactNode } from "react";

export default function KawaiiBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex-1 min-h-0">
      {/* Grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "url(/images/grain.png)",
          backgroundRepeat: "repeat",
          opacity: 0.15,
        }}
      />
      <div className="relative z-10 flex-1 min-h-0">{children}</div>
    </div>
  );
}
