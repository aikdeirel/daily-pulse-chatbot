/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Type for timer push notification payload
type TimerPushPayload = {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Handle push notifications for timer events
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: TimerPushPayload;
  try {
    payload = event.data.json() as TimerPushPayload;
  } catch {
    // If parsing fails, use the text as the body
    payload = {
      title: "Timer Finished!",
      body: event.data.text(),
    };
  }

  const { title, body, icon, tag, url } = payload;

  const options = {
    body,
    icon: icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: tag || "timer-notification",
    requireInteraction: true,
    data: { url: url || "/" },
    vibrate: [200, 100, 200, 100, 200],
  } as NotificationOptions;

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl = (event.notification.data?.url as string) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      const normalizedTargetUrl = new URL(targetUrl, self.location.origin);
      // First, try to find a client that's already on the target URL
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          const isSameLocation =
            clientUrl.origin === normalizedTargetUrl.origin &&
            clientUrl.pathname === normalizedTargetUrl.pathname &&
            clientUrl.search === normalizedTargetUrl.search;
          if (isSameLocation && "focus" in client) {
            return client.focus();
          }
        } catch {
          // Ignore malformed URLs and continue checking other clients
        }
      }
      // If no matching URL, try to navigate an existing window
      for (const client of clientList) {
        if ("focus" in client && "navigate" in client) {
          return (client as WindowClient)
            .navigate(targetUrl)
            .then((c) => c?.focus());
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
