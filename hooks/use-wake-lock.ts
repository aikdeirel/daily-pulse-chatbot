"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseWakeLockReturn = {
  isSupported: boolean;
  isActive: boolean;
  request: () => Promise<void>;
  release: () => Promise<void>;
};

/**
 * Hook to manage the Screen Wake Lock API.
 * Prevents the device screen from turning off while the timer is active.
 *
 * The wake lock is automatically released when:
 * - The tab becomes hidden (browser behavior)
 * - The component unmounts
 * - release() is called
 *
 * The hook attempts to re-acquire the lock when visibility is restored
 * if shouldBeActive is true.
 */
export function useWakeLock(shouldBeActive: boolean): UseWakeLockReturn {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isSupported =
    typeof navigator !== "undefined" && "wakeLock" in navigator;

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore release errors
      }
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  const request = useCallback(async () => {
    if (!isSupported) return;

    // Don't request if we already have an active lock
    if (wakeLockRef.current) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setIsActive(true);

      // Handle the release event (e.g., when tab becomes hidden)
      wakeLockRef.current.addEventListener("release", () => {
        wakeLockRef.current = null;
        setIsActive(false);
      });
    } catch {
      // Wake lock request failed (e.g., low battery mode)
      setIsActive(false);
    }
  }, [isSupported]);

  // Manage wake lock based on shouldBeActive
  useEffect(() => {
    if (shouldBeActive && isSupported) {
      request();
    } else if (!shouldBeActive) {
      release();
    }
  }, [shouldBeActive, isSupported, request, release]);

  // Re-acquire wake lock when visibility is restored
  useEffect(() => {
    if (!isSupported) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && shouldBeActive) {
        // Re-acquire wake lock when tab becomes visible again
        request();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupported, shouldBeActive, request]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      release();
    };
  }, [release]);

  return {
    isSupported,
    isActive,
    request,
    release,
  };
}
