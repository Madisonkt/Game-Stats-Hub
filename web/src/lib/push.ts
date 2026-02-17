/**
 * Push notification subscription manager.
 * Handles subscribing/unsubscribing to web push notifications.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Check if push notifications are supported */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Get current permission state */
export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/** Subscribe to push notifications and save to Supabase */
export async function subscribeToPush(
  userId: string,
  coupleId: string
): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint!;
    const p256dh = subJson.keys!.p256dh!;
    const auth = subJson.keys!.auth!;

    // Save to Supabase
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        couple_id: coupleId,
        endpoint,
        p256dh,
        auth,
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      console.error("Failed to save push subscription:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Push subscription failed:", e);
    return false;
  }
}

/** Unsubscribe from push notifications */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from Supabase
    const supabase = createSupabaseBrowserClient();
    await supabase.from("push_subscriptions").delete().eq("user_id", userId);
  } catch (e) {
    console.error("Push unsubscribe failed:", e);
  }
}

/** Check if already subscribed */
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}
