import webPush from "web-push";
import { prisma } from "@/lib/prisma";

// Configure web-push with VAPID keys
if (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@sentient.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a push notification to an agent's creator.
 */
export async function sendPushToCreator(
  creatorId: string,
  title: string,
  body: string
) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: creatorId },
    });

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      url: "/",
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
      )
    );

    // Clean up expired subscriptions
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "rejected") {
        await prisma.pushSubscription
          .delete({ where: { id: subscriptions[i].id } })
          .catch(() => {});
      }
    }
  } catch (error) {
    console.error("[Push] Failed to send notification:", error);
  }
}
