import type { ReactNode } from "react";

export default function KawaiiBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {children}
    </div>
  );
}
