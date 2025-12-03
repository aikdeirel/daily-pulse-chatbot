import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotify = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `Control Spotify playback and search music for the user. Available actions:
- "now_playing": Get the currently playing track with album art and progress
- "search": Search for tracks, artists, or albums
- "play": Start/resume playback, optionally with a specific track URI
- "pause": Pause playback
- "next": Skip to next track
- "previous": Go to previous track
- "top_tracks": Get user's top tracks (recent favorites)
- "playlists": Get user's playlists (returns playlist IDs for use with get_playlist_tracks)
- "get_playlist_tracks": Get tracks from a specific playlist by ID
- "create_playlist": Create a new playlist with a name and optional description
- "add_tracks_to_playlist": Add tracks to an existing playlist
- "get_devices": List available Spotify devices

Note: Playback control (play/pause/next/previous) requires Spotify Premium. Search, viewing, and playlist management always work.
The user must have connected their Spotify account from the user menu first.`,
    inputSchema: z.object({
      action: z.enum([
        "now_playing",
        "search",
        "play",
        "pause",
        "next",
        "previous",
        "top_tracks",
        "playlists",
        "get_playlist_tracks",
        "create_playlist",
        "add_tracks_to_playlist",
        "get_devices",
      ]),
      query: z
        .string()
        .optional()
        .describe("Search query (required for search action)"),
      uri: z
        .string()
        .optional()
        .describe(
          "Spotify URI to play, e.g. spotify:track:xxx (optional for play)",
        ),
      deviceId: z
        .string()
        .optional()
        .describe("Device ID to play on (optional, defaults to active device)"),
      playlistName: z
        .string()
        .optional()
        .describe("Name for the new playlist (required for create_playlist)"),
      playlistDescription: z
        .string()
        .optional()
        .describe(
          "Description for the new playlist (optional for create_playlist)",
        ),
      isPublic: z
        .boolean()
        .optional()
        .describe("Whether the playlist should be public (default: false)"),
      playlistId: z
        .string()
        .optional()
        .describe(
          "Playlist ID (required for get_playlist_tracks and add_tracks_to_playlist)",
        ),
      trackUris: z
        .array(z.string())
        .optional()
        .describe(
          "Array of Spotify track URIs to add to playlist (required for add_tracks_to_playlist)",
        ),
    }),
    execute: async ({
      action,
      query,
      uri,
      deviceId,
      playlistName,
      playlistDescription,
      isPublic,
      playlistId,
      trackUris,
    }) => {
      // Check if user has connected Spotify
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
          case "now_playing": {
            const result = await service.getCurrentlyPlaying();
            if (!result.track) {
              return {
                action: "now_playing",
                playing: false,
                message: "Nothing is currently playing on Spotify.",
              };
            }
            return {
              action: "now_playing",
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

          case "search": {
            if (!query) {
              return {
                error: "missing_query",
                message: "Search query is required",
              };
            }
            const results = await service.search(query, [
              "track",
              "artist",
              "album",
            ]);
            return {
              action: "search",
              query,
              tracks: results.tracks?.items.slice(0, 5).map((t: any) => ({
                name: t.name,
                artist: t.artists.map((a: any) => a.name).join(", "),
                album: t.album.name,
                albumArt: t.album.images[0]?.url,
                uri: t.uri,
              })),
              artists: results.artists?.items.slice(0, 3).map((a: any) => ({
                name: a.name,
                uri: a.uri,
                image: a.images[0]?.url,
              })),
              albums: results.albums?.items.slice(0, 3).map((a: any) => ({
                name: a.name,
                artist: a.artists.map((ar: any) => ar.name).join(", "),
                uri: a.uri,
                image: a.images[0]?.url,
              })),
            };
          }

          case "play": {
            const result = await service.play(uri, deviceId);
            return { action: "play", ...result };
          }

          case "pause": {
            const result = await service.pause();
            return { action: "pause", ...result };
          }

          case "next": {
            const result = await service.next();
            return { action: "next", ...result };
          }

          case "previous": {
            const result = await service.previous();
            return { action: "previous", ...result };
          }

          case "top_tracks": {
            const result = await service.getTopTracks();
            return {
              action: "top_tracks",
              tracks: result.items.map((t) => ({
                name: t.name,
                artist: t.artists.map((a) => a.name).join(", "),
                album: t.album.name,
                albumArt: t.album.images[0]?.url,
                uri: t.uri,
              })),
            };
          }

          case "playlists": {
            const result = await service.getPlaylists();
            return {
              action: "playlists",
              playlists: result.items.map((p) => ({
                id: p.id,
                name: p.name,
                trackCount: p.tracks.total,
                uri: p.uri,
                image: p.images?.[0]?.url,
              })),
            };
          }

          case "get_playlist_tracks": {
            if (!playlistId) {
              return {
                error: "missing_playlist_id",
                message: "Playlist ID is required to get tracks",
              };
            }
            const result = await service.getPlaylistTracks(playlistId);
            return {
              action: "get_playlist_tracks",
              playlistId,
              tracks: result.items
                .map((item: any) => ({
                  name: item.track?.name,
                  artist: item.track?.artists
                    ?.map((a: any) => a.name)
                    .join(", "),
                  album: item.track?.album?.name,
                  albumArt: item.track?.album?.images?.[0]?.url,
                  uri: item.track?.uri,
                  addedAt: item.added_at,
                }))
                .filter((t: any) => t.name), // Filter out null tracks
            };
          }

          case "create_playlist": {
            if (!playlistName) {
              return {
                error: "missing_playlist_name",
                message: "Playlist name is required to create a playlist",
              };
            }
            const playlist = await service.createPlaylist(playlistName, {
              description: playlistDescription,
              public: isPublic,
            });
            return {
              action: "create_playlist",
              success: true,
              playlist: {
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                uri: playlist.uri,
                url: playlist.externalUrl,
                public: playlist.public,
              },
              message: `Created playlist "${playlist.name}"`,
            };
          }

          case "add_tracks_to_playlist": {
            if (!playlistId) {
              return {
                error: "missing_playlist_id",
                message: "Playlist ID is required to add tracks",
              };
            }
            if (!trackUris || trackUris.length === 0) {
              return {
                error: "missing_track_uris",
                message: "At least one track URI is required",
              };
            }
            const result = await service.addTracksToPlaylist(
              playlistId,
              trackUris,
            );
            if (result.error) {
              return {
                action: "add_tracks_to_playlist",
                error: result.error,
                message: result.message,
                ...(result.diagnostics && { diagnostics: result.diagnostics }),
              };
            }
            return {
              action: "add_tracks_to_playlist",
              success: true,
              playlistId,
              tracksAdded: trackUris.length,
              snapshotId: result.snapshotId,
              message: `Added ${trackUris.length} track(s) to playlist`,
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

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        console.error("Spotify tool error:", error);
        return {
          error: "api_error",
          message: error.message || "An error occurred with Spotify",
        };
      }
    },
  });
