"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import type { ReactNode } from "react";

/** Routes that don't require authentication */
const PUBLIC_ROUTES = ["/login", "/auth/callback"];

/** Routes that require auth but NOT a couple */
const SETUP_ROUTES = ["/onboarding", "/lobby"];

/**
 * Client-side auth guard.
 * Redirects unauthenticated users to /login,
 * authenticated users without a room to /onboarding,
 * and authenticated users away from /login.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isSetup = SETUP_ROUTES.some((r) => pathname.startsWith(r));
  const hasCouple = session.couple !== null;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublic) {
      // Not logged in → go to login
      router.replace("/login");
    } else if (isAuthenticated && pathname === "/login") {
      // Logged in but on login page → go forward
      router.replace("/");
    } else if (isAuthenticated && !hasCouple && !isPublic && !isSetup) {
      // Logged in but no room yet → go to onboarding
      router.replace("/onboarding");
    }
  }, [isLoading, isAuthenticated, hasCouple, isPublic, isSetup, pathname, router]);

  // While loading, show a minimal spinner
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F0EA] dark:bg-[#0A0A0C]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#3A7BD5] dark:border-white border-t-transparent" />
      </div>
    );
  }

  // Not authenticated and not on a public route — don't render children (redirect is happening)
  if (!isAuthenticated && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
