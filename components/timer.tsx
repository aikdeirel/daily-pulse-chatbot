"use client";

import cx from "classnames";
import {
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  Square,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

// Timer Icon SVG
const TimerIcon = ({ size = 48 }: { size?: number }) => (
  <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <circle
      cx="12"
      cy="13"
      fill="none"
      r="8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 9v4l2 2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <path
      d="M9 2h6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
    <path
      d="M12 2v2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
);

// Bell Icon for completed state
const BellIcon = ({ size = 48 }: { size?: number }) => (
  <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <path
      d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <path
      d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <circle cx="12" cy="8" fill="currentColor" r="1" className="animate-ping" />
  </svg>
);

export function Timer({ timerData }: TimerProps) {
  // Use SAMPLE as fallback if timerData is undefined or missing required data
  const data =
    timerData?.seconds !== undefined && timerData.seconds > 0
      ? timerData
      : SAMPLE;

  const [remainingSeconds, setRemainingSeconds] = useState(data.seconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isStopped, setIsStopped] = useState(false); // Stopped manually without completion
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [soundWasStopped, setSoundWasStopped] = useState(false); // Track if user stopped the sound
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate progress percentage
  const totalSeconds = data.seconds;
  const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  // Cleanup audio context - creates a new context to stop all scheduled sounds
  const cleanupAudio = useCallback(() => {
    // Clear the repeating sound interval
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    // Close and nullify the audio context to stop all scheduled sounds immediately
    if (audioContextRef.current) {
      // Suspend first to stop audio immediately, then close
      audioContextRef.current.suspend().catch(() => {});
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsSoundPlaying(false);
  }, []);

  // Play completion sound
  const playSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    setIsSoundPlaying(true);
    playCuteSound(audioContextRef.current);

    // Repeat the sound every 2 seconds until stopped
    soundIntervalRef.current = setInterval(() => {
      if (audioContextRef.current) {
        playCuteSound(audioContextRef.current);
      }
    }, 2000);
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev === 1) {
            setIsRunning(false);
            setIsCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, remainingSeconds]);

  // Play sound when completed (but only if user hasn't stopped it)
  useEffect(() => {
    if (isCompleted && !isSoundPlaying && !soundWasStopped) {
      playSound();
    }
  }, [isCompleted, isSoundPlaying, soundWasStopped, playSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cleanupAudio]);

  // Handle pause/resume
  const togglePause = () => {
    if (!isCompleted) {
      setIsRunning((prev) => !prev);
    }
  };

  // Handle stop (end timer completely without playing sound)
  const handleStop = () => {
    setIsRunning(false);
    setIsStopped(true); // Mark as stopped, not completed
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Ensure any audio is cleaned up (safety measure)
    cleanupAudio();
  };

  // Handle end sound
  const handleEndSound = () => {
    setSoundWasStopped(true); // Prevent sound from restarting
    cleanupAudio();
  };

  // Handle restart timer
  const handleRestart = () => {
    // Clean up any existing audio
    cleanupAudio();
    // Reset all states
    setRemainingSeconds(data.seconds);
    setIsRunning(true);
    setIsCompleted(false);
    setIsStopped(false);
    setSoundWasStopped(false);
    setIsSoundPlaying(false);
  };

  return (
    <div
      className={cx(
        "relative flex w-full flex-col gap-4 overflow-hidden rounded-3xl p-6 shadow-lg backdrop-blur-sm",
        {
          "bg-gradient-to-br from-teal-400 via-cyan-500 to-teal-600":
            !isCompleted && !isStopped,
        },
        {
          "bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600 animate-pulse":
            isCompleted,
        },
        {
          "bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600":
            isStopped,
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
          {isCompleted && (
            <div className="animate-bounce rounded-full bg-white/20 px-3 py-1 font-medium text-sm text-white">
              Time&apos;s up!
            </div>
          )}
          {isStopped && (
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
                "text-yellow-200": !isCompleted && !isStopped,
                "text-white animate-bounce": isCompleted,
                "text-white/60": isStopped,
              })}
            >
              {isCompleted ? <BellIcon size={48} /> : <TimerIcon size={48} />}
            </div>
            <div
              className="font-light text-5xl text-white tabular-nums"
              role="timer"
              aria-live="polite"
              aria-label={`${formatTime(remainingSeconds)} remaining`}
            >
              {formatTime(remainingSeconds)}
            </div>
          </div>

          {/* Progress indicator (only when running) */}
          {!isCompleted && !isStopped && (
            <div
              className="text-right"
              role="status"
              aria-live="polite"
              aria-label={`${Math.round(progress)} percent complete`}
            >
              <div className="font-medium text-sm text-white/90" aria-hidden="true">
                {Math.round(progress)}%
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
                  !isCompleted && !isStopped,
                "bg-gradient-to-r from-white to-pink-200 animate-pulse":
                  isCompleted,
                "bg-gradient-to-r from-slate-300 to-slate-200": isStopped,
              },
            )}
            style={{ width: `${isCompleted ? 100 : progress}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(isCompleted ? 100 : progress)}
            aria-label="Timer progress"
          />
        </div>

        {/* Control buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {/* Pause/Resume button - only show when running (not completed or stopped) */}
          {!isCompleted && !isStopped && (
            <button
              onClick={togglePause}
              type="button"
              className={cx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-sm transition-all active:scale-95",
                "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm",
                "min-h-[48px]", // Mobile-friendly touch target
              )}
            >
              {isRunning ? (
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
          {!isCompleted && !isStopped && (
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
          {isCompleted && isSoundPlaying && (
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
          {(isCompleted || isStopped) && (
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
