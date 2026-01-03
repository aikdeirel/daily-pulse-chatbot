"use client";

import { memo } from "react";
import type { SpeakingState } from "@/hooks/use-speech-synthesis";
import { cn } from "@/lib/utils";
import { SpeakerIcon, SpeakerOffIcon, StopIcon } from "./icons";
import { Button } from "./ui/button";

interface SpeakButtonProps {
  text: string;
  onSpeak: (text: string) => void;
  onStop: () => void;
  state: SpeakingState;
  isSupported: boolean;
  className?: string;
}

function PureSpeakButton({
  text,
  onSpeak,
  onStop,
  state,
  isSupported,
  className,
}: SpeakButtonProps) {
  if (!isSupported) {
    return null;
  }

  const isSpeaking = state === "speaking";
  const isPaused = state === "paused";

  const handleClick = () => {
    if (isSpeaking || isPaused) {
      onStop();
    } else {
      onSpeak(text);
    }
  };

  return (
    <Button
      aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
      className={cn(
        "aspect-square h-7 w-7 shrink-0 rounded-md p-1 transition-colors",
        isSpeaking
          ? "bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 dark:text-orange-400"
          : "hover:bg-accent",
        className,
      )}
      data-testid="speak-button"
      onClick={handleClick}
      title={isSpeaking ? "Stop speaking" : "Read aloud"}
      type="button"
      variant="ghost"
    >
      {isSpeaking ? (
        <StopIcon size={12} />
      ) : isPaused ? (
        <SpeakerOffIcon size={12} />
      ) : (
        <SpeakerIcon size={12} />
      )}
    </Button>
  );
}

export const SpeakButton = memo(PureSpeakButton);
