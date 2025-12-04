"use client";

import { useEffect, useState } from "react";

export const THINKING_PHRASES = [
  "Consulting Spirits",
  "Bribing Neurons",
  "Googling Internally",
  "Summoning Wisdom",
  "Doing Black Magic",
  "Asking Mom",
  "Stealing Thoughts",
  "Caffeinating Brain",
  "Downloading Smartness",
  "Poking Hamsters",
  "Begging ChatGPT",
  "Warming Braincells",
  "Sacrificing RAM",
  "Consulting Crystal Ball",
  "Waking Interns",
  "Spinning Wheels",
  "Vibing Hard",
  "Overthinking Again",
  "Panicking Quietly",
  "Faking Intelligence",
  "Bribing Servers",
  "Manifesting Answer",
  "Buffering Genius",
  "Screaming Internally",
  "Asking Aliens",
  "Pretending Smart",
  "Yeeting Doubts",
  "Consulting Wikipedia",
  "Dusting Neurons",
  "Microwaving Thoughts",
  "Stealing WiFi",
  "Gasping Dramatically",
  "Rolling Dice",
  "Guessing Wildly",
  "Copying Homework",
  "Sweating Profusely",
  "Negotiating Reality",
  "Invoking Demons",
  "Petting Brain",
  "Crunching Numbers",
  "Avoiding Responsibility",
  "Consulting Horoscope",
  "Reticulating Splines",
  "Tickling Servers",
  "Brewing Nonsense",
  "Charging Chakras",
  "Blaming Lag",
  "Trusting Process",
  "Faking Confidence",
  "Praying Silently",
] as const;

const ROTATION_INTERVAL = 7000; // 7 seconds

export function useThinkingPhrase() {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.floor(Math.random() * THINKING_PHRASES.length),
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);

      // After fade out, change the phrase
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
        setIsTransitioning(false);
      }, 150); // Half of the transition duration
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return {
    phrase: THINKING_PHRASES[currentIndex],
    isTransitioning,
  };
}
