"use client";

import { useEffect, useState } from "react";

export default function CloudLoader({ message }: { message?: string }) {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((d) => (d + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <span style={{ fontSize: 36 }} role="img" aria-label="loading">
        ☁️
        <span className="inline-block" style={{ width: 28, textAlign: "left", fontSize: 24, letterSpacing: 2 }}>
          {".".repeat(dotCount)}
        </span>
      </span>
      {message && (
        <p className="text-sm font-semibold text-[#636366] font-[family-name:var(--font-suse)]">
          {message}
        </p>
      )}
    </div>
  );
}
