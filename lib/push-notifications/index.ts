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
 * Returns an object with success status and error details.
 */
export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  error?: string;
}> {
  if (!("Notification" in window)) {
    const error = "This browser does not support notifications";
    console.error("Push notifications:", error);
    return { granted: false, error };
  }

  if (Notification.permission === "granted") {
    return { granted: true };
  }

  if (Notification.permission === "denied") {
    const error = "Notification permission was previously denied";
    console.error("Push notifications:", error);
    return { granted: false, error };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { granted: false, error: "Notification permission not granted" };
  }
  return { granted: true };
}

/**
 * Subscribe to push notifications.
 * Returns the PushSubscription object if successful, or an error message.
 */
export async function subscribeToPush(): Promise<{
  subscription: PushSubscription | null;
  error?: string;
}> {
  if (!("serviceWorker" in navigator)) {
    const error = "Service Worker not supported";
    console.error("Push notifications:", error);
    return { subscription: null, error };
  }

  if (!("PushManager" in window)) {
    const error = "Push notifications not supported";
    console.error("Push notifications:", error);
    return { subscription: null, error };
  }

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    const error = "VAPID public key not configured";
    console.error("Push notifications:", error);
    return { subscription: null, error };
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

    return { subscription };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown subscription error";
    console.error("Failed to subscribe to push notifications:", error);
    return { subscription: null, error: message };
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
    const permissionResult = await requestNotificationPermission();
    if (!permissionResult.granted) {
      return {
        success: false,
        error: permissionResult.error || "Notification permission denied",
      };
    }

    // Get push subscription
    const subscriptionResult = await subscribeToPush();
    if (!subscriptionResult.subscription) {
      return {
        success: false,
        error: subscriptionResult.error || "Failed to get push subscription",
      };
    }

    // Send to backend
    const response = await fetch("/api/schedule-timer-push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscription: serializePushSubscription(
          subscriptionResult.subscription,
        ),
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
    console.error("Error scheduling timer push:", error);
    return { success: false, error: message };
  }
}

/**
 * Cancel a scheduled push notification.
 * Returns success status and logs any errors.
 */
export async function cancelScheduledPush(
  targetTimestamp: number,
): Promise<boolean> {
  try {
    // Get the subscription endpoint for authorization
    const subscriptionResult = await subscribeToPush();
    const endpoint = subscriptionResult.subscription?.endpoint;

    const response = await fetch("/api/schedule-timer-push", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetTimestamp, endpoint }),
    });

    if (!response.ok) {
      console.error(
        "Failed to cancel scheduled push:",
        response.status,
        await response.text(),
      );
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("Error cancelling scheduled push:", error);
    return false;
  }
}
