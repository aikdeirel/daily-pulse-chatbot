"use client";

import { memo } from "react";
import type { RecordingState } from "@/hooks/use-audio-recorder";
import { cn } from "@/lib/utils";
import { MicrophoneIcon } from "./icons";
import { Button } from "./ui/button";

interface VoiceRecordButtonProps {
  state: RecordingState;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

function PureVoiceRecordButton({
  state,
  onClick,
  disabled = false,
  className,
}: VoiceRecordButtonProps) {
  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  return (
    <Button
      aria-label={
        isRecording
          ? "Stop recording"
          : isProcessing
            ? "Processing audio"
            : "Start voice recording"
      }
      className={cn(
        "relative aspect-square h-8 shrink-0 rounded-lg p-1 transition-all duration-300",
        isRecording
          ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 dark:text-red-400"
          : "hover:bg-accent",
        className,
      )}
      data-testid="voice-record-button"
      disabled={disabled || isProcessing}
      onClick={onClick}
      title={
        isRecording
          ? "Tap to stop recording"
          : isProcessing
            ? "Processing..."
            : "Tap to start recording"
      }
      type="button"
      variant="ghost"
    >
      {/* Pulse animation ring when recording */}
      {isRecording && (
        <span className="absolute inset-0 animate-ping rounded-lg bg-red-500/30" />
      )}

      {/* Secondary pulse ring */}
      {isRecording && (
        <span
          className="absolute inset-0 animate-pulse rounded-lg bg-red-500/20"
          style={{ animationDelay: "150ms" }}
        />
      )}

      {/* Icon */}
      <span className="relative z-10">
        <MicrophoneIcon size={14} />
      </span>
    </Button>
  );
}

export const VoiceRecordButton = memo(PureVoiceRecordButton);
