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
  const mountedRef = useRef(true);
  const releaseListenerRef = useRef<(() => void) | null>(null);
  const isSupported =
    typeof navigator !== "undefined" && "wakeLock" in navigator;

  const release = useCallback(async () => {
    // Remove existing release listener before releasing
    if (wakeLockRef.current && releaseListenerRef.current) {
      wakeLockRef.current.removeEventListener(
        "release",
        releaseListenerRef.current,
      );
      releaseListenerRef.current = null;
    }

    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore release errors
      }
      wakeLockRef.current = null;
      if (mountedRef.current) {
        setIsActive(false);
      }
    }
  }, []);

  const request = useCallback(async () => {
    if (!isSupported) return;

    // Don't request if we already have an active lock
    if (wakeLockRef.current) return;

    try {
      const sentinel = await navigator.wakeLock.request("screen");

      // Check if component unmounted during async request
      if (!mountedRef.current) {
        sentinel.release().catch(() => {});
        return;
      }

      // Double-check mount status before setting refs or state
      if (!mountedRef.current) {
        sentinel.release().catch(() => {});
        return;
      }
      wakeLockRef.current = sentinel;
      setIsActive(true);

      // Create and store the release handler for cleanup
      const handleRelease = () => {
        wakeLockRef.current = null;
        releaseListenerRef.current = null;
        if (mountedRef.current) {
          setIsActive(false);
        }
      };
      releaseListenerRef.current = handleRelease;
      sentinel.addEventListener("release", handleRelease);
    } catch {
      // Wake lock request failed (e.g., low battery mode)
      if (mountedRef.current) {
        setIsActive(false);
      }
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
      // Only request if visible, should be active, AND we don't already have a lock
      if (
        document.visibilityState === "visible" &&
        shouldBeActive &&
        !wakeLockRef.current
      ) {
        request();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupported, shouldBeActive, request]);

  // Track mounted state and cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Inline cleanup to avoid stale closure issues
      if (wakeLockRef.current) {
        if (releaseListenerRef.current) {
          wakeLockRef.current.removeEventListener(
            "release",
            releaseListenerRef.current,
          );
        }
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isActive,
    request,
    release,
  };
}
