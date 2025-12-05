import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotifyAlbums = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `Album operations for Spotify. Available actions:
- "get_album": Get details of a single album by ID
- "get_multiple_albums": Get details of multiple albums (up to 20) by IDs
- "get_album_tracks": Get tracks from an album
- "check_saved_albums": Check if albums are saved in user's library

All actions work without Spotify Premium.`,

    inputSchema: z.object({
      action: z.enum([
        "get_album",
        "get_multiple_albums",
        "get_album_tracks",
        "check_saved_albums",
      ]),
      albumId: z
        .string()
        .optional()
        .describe("Album ID (required for get_album, get_album_tracks)"),
      albumIds: z
        .array(z.string())
        .optional()
        .describe(
          "Array of album IDs, max 20 (required for get_multiple_albums, check_saved_albums)",
        ),
      limit: z
        .number()
        .optional()
        .describe(
          "Number of tracks to return for get_album_tracks (default: 20, max: 50)",
        ),
      offset: z
        .number()
        .optional()
        .describe("Offset for pagination (default: 0)"),
      market: z
        .string()
        .optional()
        .describe("ISO 3166-1 alpha-2 country code for market-specific data"),
    }),

    execute: async ({ action, albumId, albumIds, limit, offset, market }) => {
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
          case "get_album": {
            if (!albumId) {
              return {
                error: "missing_album_id",
                message: "Album ID is required for get_album",
              };
            }
            const album = await service.getAlbum(albumId, market);
            return { action: "get_album", album };
          }

          case "get_multiple_albums": {
            if (!albumIds || albumIds.length === 0) {
              return {
                error: "missing_album_ids",
                message: "Album IDs array is required for get_multiple_albums",
              };
            }
            if (albumIds.length > 20) {
              return {
                error: "too_many_ids",
                message: "Maximum 20 album IDs allowed",
              };
            }
            const albums = await service.getMultipleAlbums(albumIds, market);
            return { action: "get_multiple_albums", albums };
          }

          case "get_album_tracks": {
            if (!albumId) {
              return {
                error: "missing_album_id",
                message: "Album ID is required for get_album_tracks",
              };
            }
            const tracks = await service.getAlbumTracks(albumId, {
              limit,
              offset,
              market,
            });
            return { action: "get_album_tracks", albumId, ...tracks };
          }

          case "check_saved_albums": {
            if (!albumIds || albumIds.length === 0) {
              return {
                error: "missing_album_ids",
                message: "Album IDs array is required for check_saved_albums",
              };
            }
            if (albumIds.length > 20) {
              return {
                error: "too_many_ids",
                message: "Maximum 20 album IDs allowed",
              };
            }
            const results = await service.checkSavedAlbums(albumIds);
            return { action: "check_saved_albums", results };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Spotify albums tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Spotify",
        };
      }
    },
  });
