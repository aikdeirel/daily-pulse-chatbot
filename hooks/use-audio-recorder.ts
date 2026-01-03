"use client";

import { useCallback, useRef, useState } from "react";

export type RecordingState = "idle" | "recording" | "processing";

export interface AudioRecorderOptions {
  onError?: (error: Error) => void;
}

export interface UseAudioRecorderReturn {
  state: RecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  toggleRecording: () => Promise<Blob | null>;
  audioBlob: Blob | null;
  mimeType: string;
}

/**
 * Get the supported MIME type for audio recording.
 * Safari/iOS prefers audio/mp4, Chrome/Android prefers audio/webm.
 */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }

  // Order by preference: webm is more widely supported, mp4 for Safari/iOS
  const mimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  // Fallback - let the browser decide
  return "";
}

/**
 * Get the file format from MIME type for API submission.
 */
export function getAudioFormat(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm"; // default
}

/**
 * Convert audio blob to base64 string (without data URL prefix).
 */
export async function audioToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Hook for recording audio using the MediaRecorder API.
 * Supports manual toggle (tap to start, tap to stop).
 */
export function useAudioRecorder(
  options: AudioRecorderOptions = {},
): UseAudioRecorderReturn {
  const { onError } = options;

  const [state, setState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Check if MediaRecorder is supported
      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder is not supported in this browser");
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      const supportedMimeType = getSupportedMimeType();
      setMimeType(supportedMimeType);

      const mediaRecorder = new MediaRecorder(
        stream,
        supportedMimeType ? { mimeType: supportedMimeType } : undefined,
      );
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        const error = new Error("MediaRecorder error occurred");
        onError?.(error);
        cleanup();
        setState("idle");
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setState("recording");
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Failed to start recording");

      // Handle specific permission errors
      if (err.name === "NotAllowedError") {
        onError?.(
          new Error("Microphone permission denied. Please allow access."),
        );
      } else if (err.name === "NotFoundError") {
        onError?.(
          new Error("No microphone found. Please connect a microphone."),
        );
      } else {
        onError?.(err);
      }

      cleanup();
      setState("idle");
    }
  }, [cleanup, onError]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state !== "recording") {
        cleanup();
        setState("idle");
        resolve(null);
        return;
      }

      setState("processing");

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        cleanup();
        setState("idle");
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, [cleanup, mimeType]);

  const toggleRecording = useCallback(async (): Promise<Blob | null> => {
    if (state === "recording") {
      return stopRecording();
    }
    if (state === "idle") {
      await startRecording();
    }
    return null;
  }, [state, startRecording, stopRecording]);

  return {
    state,
    startRecording,
    stopRecording,
    toggleRecording,
    audioBlob,
    mimeType,
  };
}
