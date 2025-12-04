"use client";

import {
  AlertCircle,
  ExternalLink,
  ListMusic,
  Music,
  Plus,
  Smartphone,
} from "lucide-react";
import Image from "next/image";

interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  uri: string;
  durationMs?: number;
  addedAt?: string;
}

interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface SpotifyPlaylistInfo {
  id: string;
  name: string;
  description?: string | null;
  uri: string;
  url?: string;
  public?: boolean;
}

interface SpotifyToolOutput {
  action?: string;
  error?: string;
  message?: string;
  playing?: boolean;
  success?: boolean;
  track?: SpotifyTrack;
  tracks?: SpotifyTrack[];
  progressMs?: number;
  device?: SpotifyDevice;
  devices?: SpotifyDevice[];
  query?: string;
  playlists?: Array<{
    id: string;
    name: string;
    trackCount: number;
    uri: string;
    image?: string;
  }>;
  // Playlist creation fields
  playlist?: SpotifyPlaylistInfo;
  playlistId?: string;
  tracksAdded?: number;
  snapshotId?: string;
}

export function SpotifyPlayer({ data }: { data: SpotifyToolOutput }) {
  // Not connected state
  if (data.error === "not_connected") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#1DB954]/20">
          <Music className="size-6 text-[#1DB954]" />
        </div>
        <div>
          <p className="font-medium">Spotify Not Connected</p>
          <p className="text-sm text-muted-foreground">
            Connect your Spotify account from the user menu in the sidebar.
          </p>
        </div>
      </div>
    );
  }

  // Premium required state
  if (data.error === "premium_required") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
        <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/20">
          <AlertCircle className="size-6 text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">
            Spotify Premium Required
          </p>
          <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
            Playback control requires Spotify Premium. You can still search and
            see what&apos;s playing!
          </p>
        </div>
      </div>
    );
  }

  // No device state
  if (data.error === "no_device") {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-blue-500/20">
            <Smartphone className="size-6 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-700 dark:text-blue-400">
              No Active Device
            </p>
            <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
              Open Spotify on any device to enable playback.
            </p>
          </div>
        </div>
        {data.devices && data.devices.length > 0 && (
          <div className="mt-2 text-sm text-blue-600/80 dark:text-blue-400/80">
            Available devices: {data.devices.map((d) => d.name).join(", ")}
          </div>
        )}
      </div>
    );
  }

  // Now Playing state
  if (data.action === "now_playing" && data.track) {
    const progressPercent = data.track.durationMs
      ? ((data.progressMs || 0) / data.track.durationMs) * 100
      : 0;

    return (
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#1DB954]/20 to-[#191414]/90 p-4">
        <div className="flex gap-4">
          {data.track.albumArt && (
            <div className="shrink-0">
              <Image
                src={data.track.albumArt}
                alt={data.track.album}
                width={80}
                height={80}
                className="rounded-lg shadow-lg"
              />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <p className="truncate font-semibold text-white">
              {data.track.name}
            </p>
            <p className="truncate text-sm text-white/70">
              {data.track.artist}
            </p>
            <p className="truncate text-xs text-white/50">{data.track.album}</p>
          </div>
          <div className="flex items-center">
            {data.playing ? (
              <div className="flex items-center gap-1">
                <span className="animate-pulse text-[#1DB954]">●</span>
                <span className="text-sm text-[#1DB954]">Playing</span>
              </div>
            ) : (
              <span className="text-sm text-white/50">Paused</span>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full bg-[#1DB954] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {data.device && (
          <div className="mt-2 flex items-center gap-1 text-xs text-white/50">
            <Smartphone className="size-3" />
            <span>Playing on {data.device.name}</span>
          </div>
        )}
      </div>
    );
  }

  // Nothing playing
  if (data.action === "now_playing" && !data.track) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#1DB954]/20">
          <Music className="size-6 text-[#1DB954]" />
        </div>
        <p className="text-muted-foreground">
          Nothing is currently playing on Spotify.
        </p>
      </div>
    );
  }

  // Search results
  if (data.action === "search" && data.tracks) {
    return (
      <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <p className="mb-3 text-sm text-muted-foreground">
          Search results for &quot;{data.query}&quot;
        </p>
        <div className="flex flex-col gap-2">
          {data.tracks.map((track) => (
            <div
              key={track.uri}
              className="flex items-center gap-3 rounded-lg bg-white p-2 dark:bg-zinc-700"
            >
              {track.albumArt && (
                <Image
                  src={track.albumArt}
                  alt={track.album}
                  width={40}
                  height={40}
                  className="rounded"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{track.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artist}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Top tracks
  if (data.action === "top_tracks" && data.tracks) {
    return (
      <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <p className="mb-3 font-medium">Your Top Tracks</p>
        <div className="flex flex-col gap-2">
          {data.tracks.slice(0, 5).map((track, i) => (
            <div
              key={track.uri}
              className="flex items-center gap-3 rounded-lg bg-white p-2 dark:bg-zinc-700"
            >
              <span className="w-5 text-center text-sm text-muted-foreground">
                {i + 1}
              </span>
              {track.albumArt && (
                <Image
                  src={track.albumArt}
                  alt={track.album}
                  width={40}
                  height={40}
                  className="rounded"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{track.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artist}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Playlists
  if (data.action === "playlists" && data.playlists) {
    return (
      <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <p className="mb-3 font-medium">Your Playlists</p>
        <div className="flex flex-col gap-2">
          {data.playlists.slice(0, 5).map((playlist) => (
            <div
              key={playlist.id}
              className="flex items-center gap-3 rounded-lg bg-white p-2 dark:bg-zinc-700"
            >
              {playlist.image && (
                <Image
                  src={playlist.image}
                  alt={playlist.name}
                  width={40}
                  height={40}
                  className="rounded"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{playlist.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {playlist.trackCount} tracks
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Playlist tracks
  if (data.action === "get_playlist_tracks" && data.tracks) {
    return (
      <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <div className="mb-3 flex items-center gap-2">
          <ListMusic className="size-5 text-[#1DB954]" />
          <p className="font-medium">Playlist Tracks</p>
        </div>
        <div className="flex flex-col gap-2">
          {data.tracks.slice(0, 10).map((track, i) => (
            <div
              key={track.uri}
              className="flex items-center gap-3 rounded-lg bg-white p-2 dark:bg-zinc-700"
            >
              <span className="w-5 text-center text-sm text-muted-foreground">
                {i + 1}
              </span>
              {track.albumArt && (
                <Image
                  src={track.albumArt}
                  alt={track.album}
                  width={40}
                  height={40}
                  className="rounded"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{track.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artist} • {track.album}
                </p>
              </div>
            </div>
          ))}
          {data.tracks.length > 10 && (
            <p className="text-center text-xs text-muted-foreground">
              ... and {data.tracks.length - 10} more tracks
            </p>
          )}
        </div>
      </div>
    );
  }

  // Devices list
  if (data.action === "get_devices" && data.devices) {
    return (
      <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <p className="mb-3 font-medium">Available Devices</p>
        <div className="flex flex-col gap-2">
          {data.devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center gap-3 rounded-lg bg-white p-2 dark:bg-zinc-700"
            >
              <Smartphone className="size-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{device.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {device.type}
                </p>
              </div>
              {device.isActive && (
                <span className="text-xs text-[#1DB954]">● Active</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Playlist created
  if (data.action === "create_playlist" && data.success && data.playlist) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-[#1DB954]/20 to-[#191414]/90 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#1DB954]/30">
            <ListMusic className="size-6 text-[#1DB954]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Playlist Created!</p>
            <p className="text-sm text-white/70">{data.playlist.name}</p>
            {data.playlist.description && (
              <p className="text-xs text-white/50">
                {data.playlist.description}
              </p>
            )}
          </div>
          {data.playlist.url && (
            <a
              href={data.playlist.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full bg-[#1DB954] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#1ed760] transition-colors"
            >
              <ExternalLink className="size-3" />
              Open
            </a>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
          <span>{data.playlist.public ? "Public" : "Private"} playlist</span>
        </div>
      </div>
    );
  }

  // Tracks added to playlist
  if (data.action === "add_tracks_to_playlist" && data.success) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-[#1DB954]/10 p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-[#1DB954]/20">
          <Plus className="size-5 text-[#1DB954]" />
        </div>
        <div>
          <p className="font-medium text-[#1DB954]">
            Added {data.tracksAdded} track{data.tracksAdded !== 1 ? "s" : ""} to
            playlist
          </p>
          <p className="text-sm text-muted-foreground">{data.message}</p>
        </div>
      </div>
    );
  }

  // Success states (play, pause, next, previous)
  if (data.success) {
    const actionMessages: Record<string, string> = {
      play: "▶️ Playing",
      pause: "⏸️ Paused",
      next: "⏭️ Skipped to next track",
      previous: "⏮️ Went to previous track",
    };
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[#1DB954]/10 px-3 py-2 text-[#1DB954]">
        <span>{actionMessages[data.action || ""] || "✓ Done"}</span>
      </div>
    );
  }

  // Generic error
  if (data.error) {
    return (
      <div className="rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-950/30 dark:text-red-400">
        {data.message || "An error occurred with Spotify"}
      </div>
    );
  }

  // Fallback: JSON display
  return (
    <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
