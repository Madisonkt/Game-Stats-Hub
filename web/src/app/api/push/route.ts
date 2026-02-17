import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { createClient } from "@supabase/supabase-js";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

webPush.setVapidDetails(
  "mailto:cheese-squeeze@example.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/**
 * POST /api/push
 * Body: { coupleId, senderUserId, senderName, message }
 *
 * Sends a push notification to the partner (all devices except the sender).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { coupleId, senderUserId, message } = body;

    if (!coupleId || !senderUserId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Use service role to read partner's push subscriptions
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("couple_id", coupleId)
      .neq("user_id", senderUserId);

    if (error) {
      console.error("Failed to fetch subscriptions:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: "No subscriptions found" });
    }

    const payload = JSON.stringify({
      title: "Cheese Squeeze 🧀",
      body: message,
      data: { url: "/" },
    });

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const pushErr = err as { statusCode?: number };
        console.error("Push send failed:", pushErr);
        // Remove expired/invalid subscriptions (410 Gone or 404)
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
        failed.push(sub.endpoint);
      }
    }

    return NextResponse.json({ sent, failed: failed.length });
  } catch (e) {
    console.error("Push API error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
