"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import type { ReactNode } from "react";

/** Routes that don't require authentication */
const PUBLIC_ROUTES = ["/login", "/auth/callback"];

/**
 * Client-side auth guard.
 * Redirects unauthenticated users to /login and
 * authenticated users away from /login.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublic) {
      router.replace("/login");
    } else if (isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, isPublic, pathname, router]);

  // While loading, show a minimal spinner
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F0EA] dark:bg-[#0A0A0C]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#3A7BD5] border-t-transparent" />
      </div>
    );
  }

  // Not authenticated and not on a public route — don't render children (redirect is happening)
  if (!isAuthenticated && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
