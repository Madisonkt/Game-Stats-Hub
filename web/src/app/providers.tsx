"use client";

import { SessionProvider } from "@/lib/auth-context";
import { AuthGuard } from "@/components/AuthGuard";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthGuard>{children}</AuthGuard>
    </SessionProvider>
  );
}
