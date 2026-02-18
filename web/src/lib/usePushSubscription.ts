"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-context";
import { subscribeToPush, isPushSupported, getPushPermission } from "@/lib/push";

/**
 * Auto-subscribes the user to push notifications when they have a couple.
 * 
 * iOS IMPORTANT: Notification.requestPermission() MUST be called from a direct
 * user gesture (button tap). This hook only silently re-subscribes when
 * permission is already "granted". The first-time permission prompt must come
 * from the "Enable Notifications" button in the games page.
 */
export function usePushSubscription() {
  const { session } = useSession();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    if (!session.currentUser?.id || !session.couple?.id) return;
    if (!isPushSupported()) return;

    const permission = getPushPermission();

    // Only silently re-subscribe if permission is already granted.
    // Never call requestPermission() here — iOS blocks it outside user gestures.
    if (permission === "granted") {
      subscribedRef.current = true;
      subscribeToPush(session.currentUser.id, session.couple.id).catch(() => {});
    }

    // "default" or "denied": do nothing — user must tap the Enable button
  }, [session.currentUser?.id, session.couple?.id]);
}
