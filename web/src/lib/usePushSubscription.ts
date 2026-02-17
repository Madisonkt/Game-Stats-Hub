"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-context";
import { subscribeToPush, isPushSupported, getPushPermission } from "@/lib/push";

/**
 * Auto-subscribes the user to push notifications when they have a couple.
 * Asks permission once, then silently re-subscribes on future visits.
 */
export function usePushSubscription() {
  const { session } = useSession();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    if (!session.currentUser?.id || !session.couple?.id) return;
    if (!isPushSupported()) return;

    const permission = getPushPermission();

    // If already granted, silently re-subscribe (ensures subscription stays fresh)
    if (permission === "granted") {
      subscribedRef.current = true;
      subscribeToPush(session.currentUser.id, session.couple.id).catch(() => {});
      return;
    }

    // If not yet asked, subscribe (will prompt)
    if (permission === "default") {
      subscribedRef.current = true;
      subscribeToPush(session.currentUser.id, session.couple.id).catch(() => {});
    }

    // If "denied", do nothing
  }, [session.currentUser?.id, session.couple?.id]);
}
