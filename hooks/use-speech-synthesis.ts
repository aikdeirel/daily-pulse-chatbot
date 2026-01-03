"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeakingState = "idle" | "speaking" | "paused";

export interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  state: SpeakingState;
  isSupported: boolean;
}

/**
 * Get the best available voice for speech synthesis.
 * Prioritizes high-quality system voices (Enhanced/Premium on iOS/Android).
 */
function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    return null;
  }

  // Priority keywords for high-quality voices (case-insensitive)
  const priorityKeywords = [
    "enhanced",
    "premium",
    "natural",
    "neural",
    "wavenet",
    "samantha", // iOS high-quality voice
    "daniel", // iOS high-quality voice
    "karen", // iOS high-quality voice
    "moira", // iOS high-quality voice
    "google", // Google TTS voices on Android
  ];

  // Get English voices first
  const englishVoices = voices.filter(
    (voice) =>
      voice.lang.startsWith("en-") ||
      voice.lang === "en" ||
      voice.lang.toLowerCase().includes("english"),
  );

  const voicePool = englishVoices.length > 0 ? englishVoices : voices;

  // Look for premium/enhanced voices first
  for (const keyword of priorityKeywords) {
    const match = voicePool.find((voice) =>
      voice.name.toLowerCase().includes(keyword),
    );
    if (match) {
      return match;
    }
  }

  // Prefer local voices over remote ones (usually better quality)
  const localVoice = voicePool.find((voice) => voice.localService);
  if (localVoice) {
    return localVoice;
  }

  // Prefer default voice
  const defaultVoice = voicePool.find((voice) => voice.default);
  if (defaultVoice) {
    return defaultVoice;
  }

  // Return first available voice
  return voicePool[0] || null;
}

/**
 * Hook for text-to-speech using the Web Speech Synthesis API.
 * Automatically selects the best available voice.
 */
export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [state, setState] = useState<SpeakingState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check for browser support and load voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Voices may load asynchronously
    const handleVoicesChanged = () => {
      // Voices are now available
    };

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged,
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged,
      );
      // Clean up any ongoing speech
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Get the best voice
    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    // Set speech parameters for natural sounding speech
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setState("speaking");
    };

    utterance.onend = () => {
      setState("idle");
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      // Ignore 'interrupted' errors as they happen when we cancel
      if (event.error !== "interrupted") {
        console.warn("Speech synthesis error:", event.error);
      }
      setState("idle");
      utteranceRef.current = null;
    };

    utterance.onpause = () => {
      setState("paused");
    };

    utterance.onresume = () => {
      setState("speaking");
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setState("idle");
      utteranceRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (window.speechSynthesis && state === "speaking") {
      window.speechSynthesis.pause();
    }
  }, [state]);

  const resume = useCallback(() => {
    if (window.speechSynthesis && state === "paused") {
      window.speechSynthesis.resume();
    }
  }, [state]);

  return {
    speak,
    stop,
    pause,
    resume,
    state,
    isSupported,
  };
}
