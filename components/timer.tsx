"use client";

import cx from "classnames";
import {
  BellIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  Square,
  TimerIcon,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTimer } from "@/hooks/use-timer";
import { useWakeLock } from "@/hooks/use-wake-lock";
import {
  cancelScheduledPush,
  scheduleTimerPush,
} from "@/lib/push-notifications";

type TimerData = {
  seconds: number;
  label?: string;
  // startedAt can be used for more accurate time tracking if component is recreated
  startedAt?: number;
};

type TimerProps = {
  timerData?: TimerData;
};

// Sample data for preview/fallback
const SAMPLE: TimerData = {
  seconds: 480, // 8 minutes
  label: "Timer",
  startedAt: Date.now(),
};

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Cute procedural sound generation using Web Audio API
function playCuteSound(audioContext: AudioContext): void {
  const now = audioContext.currentTime;

  // Create a cute melody pattern (like a music box or chime)
  const notes = [523.25, 659.25, 783.99, 659.25, 523.25]; // C5, E5, G5, E5, C5
  const noteDuration = 0.15;
  const noteGap = 0.05;

  notes.forEach((freq, index) => {
    const startTime = now + index * (noteDuration + noteGap);

    // Main oscillator for the melody
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, startTime);

    // Add a slight vibrato for cuteness
    const vibrato = audioContext.createOscillator();
    const vibratoGain = audioContext.createGain();
    vibrato.frequency.setValueAtTime(6, startTime);
    vibratoGain.gain.setValueAtTime(3, startTime);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(oscillator.frequency);
    vibrato.start(startTime);
    vibrato.stop(startTime + noteDuration);

    // Envelope for each note - increased volume
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + noteDuration);

    // Add a soft high harmonic for sparkle - increased volume
    const harmonic = audioContext.createOscillator();
    const harmonicGain = audioContext.createGain();
    harmonic.type = "sine";
    harmonic.frequency.setValueAtTime(freq * 2, startTime);
    harmonicGain.gain.setValueAtTime(0, startTime);
    harmonicGain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    harmonicGain.gain.exponentialRampToValueAtTime(
      0.01,
      startTime + noteDuration,
    );
    harmonic.connect(harmonicGain);
    harmonicGain.connect(audioContext.destination);
    harmonic.start(startTime);
    harmonic.stop(startTime + noteDuration);
  });

  // Add a final chime at the end - increased volume
  const chimeTime = now + notes.length * (noteDuration + noteGap);
  const chime = audioContext.createOscillator();
  const chimeGain = audioContext.createGain();
  chime.type = "triangle";
  chime.frequency.setValueAtTime(1046.5, chimeTime); // C6
  chimeGain.gain.setValueAtTime(0, chimeTime);
  chimeGain.gain.linearRampToValueAtTime(0.7, chimeTime + 0.01);
  chimeGain.gain.exponentialRampToValueAtTime(0.01, chimeTime + 0.5);
  chime.connect(chimeGain);
  chimeGain.connect(audioContext.destination);
  chime.onended = () => {
    try {
      chime.disconnect();
    } catch {
      // ignore if already disconnected or context is closed
    }
    try {
      chimeGain.disconnect();
    } catch {
      // ignore if already disconnected or context is closed
    }
  };
  chime.start(chimeTime);
  chime.stop(chimeTime + 0.5);
}

export function Timer({ timerData }: TimerProps) {
  // Use SAMPLE as fallback if timerData is undefined or missing required data
  const data =
    timerData?.seconds !== undefined && timerData.seconds > 0
      ? timerData
      : SAMPLE;

  // Sound playback state
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [soundWasStopped, setSoundWasStopped] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track if push notification was scheduled
  const scheduledPushRef = useRef<number | null>(null);

  // Cleanup audio context
  const cleanupAudio = useCallback(() => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.suspend().catch(() => {});
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsSoundPlaying(false);
  }, []);

  // Play completion sound
  const playSound = useCallback(() => {
    if (
      !audioContextRef.current ||
      audioContextRef.current.state === "closed"
    ) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    setIsSoundPlaying(true);
    playCuteSound(audioContextRef.current);

    soundIntervalRef.current = setInterval(() => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        playCuteSound(audioContextRef.current);
      }
    }, 2000);
  }, []);

  // Handle timer completion
  const handleComplete = useCallback(() => {
    // Clear scheduled push reference on completion
    scheduledPushRef.current = null;
  }, []);

  // Use the timer hook with absolute timestamp tracking
  const timer = useTimer({
    initialSeconds: data.seconds,
    label: data.label,
    onComplete: handleComplete,
  });

  // Use wake lock to prevent device sleep while timer is running
  useWakeLock(timer.isRunning);

  // Play sound when completed (but only if user hasn't stopped it)
  useEffect(() => {
    if (timer.isCompleted && !isSoundPlaying && !soundWasStopped) {
      playSound();
    }
  }, [timer.isCompleted, isSoundPlaying, soundWasStopped, playSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      // Cancel any scheduled push notification
      if (scheduledPushRef.current) {
        cancelScheduledPush(scheduledPushRef.current);
      }
    };
  }, [cleanupAudio]);

  // Handle start/resume
  const handleStart = async () => {
    if (timer.isCompleted || timer.isStopped) return;

    // Calculate target timestamp BEFORE starting timer to ensure accuracy
    const targetTimestamp = Date.now() + timer.remainingSeconds * 1000;
    timer.start();

    // Schedule push notification for fail-safe alarm
    try {
      const result = await scheduleTimerPush(targetTimestamp, data.label);
      if (result.success && result.scheduledAt) {
        scheduledPushRef.current = result.scheduledAt;
      } else {
        // Log failure so it is not silently ignored
        console.error("Failed to schedule timer push notification", {
          targetTimestamp,
          label: data.label,
          result,
        });
      }
    } catch (error) {
      // Ensure thrown errors are also surfaced
      console.error("Error while scheduling timer push notification", error);
    }
  };

  // Handle pause
  const handlePause = async () => {
    timer.pause();

    // Cancel scheduled push notification when paused
    if (scheduledPushRef.current) {
      const cancelled = await cancelScheduledPush(scheduledPushRef.current);
      if (!cancelled) {
        console.error("Failed to cancel scheduled push notification on pause");
      }
      scheduledPushRef.current = null;
    }
  };

  // Toggle pause/resume
  const togglePause = () => {
    if (!timer.isCompleted) {
      if (timer.isRunning) {
        handlePause();
      } else {
        handleStart();
      }
    }
  };

  // Handle stop
  const handleStop = async () => {
    timer.stop();
    cleanupAudio();

    // Cancel scheduled push notification
    if (scheduledPushRef.current) {
      const cancelled = await cancelScheduledPush(scheduledPushRef.current);
      if (!cancelled) {
        console.error("Failed to cancel scheduled push notification on stop");
      }
      scheduledPushRef.current = null;
    }
  };

  // Handle end sound
  const handleEndSound = () => {
    setSoundWasStopped(true);
    cleanupAudio();
  };

  // Handle restart
  const handleRestart = async () => {
    cleanupAudio();
    setSoundWasStopped(false);
    setIsSoundPlaying(false);

    // Cancel any existing scheduled push
    if (scheduledPushRef.current) {
      const cancelled = await cancelScheduledPush(scheduledPushRef.current);
      if (!cancelled) {
        console.error(
          "Failed to cancel scheduled push notification on restart",
        );
      }
    }

    // Restart the timer and get the exact target timestamp it will use
    const targetTimestamp = timer.restart();
    // Schedule new push notification
    try {
      const result = await scheduleTimerPush(targetTimestamp, data.label);
      if (result.success && result.scheduledAt) {
        scheduledPushRef.current = result.scheduledAt;
      } else {
        console.error("Failed to schedule timer push notification on restart", {
          targetTimestamp,
          label: data.label,
          result,
        });
      }
    } catch (error) {
      console.error(
        "Error while scheduling timer push notification on restart",
        error,
      );
    }
  };

  return (
    <div
      className={cx(
        "relative flex w-full flex-col gap-4 overflow-hidden rounded-3xl p-6 shadow-lg backdrop-blur-sm",
        {
          "bg-gradient-to-br from-teal-400 via-cyan-500 to-teal-600":
            !timer.isCompleted && !timer.isStopped,
        },
        {
          "bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600 animate-pulse":
            timer.isCompleted,
        },
        {
          "bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600":
            timer.isStopped,
        },
      )}
    >
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="font-medium text-sm text-white/80">
            {data.label || "Timer"}
          </div>
          {timer.isCompleted && (
            <div className="animate-bounce rounded-full bg-white/20 px-3 py-1 font-medium text-sm text-white">
              Time&apos;s up!
            </div>
          )}
          {timer.isStopped && (
            <div className="rounded-full bg-white/20 px-3 py-1 font-medium text-sm text-white">
              Stopped
            </div>
          )}
        </div>

        {/* Main display */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cx("text-white/90", {
                "text-yellow-200": !timer.isCompleted && !timer.isStopped,
                "text-white animate-bounce": timer.isCompleted,
                "text-white/60": timer.isStopped,
              })}
            >
              {timer.isCompleted ? (
                <BellIcon className="size-12" />
              ) : (
                <TimerIcon className="size-12" />
              )}
            </div>
            <div
              className="font-light text-5xl text-white tabular-nums"
              role="timer"
              aria-live="polite"
              aria-label={`${formatTime(timer.remainingSeconds)} remaining`}
            >
              {formatTime(timer.remainingSeconds)}
            </div>
          </div>

          {/* Progress indicator (only when running) */}
          {!timer.isCompleted && !timer.isStopped && (
            <div
              className="text-right"
              role="status"
              aria-live="polite"
              aria-label={`${Math.round(timer.progress)} percent complete`}
            >
              <div
                className="font-medium text-sm text-white/90"
                aria-hidden="true"
              >
                {Math.round(timer.progress)}%
              </div>
              <div className="text-sm text-white/70" aria-hidden="true">
                complete
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className={cx(
              "h-full rounded-full transition-all duration-1000 ease-linear",
              {
                "bg-gradient-to-r from-yellow-300 to-white":
                  !timer.isCompleted && !timer.isStopped,
                "bg-gradient-to-r from-white to-pink-200 animate-pulse":
                  timer.isCompleted,
                "bg-gradient-to-r from-slate-300 to-slate-200": timer.isStopped,
              },
            )}
            style={{ width: `${timer.isCompleted ? 100 : timer.progress}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(timer.isCompleted ? 100 : timer.progress)}
            aria-label="Timer progress"
          />
        </div>

        {/* Control buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {/* Pause/Resume button - only show when running (not completed or stopped) */}
          {!timer.isCompleted && !timer.isStopped && (
            <button
              onClick={togglePause}
              type="button"
              className={cx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-sm transition-all active:scale-95",
                "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm",
                "min-h-[48px]", // Mobile-friendly touch target
              )}
            >
              {timer.isRunning ? (
                <>
                  <PauseIcon className="size-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <PlayIcon className="size-5" />
                  <span>Resume</span>
                </>
              )}
            </button>
          )}

          {/* Stop button - show when timer is running (not completed or stopped) */}
          {!timer.isCompleted && !timer.isStopped && (
            <button
              onClick={handleStop}
              type="button"
              className={cx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-sm transition-all active:scale-95",
                "bg-white/10 text-white/90 hover:bg-white/20 backdrop-blur-sm",
                "min-h-[48px]", // Mobile-friendly touch target
              )}
            >
              <Square className="size-5" />
              <span>Stop Timer</span>
            </button>
          )}

          {/* End sound button - only show when completed and sound is playing */}
          {timer.isCompleted && isSoundPlaying && (
            <button
              onClick={handleEndSound}
              type="button"
              className={cx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-sm transition-all active:scale-95",
                "bg-white/30 text-white hover:bg-white/40 backdrop-blur-sm",
                "min-h-[48px]", // Mobile-friendly touch target
                "ring-2 ring-white/50 ring-offset-2 ring-offset-transparent",
              )}
            >
              <VolumeX className="size-5" />
              <span>Stop Sound</span>
            </button>
          )}

          {/* Restart button - show when timer is completed or stopped */}
          {(timer.isCompleted || timer.isStopped) && (
            <button
              onClick={handleRestart}
              type="button"
              className={cx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-sm transition-all active:scale-95",
                "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm",
                "min-h-[48px]", // Mobile-friendly touch target
              )}
            >
              <RotateCcwIcon className="size-5" />
              <span>Restart Timer</span>
            </button>
          )}
        </div>

        {/* Initial duration info */}
        <div className="mt-4 flex justify-center text-white/60 text-xs">
          <span>
            Initial: {formatTime(data.seconds)} ({data.seconds}s)
          </span>
        </div>
      </div>
    </div>
  );
}
