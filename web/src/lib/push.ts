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
): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Push not supported" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "Permission denied" };

    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint!;
    const p256dh = subJson.keys!.p256dh!;
    const auth = subJson.keys!.auth!;

    // Save to Supabase
    const supabase = createSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("push_subscriptions") as any).upsert(
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
      return { ok: false, error: `DB error: ${error.message}` };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Push subscription failed:", e);
    return { ok: false, error: msg };
  }
}

/** Re-save an existing granted subscription to DB (no permission prompt) */
export async function resyncPushSubscription(
  userId: string,
  coupleId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Push not supported" };
  if (Notification.permission !== "granted") return { ok: false, error: "No permission" };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      // No existing subscription — create one
      return subscribeToPush(userId, coupleId);
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint!;
    const p256dh = subJson.keys!.p256dh!;
    const auth = subJson.keys!.auth!;

    const supabase = createSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("push_subscriptions") as any).upsert(
      { user_id: userId, couple_id: coupleId, endpoint, p256dh, auth },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      console.error("Failed to resync push subscription:", error);
      return { ok: false, error: `DB error: ${error.message}` };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Push resync failed:", e);
    return { ok: false, error: msg };
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
