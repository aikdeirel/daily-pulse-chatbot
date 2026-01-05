"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TimerState = {
  /** Absolute timestamp when timer should complete (ms since epoch) */
  targetTimestamp: number;
};

type UsePersistentTimerProps = {
  /** Unique identifier for this timer instance (e.g., toolCallId) */
  timerId: string;
  /** Initial duration in seconds */
  initialSeconds: number;
  /** Called when timer completes */
  onComplete?: () => void;
  /** If true, timer was loaded from history and should not auto-start */
  isFromHistory?: boolean;
};

type UsePersistentTimerReturn = {
  remainingSeconds: number;
  isRunning: boolean;
  isCompleted: boolean;
  isStopped: boolean;
  progress: number;
  start: () => void;
  pause: () => void;
  stop: () => void;
  restart: () => void;
};

const getStorageKey = (timerId: string) => `timer_state_${timerId}`;

/**
 * A persistent timer hook that uses absolute timestamps to prevent drift
 * when the browser throttles JS (e.g., screen off, app backgrounded).
 *
 * The timer recalculates remaining time on visibility change, ensuring
 * accurate time display when the user returns to the app.
 */
export function usePersistentTimer({
  timerId,
  initialSeconds,
  onComplete,
  isFromHistory = false,
}: UsePersistentTimerProps): UsePersistentTimerReturn {
  const STORAGE_KEY = getStorageKey(timerId);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  const targetTimestampRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const progress =
    initialSeconds === 0
      ? 100
      : ((initialSeconds - remainingSeconds) / initialSeconds) * 100;

  // Calculate remaining seconds from target timestamp
  const calcRemaining = useCallback((target: number): number => {
    return Math.max(0, Math.ceil((target - Date.now()) / 1000));
  }, []);

  // Clear the interval
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Persist state to localStorage
  const saveState = useCallback((state: TimerState | null) => {
    try {
      if (typeof window === "undefined") return;
      if (state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  // Complete the timer
  const completeTimer = useCallback(() => {
    clearTimer();
    setRemainingSeconds(0);
    setIsRunning(false);
    setIsCompleted(true);
    targetTimestampRef.current = null;
    saveState(null);
    onCompleteRef.current?.();
  }, [clearTimer, saveState]);

  // Update remaining time from target timestamp
  const updateFromTarget = useCallback(
    (target: number) => {
      const remaining = calcRemaining(target);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        completeTimer();
      }
    },
    [calcRemaining, completeTimer],
  );

  // Restore state from localStorage on mount
  useEffect(() => {
    // If loaded from history, don't restore - start fresh with initial seconds
    if (isFromHistory) return;

    try {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const state: TimerState = JSON.parse(stored);
      if (!state.targetTimestamp) return;

      const remaining = calcRemaining(state.targetTimestamp);

      if (remaining > 0) {
        // Timer still running - restore it
        targetTimestampRef.current = state.targetTimestamp;
        setRemainingSeconds(remaining);
        setIsRunning(true);
      } else {
        // Timer expired while away - mark as completed
        setRemainingSeconds(0);
        setIsCompleted(true);
        saveState(null);
        // Note: We don't call onComplete here to avoid unexpected sounds on mount
      }
    } catch {
      // Invalid stored state
      saveState(null);
    }
  }, [calcRemaining, saveState]);

  // Handle visibility change - recalculate time when app becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        targetTimestampRef.current
      ) {
        updateFromTarget(targetTimestampRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [updateFromTarget]);

  // Timer tick effect
  useEffect(() => {
    if (!isRunning || !targetTimestampRef.current) {
      clearTimer();
      return;
    }

    // Initial update
    updateFromTarget(targetTimestampRef.current);

    // Tick every second for UI updates
    intervalRef.current = setInterval(() => {
      if (targetTimestampRef.current) {
        updateFromTarget(targetTimestampRef.current);
      }
    }, 1000);

    return clearTimer;
  }, [isRunning, updateFromTarget, clearTimer]);

  const start = useCallback(() => {
    if (isCompleted) return;

    setIsStopped(false);
    const target = Date.now() + remainingSeconds * 1000;
    targetTimestampRef.current = target;
    setIsRunning(true);
    saveState({ targetTimestamp: target });
  }, [isCompleted, remainingSeconds, initialSeconds, saveState]);

  const pause = useCallback(() => {
    if (!targetTimestampRef.current) return;

    const remaining = calcRemaining(targetTimestampRef.current);

    // If timer completed while pausing, finalize instead
    if (remaining <= 0) {
      completeTimer();
      return;
    }

    clearTimer();
    setRemainingSeconds(remaining);
    setIsRunning(false);
    targetTimestampRef.current = null;
    saveState(null);
  }, [clearTimer, calcRemaining, saveState, completeTimer]);

  const stop = useCallback(() => {
    clearTimer();
    setRemainingSeconds(initialSeconds);
    setIsRunning(false);
    setIsStopped(true);
    targetTimestampRef.current = null;
    saveState(null);
  }, [clearTimer, initialSeconds, saveState]);

  const restart = useCallback(() => {
    clearTimer();
    setRemainingSeconds(initialSeconds);
    setIsCompleted(false);
    setIsStopped(false);

    const target = Date.now() + initialSeconds * 1000;
    targetTimestampRef.current = target;
    setIsRunning(true);
    saveState({ targetTimestamp: target });
  }, [clearTimer, initialSeconds, saveState]);

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
  };
}
