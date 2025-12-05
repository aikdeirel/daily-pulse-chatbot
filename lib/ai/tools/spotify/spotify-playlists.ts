import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotifyPlaylists = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `Playlist management for Spotify. Available actions:
- "get_my_playlists": Get current user's playlists
- "get_playlist": Get full details of a specific playlist
- "get_playlist_tracks": Get tracks from a playlist
- "create_playlist": Create a new playlist
- "change_details": Update playlist name, description, or public status
- "add_tracks": Add tracks to a playlist
- "remove_tracks": Remove tracks from a playlist
- "reorder_tracks": Reorder or replace tracks in a playlist

Note: Modifying playlists requires you own them or they are collaborative. All actions work without Premium.`,

    inputSchema: z.object({
      action: z.enum([
        "get_my_playlists",
        "get_playlist",
        "get_playlist_tracks",
        "create_playlist",
        "change_details",
        "add_tracks",
        "remove_tracks",
        "reorder_tracks",
      ]),
      playlistId: z
        .string()
        .optional()
        .describe(
          "Playlist ID (required for most actions except get_my_playlists and create_playlist)",
        ),
      playlistName: z
        .string()
        .optional()
        .describe(
          "Name for new playlist (required for create_playlist) or new name for change_details",
        ),
      playlistDescription: z
        .string()
        .optional()
        .describe(
          "Description for playlist (optional for create_playlist and change_details)",
        ),
      isPublic: z
        .boolean()
        .optional()
        .describe("Whether playlist is public (default: false)"),
      trackUris: z
        .array(z.string())
        .optional()
        .describe(
          "Array of track URIs (spotify:track:xxx) for add_tracks, remove_tracks, or reorder_tracks (replace)",
        ),
      limit: z
        .number()
        .optional()
        .describe("Number of items to return (default: 20, max: 50)"),
      offset: z
        .number()
        .optional()
        .describe("Offset for pagination (default: 0)"),
      rangeStart: z
        .number()
        .optional()
        .describe("For reorder_tracks: position of first track to move"),
      insertBefore: z
        .number()
        .optional()
        .describe("For reorder_tracks: position to insert tracks before"),
      rangeLength: z
        .number()
        .optional()
        .describe("For reorder_tracks: number of tracks to move (default: 1)"),
      snapshotId: z
        .string()
        .optional()
        .describe(
          "Playlist snapshot ID for remove_tracks or reorder_tracks (ensures consistency)",
        ),
    }),

    execute: async ({
      action,
      playlistId,
      playlistName,
      playlistDescription,
      isPublic,
      trackUris,
      limit,
      offset,
      rangeStart,
      insertBefore,
      rangeLength,
      snapshotId,
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
          case "get_my_playlists": {
            const result = await service.getPlaylists(limit, offset);
            return {
              action: "get_my_playlists",
              playlists: result.items.map((p: any) => ({
                id: p.id,
                name: p.name,
                trackCount: p.tracks.total,
                uri: p.uri,
                image: p.images?.[0]?.url,
                public: p.public,
                owner: p.owner?.display_name,
              })),
              total: result.total,
              hasMore: result.next !== null,
            };
          }

          case "get_playlist": {
            if (!playlistId) {
              return {
                error: "missing_playlist_id",
                message: "Playlist ID is required for get_playlist",
              };
            }
            const playlist = await service.getPlaylist(playlistId);
            return { action: "get_playlist", playlist };
          }

          case "get_playlist_tracks": {
            if (!playlistId) {
              return {
                error: "missing_playlist_id",
                message: "Playlist ID is required for get_playlist_tracks",
              };
            }
            const result = await service.getPlaylistTracks(
              playlistId,
              limit,
              offset,
            );
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
                  addedBy: item.added_by?.id,
                }))
                .filter((t: any) => t.name),
              total: result.total,
              hasMore: result.next !== null,
            };
          }

          case "create_playlist": {
            if (!playlistName) {
              return {
                error: "missing_playlist_name",
                message: "Playlist name is required for create_playlist",
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

          case "change_details": {
            if (!playlistId) {
              return {
                error: "missing_playlist_id",
                message: "Playlist ID is required for change_details",
              };
            }
            if (
              !playlistName &&
              !playlistDescription &&
              isPublic === undefined
            ) {
              return {
                error: "missing_changes",
                message:
                  "At least one of playlistName, playlistDescription, or isPublic is required",
              };
            }
            const result = await service.changePlaylistDetails(playlistId, {
              name: playlistName,
              description: playlistDescription,
              public: isPublic,
            });
            return { action: "change_details", playlistId, ...result };
          }

          case "add_tracks": {
            if (!playlistId) {
              return {
                error: "missing_playlist_id",
                message: "Playlist ID is required for add_tracks",
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
                action: "add_tracks",
                error: result.error,
                message: result.message,
                ...(result.diagnostics && { diagnostics: result.diagnostics }),
              };
            }
            return {
              action: "add_tracks",
              success: true,
              playlistId,
              tracksAdded: trackUris.length,
              snapshotId: result.snapshotId,
              message: `Added ${trackUris.length} track(s) to playlist`,
            };
          }

          case "remove_tracks": {
            if (!playlistId) {
              return {
                error: "missing_playlist_id",
                message: "Playlist ID is required for remove_tracks",
              };
            }
            if (!trackUris || trackUris.length === 0) {
              return {
                error: "missing_track_uris",
                message: "At least one track URI is required",
              };
            }
            const result = await service.removeTracksFromPlaylist(
              playlistId,
              trackUris,
              snapshotId,
            );
            return {
              action: "remove_tracks",
              playlistId,
              tracksRemoved: trackUris.length,
              ...result,
            };
          }

          case "reorder_tracks": {
            if (!playlistId) {
              return {
                error: "missing_playlist_id",
                message: "Playlist ID is required for reorder_tracks",
              };
            }
            // If trackUris provided, this is a replace operation
            if (trackUris && trackUris.length > 0) {
              const result = await service.replacePlaylistTracks(
                playlistId,
                trackUris,
              );
              return {
                action: "reorder_tracks",
                operation: "replace",
                playlistId,
                ...result,
              };
            }
            // Otherwise, this is a reorder operation
            if (rangeStart === undefined || insertBefore === undefined) {
              return {
                error: "missing_reorder_params",
                message:
                  "For reorder: rangeStart and insertBefore are required. For replace: provide trackUris array.",
              };
            }
            const result = await service.reorderPlaylistTracks(
              playlistId,
              rangeStart,
              insertBefore,
              rangeLength,
              snapshotId,
            );
            return {
              action: "reorder_tracks",
              operation: "reorder",
              playlistId,
              ...result,
            };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Spotify playlists tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Spotify",
        };
      }
    },
  });
