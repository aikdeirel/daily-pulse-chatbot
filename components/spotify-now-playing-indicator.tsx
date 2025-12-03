"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Music, Pause, Play } from "lucide-react";
import Image from "next/image";
import { useCallback, useState, useEffect } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSpotifyNowPlaying } from "@/hooks/use-spotify-now-playing";
import { cn } from "@/lib/utils";
import { toast } from "./toast";

export function SpotifyNowPlayingIndicator() {
    const { data, togglePlayback } = useSpotifyNowPlaying();
    const [isHovered, setIsHovered] = useState(false);
    const [localIsPlaying, setLocalIsPlaying] = useState(data.isPlaying);
    const [isToggling, setIsToggling] = useState(false);

    // Sync local state with server state (unless we're actively toggling)
    useEffect(() => {
        if (!isToggling) {
            setLocalIsPlaying(data.isPlaying);
        }
    }, [data.isPlaying, isToggling]);

    const handleClick = useCallback(async () => {
        if (!data.connected || !data.track) return;

        // Immediately update local state for instant feedback
        const newIsPlaying = !localIsPlaying;
        setLocalIsPlaying(newIsPlaying);
        setIsToggling(true);

        const result = await togglePlayback();

        // Reset toggling state after a short delay to allow server sync
        setTimeout(() => setIsToggling(false), 1000);

        if (!result.success) {
            // Revert on error
            setLocalIsPlaying(!newIsPlaying);

            if (result.error === "premium_required") {
                toast({
                    type: "error",
                    description: "Playback control requires Spotify Premium",
                });
            } else if (result.error === "no_device") {
                toast({
                    type: "error",
                    description: "No active Spotify device. Open Spotify and try again.",
                });
            }
        }
    }, [data.connected, data.track, localIsPlaying, togglePlayback]);

    // Don't render if not connected or no track
    if (!data.connected || !data.track) {
        return null;
    }

    const trackText = `${data.track.artist} — ${data.track.name}`;

    return (
        <AnimatePresence>
            <Tooltip>
                <TooltipTrigger asChild>
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onClick={handleClick}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className={cn(
                            "flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all",
                            "bg-gradient-to-r from-[#1DB954]/15 to-[#191414]/15",
                            "ring-1 ring-[#1DB954]/30",
                            "hover:from-[#1DB954]/25 hover:to-[#191414]/25",
                            "dark:from-[#1DB954]/25 dark:to-[#191414]/40",
                            "cursor-pointer select-none",
                            "max-w-[180px] md:max-w-[280px]"
                        )}
                        aria-label={localIsPlaying ? "Pause playback" : "Resume playback"}
                    >
                        {/* Album Art - Static */}
                        <div className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded">
                            {data.track.albumArt ? (
                                <Image
                                    src={data.track.albumArt}
                                    alt={data.track.album}
                                    width={24}
                                    height={24}
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex size-6 items-center justify-center bg-[#1DB954]/20">
                                    <Music className="size-3 text-[#1DB954]" />
                                </div>
                            )}
                            {/* Hover overlay with play/pause icon */}
                            <AnimatePresence>
                                {isHovered && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex items-center justify-center bg-black/60"
                                    >
                                        {localIsPlaying ? (
                                            <Pause className="size-3 text-white" />
                                        ) : (
                                            <Play className="size-3 text-white" />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Simple CSS Marquee Text */}
                        <div className="spotify-marquee-container min-w-0 flex-1 overflow-hidden">
                            <div className="spotify-marquee">
                                <span className="spotify-marquee-text">{trackText}</span>
                                <span className="spotify-marquee-separator">•</span>
                                <span className="spotify-marquee-text">{trackText}</span>
                                <span className="spotify-marquee-separator">•</span>
                            </div>
                        </div>

                        {/* Playing Indicator - Uses local state for immediate feedback */}
                        <div className="flex shrink-0 items-center gap-0.5">
                            {localIsPlaying ? (
                                // Animated equalizer bars
                                <div className="flex h-4 items-end gap-0.5">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="w-0.5 rounded-full bg-[#1DB954]"
                                            animate={{
                                                height: ["40%", "100%", "60%", "80%", "40%"],
                                            }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                delay: i * 0.15,
                                                ease: "easeInOut",
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Pause className="size-3 text-[#1DB954]/60" />
                            )}
                        </div>
                    </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[300px]">
                    <div className="flex flex-col gap-1">
                        <span className="font-medium">{data.track.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {data.track.artist} • {data.track.album}
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">
                            Click to {localIsPlaying ? "pause" : "play"}
                        </span>
                    </div>
                </TooltipContent>
            </Tooltip>
        </AnimatePresence>
    );
}