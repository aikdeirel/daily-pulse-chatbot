import type { NextRequest } from "next/server";
import webPush from "web-push";

export const dynamic = "force-dynamic";

/**
 * IMPORTANT: Serverless Environment Limitations
 *
 * This implementation uses in-memory storage (Map) and setTimeout for scheduling.
 * These approaches have significant limitations:
 *
 * 1. In-memory storage does NOT persist across server restarts or work correctly
 *    in serverless environments (Vercel, AWS Lambda) where multiple instances
 *    may handle requests. Scheduled timers will be lost on restart.
 *
 * 2. setTimeout-based scheduling will NOT work in serverless environments where
 *    the function execution ends before the timer fires.
 *
 * For production use, consider:
 * - Vercel Cron Jobs or Upstash QStash for scheduled tasks
 * - Redis or database for persistent timer storage
 * - A dedicated long-running Node.js server
 *
 * This implementation is suitable for:
 * - Development and testing
 * - Self-hosted deployments with a persistent Node.js server
 */

// Store scheduled timers in memory (see limitations above)
const scheduledTimers = new Map<
  string,
  { timeout: ReturnType<typeof setTimeout>; targetTimestamp: number }
>();

// Maximum allowed delay: 24 hours (in milliseconds)
const MAX_DELAY_MS = 24 * 60 * 60 * 1000;

// Maximum label length
const MAX_LABEL_LENGTH = 100;

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
 * Sanitize label to prevent injection attacks.
 * Removes control characters and limits length.
 */
function sanitizeLabel(label: string): string {
  // Remove control characters (ASCII 0-31 and 127) and trim whitespace
  // Using character code check instead of regex with control characters
  const sanitizedChars: string[] = [];
  for (const char of label) {
    const code = char.charCodeAt(0);
    if (code >= 32 && code !== 127) {
      sanitizedChars.push(char);
    }
  }
  const sanitized = sanitizedChars.join("").trim().slice(0, MAX_LABEL_LENGTH);
  return sanitized || "Timer";
}

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

  // Clear any existing timer with the same key (atomic-like operation)
  const existing = scheduledTimers.get(timerKey);
  if (existing) {
    clearTimeout(existing.timeout);
    scheduledTimers.delete(timerKey);
  }

  // Sanitize the label before using it
  const safeLabel = sanitizeLabel(label);

  // Schedule the notification
  const timeout = setTimeout(async () => {
    try {
      const payload = JSON.stringify({
        title: "Timer Finished!",
        body: `Your "${safeLabel}" timer has completed.`,
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
 *
 * Note: This endpoint has no authentication or rate limiting.
 * For production use, implement proper authentication and rate limiting.
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

    // Validate timestamp is in the future
    const now = Date.now();
    if (!targetTimestamp || targetTimestamp <= now) {
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

    // Validate timestamp is not too far in the future (max 24 hours)
    if (targetTimestamp - now > MAX_DELAY_MS) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Target timestamp cannot be more than 24 hours in the future",
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
 *
 * Note: This endpoint requires the subscription endpoint for proper authorization.
 * Without authentication, cancellation is limited to matching endpoint+timestamp.
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

    // Require endpoint for more secure cancellation
    if (!endpoint) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing endpoint for authorization",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const timerKey = getTimerKey(endpoint, targetTimestamp);
    const timer = scheduledTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer.timeout);
      scheduledTimers.delete(timerKey);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: "Timer not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
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
