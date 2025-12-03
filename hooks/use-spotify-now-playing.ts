import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";

export interface SpotifyNowPlayingTrack {
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  uri: string;
  durationMs: number;
}

export interface SpotifyNowPlayingDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number;
}

export interface SpotifyNowPlayingData {
  connected: boolean;
  isPlaying: boolean;
  track: SpotifyNowPlayingTrack | null;
  progressMs?: number;
  device?: SpotifyNowPlayingDevice;
  error?: string;
  message?: string;
}

const fetcher = async (url: string): Promise<SpotifyNowPlayingData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch now playing");
  }
  return res.json();
};

const POLLING_INTERVAL = 5000; // 5 seconds

export function useSpotifyNowPlaying() {
  const [isVisible, setIsVisible] = useState(true);

  // Track visibility to pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const { data, error, mutate, isValidating } = useSWR<SpotifyNowPlayingData>(
    "/api/spotify/now-playing",
    fetcher,
    {
      refreshInterval: isVisible ? POLLING_INTERVAL : 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    },
  );

  const togglePlayback = useCallback(async () => {
    if (!data?.connected || !data?.track) {
      return { success: false, error: "not_connected" };
    }

    const newIsPlaying = !data.isPlaying;
    const action = newIsPlaying ? "play" : "pause";

    // Optimistic update
    mutate(
      { ...data, isPlaying: newIsPlaying },
      false, // Don't revalidate immediately
    );

    try {
      const res = await fetch("/api/spotify/playback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const result = await res.json();

      if (!res.ok) {
        // Revert optimistic update on error
        mutate(data, false);
        return { success: false, error: result.error, message: result.message };
      }

      // Refetch after successful action to get accurate state
      setTimeout(() => mutate(), 500);

      return { success: true };
    } catch (err) {
      // Revert optimistic update on error
      mutate(data, false);
      return { success: false, error: "network_error" };
    }
  }, [data, mutate]);

  return {
    data: data ?? { connected: false, isPlaying: false, track: null },
    error,
    isLoading: !data && !error,
    isValidating,
    togglePlayback,
    refresh: () => mutate(),
  };
}
