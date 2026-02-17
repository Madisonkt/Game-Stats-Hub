"use client";

import { SessionProvider } from "@/lib/auth-context";
import { GameProvider } from "@/lib/game-context";
import { AuthGuard } from "@/components/AuthGuard";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <GameProvider>
        <AuthGuard>{children}</AuthGuard>
      </GameProvider>
    </SessionProvider>
  );
}
