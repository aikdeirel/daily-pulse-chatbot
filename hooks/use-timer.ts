"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TIMER_STORAGE_KEY = "timer_state";

type TimerStorageState = {
  targetTimestamp: number;
  initialSeconds: number;
  label: string;
  isRunning: boolean;
};

type UseTimerProps = {
  initialSeconds: number;
  label?: string;
  onComplete?: () => void;
};

type UseTimerReturn = {
  remainingSeconds: number;
  isRunning: boolean;
  isCompleted: boolean;
  isStopped: boolean;
  progress: number;
  start: () => void;
  pause: () => void;
  stop: () => void;
  restart: () => void;
  targetTimestamp: number | null;
};

/**
 * Load timer state from localStorage
 */
function loadTimerState(): TimerStorageState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as TimerStorageState;
  } catch {
    return null;
  }
}

/**
 * Save timer state to localStorage
 */
function saveTimerState(state: TimerStorageState | null): void {
  if (typeof window === "undefined") return;

  try {
    if (state === null) {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } else {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Calculate remaining seconds from target timestamp
 */
function calculateRemaining(targetTimestamp: number): number {
  const now = Date.now();
  const remaining = Math.max(0, Math.ceil((targetTimestamp - now) / 1000));
  return remaining;
}

/**
 * A reliable timer hook that uses absolute timestamps as the source of truth.
 * This prevents timer drift when the device is backgrounded or screen is off.
 */
export function useTimer({
  initialSeconds,
  label = "Timer",
  onComplete,
}: UseTimerProps): UseTimerReturn {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [targetTimestamp, setTargetTimestamp] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Calculate progress percentage
  const progress = ((initialSeconds - remainingSeconds) / initialSeconds) * 100;

  // Clean up interval
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Update remaining time from target timestamp
  const updateFromTimestamp = useCallback(
    (target: number) => {
      const remaining = calculateRemaining(target);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearTimerInterval();
        setIsRunning(false);
        setIsCompleted(true);
        setTargetTimestamp(null);
        saveTimerState(null);
        onCompleteRef.current?.();
      }
    },
    [clearTimerInterval],
  );

  // Restore timer state from localStorage on mount
  useEffect(() => {
    const stored = loadTimerState();
    if (!stored) return;

    // Check if the stored timer is still valid
    if (stored.isRunning && stored.targetTimestamp > Date.now()) {
      setTargetTimestamp(stored.targetTimestamp);
      setIsRunning(true);
      updateFromTimestamp(stored.targetTimestamp);
    } else if (stored.targetTimestamp <= Date.now() && stored.isRunning) {
      // Timer expired while app was closed: mark as completed but do NOT call onComplete on mount
      setRemainingSeconds(0);
      setIsCompleted(true);
      saveTimerState(null);
    } else {
      // Clear invalid stored state
      saveTimerState(null);
    }
  }, [updateFromTimestamp]);

  // Handle visibility change
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && targetTimestamp) {
        updateFromTimestamp(targetTimestamp);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [targetTimestamp, updateFromTimestamp]);

  // Timer tick effect
  useEffect(() => {
    if (!isRunning || !targetTimestamp) {
      clearTimerInterval();
      return;
    }

    // Immediate update
    updateFromTimestamp(targetTimestamp);

    // Set up interval for visual updates
    intervalRef.current = setInterval(() => {
      updateFromTimestamp(targetTimestamp);
    }, 1000);

    return clearTimerInterval;
  }, [isRunning, targetTimestamp, updateFromTimestamp, clearTimerInterval]);

  const start = useCallback(() => {
    if (isCompleted || isStopped) return;

    const target = Date.now() + remainingSeconds * 1000;
    setTargetTimestamp(target);
    setIsRunning(true);

    saveTimerState({
      targetTimestamp: target,
      initialSeconds,
      label,
      isRunning: true,
    });
  }, [isCompleted, isStopped, remainingSeconds, initialSeconds, label]);

  const pause = useCallback(() => {
    clearTimerInterval();
    setIsRunning(false);

    if (targetTimestamp) {
      const remaining = calculateRemaining(targetTimestamp);
      setRemainingSeconds(remaining);
    }

    // Update storage to paused state
    saveTimerState(null);
    setTargetTimestamp(null);
  }, [clearTimerInterval, targetTimestamp]);

  const stop = useCallback(() => {
    clearTimerInterval();
    setIsRunning(false);
    setIsStopped(true);
    setTargetTimestamp(null);
    saveTimerState(null);
  }, [clearTimerInterval]);

  const restart = useCallback(() => {
    clearTimerInterval();
    setRemainingSeconds(initialSeconds);
    setIsCompleted(false);
    setIsStopped(false);

    const target = Date.now() + initialSeconds * 1000;
    setTargetTimestamp(target);
    setIsRunning(true);

    saveTimerState({
      targetTimestamp: target,
      initialSeconds,
      label,
      isRunning: true,
    });
  }, [clearTimerInterval, initialSeconds, label]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimerInterval();
    };
  }, [clearTimerInterval]);

  return {
    remainingSeconds,
    isRunning,
    isCompleted,
    isStopped,
    progress,
    start,
    pause,
    stop,
    restart,
    targetTimestamp,
  };
}

export type { UseTimerReturn };
