import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotifyPlayback = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `Playback control for Spotify. Available actions:
- "get_current_playback": Get currently playing track with progress and device info
- "get_devices": List available Spotify devices
- "play": Start/resume playback, optionally with a specific track/album/playlist URI
- "pause": Pause playback
- "skip_to_next": Skip to next track
- "skip_to_previous": Go to previous track
- "seek": Seek to position in current track
- "set_volume": Set playback volume (0-100)
- "set_repeat_mode": Set repeat mode (track/context/off)
- "toggle_shuffle": Turn shuffle on or off
- "transfer_playback": Transfer playback to another device

Note: All playback control actions (except get_current_playback and get_devices) require Spotify Premium.`,

    inputSchema: z.object({
      action: z.enum([
        "get_current_playback",
        "get_devices",
        "play",
        "pause",
        "skip_to_next",
        "skip_to_previous",
        "seek",
        "set_volume",
        "set_repeat_mode",
        "toggle_shuffle",
        "transfer_playback",
      ]),
      uri: z
        .string()
        .optional()
        .describe(
          "Spotify URI to play (e.g., spotify:track:xxx, spotify:album:xxx, spotify:playlist:xxx)",
        ),
      deviceId: z
        .string()
        .optional()
        .describe("Device ID to target for playback"),
      positionMs: z
        .number()
        .optional()
        .describe("Position in milliseconds for seek action"),
      volumePercent: z
        .number()
        .optional()
        .describe("Volume percentage (0-100) for set_volume action"),
      repeatState: z
        .enum(["track", "context", "off"])
        .optional()
        .describe(
          "Repeat mode: 'track' (repeat one), 'context' (repeat playlist/album), 'off'",
        ),
      shuffleState: z
        .boolean()
        .optional()
        .describe("Shuffle state: true to enable, false to disable"),
      play: z
        .boolean()
        .optional()
        .describe(
          "For transfer_playback: whether to start playing on new device (default: false)",
        ),
    }),

    execute: async ({
      action,
      uri,
      deviceId,
      positionMs,
      volumePercent,
      repeatState,
      shuffleState,
      play,
    }) => {
      const connected = await hasOAuthConnection(userId, "spotify");
      if (!connected) {
        return {
          error: "not_connected",
          message:
            "Spotify is not connected. Please connect your Spotify account from the user menu in the sidebar.",
        };
      }

      const service = new SpotifyService(userId);

      try {
        switch (action) {
          case "get_current_playback": {
            const result = await service.getCurrentlyPlaying();
            if (!result.track) {
              return {
                action: "get_current_playback",
                playing: false,
                message: "Nothing is currently playing on Spotify.",
              };
            }
            return {
              action: "get_current_playback",
              playing: result.isPlaying,
              track: {
                name: result.track.name,
                artist: result.track.artists.map((a) => a.name).join(", "),
                album: result.track.album.name,
                albumArt: result.track.album.images[0]?.url,
                uri: result.track.uri,
                durationMs: result.track.durationMs,
              },
              progressMs: result.progressMs,
              device: result.device,
            };
          }

          case "get_devices": {
            const devices = await service.getDevices();
            return {
              action: "get_devices",
              devices,
              activeDevice: devices.find((d) => d.isActive),
            };
          }

          case "play": {
            const result = await service.play(uri, deviceId);
            if (result.success) {
              // Get the currently playing track to include in the response
              const currentPlayback = await service.getCurrentlyPlaying();
              if (currentPlayback.track) {
                return {
                  action: "play",
                  success: true,
                  track: {
                    name: currentPlayback.track.name,
                    artist: currentPlayback.track.artists
                      .map((a) => a.name)
                      .join(", "),
                    album: currentPlayback.track.album.name,
                    albumArt: currentPlayback.track.album.images[0]?.url,
                    uri: currentPlayback.track.uri,
                    durationMs: currentPlayback.track.durationMs,
                  },
                };
              }
            }
            return { action: "play", ...result };
          }

          case "pause": {
            const result = await service.pause();
            if (result.success) {
              // Get the currently playing track to include in the response
              const currentPlayback = await service.getCurrentlyPlaying();
              if (currentPlayback.track) {
                return {
                  action: "pause",
                  success: true,
                  track: {
                    name: currentPlayback.track.name,
                    artist: currentPlayback.track.artists
                      .map((a) => a.name)
                      .join(", "),
                    album: currentPlayback.track.album.name,
                    albumArt: currentPlayback.track.album.images[0]?.url,
                    uri: currentPlayback.track.uri,
                    durationMs: currentPlayback.track.durationMs,
                  },
                };
              }
            }
            return { action: "pause", ...result };
          }

          case "skip_to_next": {
            const result = await service.next();
            if (result.success) {
              // Get the currently playing track to include in the response
              const currentPlayback = await service.getCurrentlyPlaying();
              if (currentPlayback.track) {
                return {
                  action: "skip_to_next",
                  success: true,
                  track: {
                    name: currentPlayback.track.name,
                    artist: currentPlayback.track.artists
                      .map((a) => a.name)
                      .join(", "),
                    album: currentPlayback.track.album.name,
                    albumArt: currentPlayback.track.album.images[0]?.url,
                    uri: currentPlayback.track.uri,
                    durationMs: currentPlayback.track.durationMs,
                  },
                };
              }
            }
            return { action: "skip_to_next", ...result };
          }

          case "skip_to_previous": {
            const result = await service.previous();
            if (result.success) {
              // Get the currently playing track to include in the response
              const currentPlayback = await service.getCurrentlyPlaying();
              if (currentPlayback.track) {
                return {
                  action: "skip_to_previous",
                  success: true,
                  track: {
                    name: currentPlayback.track.name,
                    artist: currentPlayback.track.artists
                      .map((a) => a.name)
                      .join(", "),
                    album: currentPlayback.track.album.name,
                    albumArt: currentPlayback.track.album.images[0]?.url,
                    uri: currentPlayback.track.uri,
                    durationMs: currentPlayback.track.durationMs,
                  },
                };
              }
            }
            return { action: "skip_to_previous", ...result };
          }

          case "seek": {
            if (positionMs === undefined) {
              return {
                error: "missing_position",
                message: "positionMs is required for seek",
              };
            }
            const result = await service.seekToPosition(positionMs, deviceId);
            return { action: "seek", ...result };
          }

          case "set_volume": {
            if (volumePercent === undefined) {
              return {
                error: "missing_volume",
                message: "volumePercent is required for set_volume",
              };
            }
            if (volumePercent < 0 || volumePercent > 100) {
              return {
                error: "invalid_volume",
                message: "volumePercent must be between 0 and 100",
              };
            }
            const result = await service.setVolume(volumePercent, deviceId);
            return { action: "set_volume", ...result };
          }

          case "set_repeat_mode": {
            if (!repeatState) {
              return {
                error: "missing_repeat_state",
                message: "repeatState is required (track/context/off)",
              };
            }
            const result = await service.setRepeatMode(repeatState, deviceId);
            return { action: "set_repeat_mode", state: repeatState, ...result };
          }

          case "toggle_shuffle": {
            if (shuffleState === undefined) {
              return {
                error: "missing_shuffle_state",
                message: "shuffleState is required (true/false)",
              };
            }
            const result = await service.setShuffle(shuffleState, deviceId);
            return { action: "toggle_shuffle", state: shuffleState, ...result };
          }

          case "transfer_playback": {
            if (!deviceId) {
              return {
                error: "missing_device_id",
                message: "deviceId is required for transfer_playback",
              };
            }
            const result = await service.transferPlayback(deviceId, play);
            return { action: "transfer_playback", deviceId, ...result };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Spotify playback tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Spotify",
        };
      }
    },
  });
