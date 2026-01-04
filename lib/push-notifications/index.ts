/**
 * Push notification utilities for timer notifications.
 *
 * This module provides both client-side and server-side utilities
 * for managing Web Push notifications.
 */

// Types for push subscription and notification payload
export type TimerPushPayload = {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
};

export type ScheduleTimerPushRequest = {
  subscription: PushSubscription;
  targetTimestamp: number;
  label?: string;
};

export type ScheduleTimerPushResponse = {
  success: boolean;
  scheduledAt?: number;
  error?: string;
};

/**
 * Convert a PushSubscription object to a plain JSON object
 * that can be sent to the server.
 */
export function serializePushSubscription(
  subscription: PushSubscription,
): PushSubscriptionJSON {
  return subscription.toJSON();
}

/**
 * Get the VAPID public key from environment variable.
 * This key is used to identify the application server.
 */
export function getVapidPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

/**
 * Convert base64 VAPID public key to Uint8Array for subscription.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission from the user.
 * Returns true if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("Notification permission was previously denied");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Subscribe to push notifications.
 * Returns the PushSubscription object if successful.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker not supported");
    return null;
  }

  if (!("PushManager" in window)) {
    console.warn("Push notifications not supported");
    return null;
  }

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    console.warn("VAPID public key not configured");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    return subscription;
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error);
    return null;
  }
}

/**
 * Schedule a push notification for the timer.
 */
export async function scheduleTimerPush(
  targetTimestamp: number,
  label?: string,
): Promise<ScheduleTimerPushResponse> {
  try {
    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return { success: false, error: "Notification permission denied" };
    }

    // Get push subscription
    const subscription = await subscribeToPush();
    if (!subscription) {
      return { success: false, error: "Failed to get push subscription" };
    }

    // Send to backend
    const response = await fetch("/api/schedule-timer-push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscription: serializePushSubscription(subscription),
        targetTimestamp,
        label,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Cancel a scheduled push notification.
 */
export async function cancelScheduledPush(
  targetTimestamp: number,
): Promise<boolean> {
  try {
    const response = await fetch("/api/schedule-timer-push", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetTimestamp }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
