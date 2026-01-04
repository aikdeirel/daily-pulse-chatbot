import type { NextRequest } from "next/server";
import webPush from "web-push";

export const dynamic = "force-dynamic";

// Store scheduled timers in memory
// In production, you would use a persistent store like Redis or a database
const scheduledTimers = new Map<
  string,
  { timeout: ReturnType<typeof setTimeout>; targetTimestamp: number }
>();

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

type PushSubscriptionJSON = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type ScheduleRequest = {
  subscription: PushSubscriptionJSON;
  targetTimestamp: number;
  label?: string;
};

/**
 * Generate a unique key for the scheduled timer
 */
function getTimerKey(endpoint: string, timestamp: number): string {
  return `${endpoint}:${timestamp}`;
}

/**
 * Schedule a push notification
 */
async function schedulePushNotification(
  subscription: PushSubscriptionJSON,
  targetTimestamp: number,
  label: string,
): Promise<void> {
  const delay = Math.max(0, targetTimestamp - Date.now());
  const timerKey = getTimerKey(subscription.endpoint, targetTimestamp);

  // Clear any existing timer with the same key
  const existing = scheduledTimers.get(timerKey);
  if (existing) {
    clearTimeout(existing.timeout);
    scheduledTimers.delete(timerKey);
  }

  // Schedule the notification
  const timeout = setTimeout(async () => {
    try {
      const payload = JSON.stringify({
        title: "Timer Finished!",
        body: `Your "${label}" timer has completed.`,
        icon: "/icon-192.png",
        tag: `timer-${targetTimestamp}`,
        url: "/",
      });

      await webPush.sendNotification(subscription, payload);
    } catch (error) {
      // If push fails (e.g., subscription expired), log and continue
      console.error("Failed to send push notification:", error);
    } finally {
      // Clean up the timer from storage
      scheduledTimers.delete(timerKey);
    }
  }, delay);

  // Store the timer reference
  scheduledTimers.set(timerKey, { timeout, targetTimestamp });
}

/**
 * POST /api/schedule-timer-push
 * Schedule a push notification for a timer
 */
export async function POST(request: NextRequest) {
  // Check if VAPID keys are configured
  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Push notifications not configured. VAPID keys are missing.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = (await request.json()) as ScheduleRequest;
    const { subscription, targetTimestamp, label = "Timer" } = body;

    // Validate subscription
    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid push subscription" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate timestamp
    if (!targetTimestamp || targetTimestamp <= Date.now()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Target timestamp must be in the future",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Schedule the notification
    await schedulePushNotification(subscription, targetTimestamp, label);

    return new Response(
      JSON.stringify({ success: true, scheduledAt: targetTimestamp }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error scheduling push notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to schedule push" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * DELETE /api/schedule-timer-push
 * Cancel a scheduled push notification
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      targetTimestamp: number;
      endpoint?: string;
    };
    const { targetTimestamp, endpoint } = body;

    if (!targetTimestamp) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing targetTimestamp" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // If endpoint is provided, cancel specific timer
    // Otherwise, cancel all timers for this timestamp
    let cancelled = false;

    if (endpoint) {
      const timerKey = getTimerKey(endpoint, targetTimestamp);
      const timer = scheduledTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer.timeout);
        scheduledTimers.delete(timerKey);
        cancelled = true;
      }
    } else {
      // Cancel all timers matching this timestamp
      for (const [key, value] of scheduledTimers.entries()) {
        if (value.targetTimestamp === targetTimestamp) {
          clearTimeout(value.timeout);
          scheduledTimers.delete(key);
          cancelled = true;
        }
      }
    }

    return new Response(JSON.stringify({ success: cancelled }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error cancelling scheduled push:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to cancel push" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
