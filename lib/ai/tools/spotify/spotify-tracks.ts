import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotifyTracks = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `Track operations for Spotify. Available actions:
- "get_track": Get details of a single track by ID
- "get_multiple_tracks": Get details of multiple tracks (up to 50) by IDs
- "get_saved_tracks": Get user's saved/liked tracks
- "save_tracks": Save tracks to user's library (like)
- "remove_saved_tracks": Remove tracks from user's library (unlike)
- "check_saved_tracks": Check if tracks are saved in user's library

All actions work without Spotify Premium.`,

    inputSchema: z.object({
      action: z.enum([
        "get_track",
        "get_multiple_tracks",
        "get_saved_tracks",
        "save_tracks",
        "remove_saved_tracks",
        "check_saved_tracks",
      ]),
      trackId: z
        .string()
        .optional()
        .describe("Track ID (required for get_track)"),
      trackIds: z
        .array(z.string())
        .optional()
        .describe(
          "Array of track IDs, max 50 (required for get_multiple_tracks, save_tracks, remove_saved_tracks, check_saved_tracks)",
        ),
      limit: z
        .number()
        .optional()
        .describe(
          "Number of tracks to return for get_saved_tracks (default: 20, max: 50)",
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

    execute: async ({ action, trackId, trackIds, limit, offset, market }) => {
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
          case "get_track": {
            if (!trackId) {
              return {
                error: "missing_track_id",
                message: "Track ID is required for get_track",
              };
            }
            const track = await service.getTrack(trackId, market);
            return { action: "get_track", track };
          }

          case "get_multiple_tracks": {
            if (!trackIds || trackIds.length === 0) {
              return {
                error: "missing_track_ids",
                message: "Track IDs array is required for get_multiple_tracks",
              };
            }
            if (trackIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 track IDs allowed",
              };
            }
            const tracks = await service.getMultipleTracks(trackIds, market);
            return { action: "get_multiple_tracks", tracks };
          }

          case "get_saved_tracks": {
            const result = await service.getSavedTracks({
              limit,
              offset,
              market,
            });
            return {
              action: "get_saved_tracks",
              tracks: result.tracks,
              total: result.total,
              hasMore: result.hasMore,
            };
          }

          case "save_tracks": {
            if (!trackIds || trackIds.length === 0) {
              return {
                error: "missing_track_ids",
                message: "Track IDs array is required for save_tracks",
              };
            }
            if (trackIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 track IDs allowed per request",
              };
            }
            const result = await service.saveTracks(trackIds);
            return {
              action: "save_tracks",
              tracksSaved: trackIds.length,
              ...result,
            };
          }

          case "remove_saved_tracks": {
            if (!trackIds || trackIds.length === 0) {
              return {
                error: "missing_track_ids",
                message: "Track IDs array is required for remove_saved_tracks",
              };
            }
            if (trackIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 track IDs allowed per request",
              };
            }
            const result = await service.removeSavedTracks(trackIds);
            return {
              action: "remove_saved_tracks",
              tracksRemoved: trackIds.length,
              ...result,
            };
          }

          case "check_saved_tracks": {
            if (!trackIds || trackIds.length === 0) {
              return {
                error: "missing_track_ids",
                message: "Track IDs array is required for check_saved_tracks",
              };
            }
            if (trackIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 track IDs allowed",
              };
            }
            const results = await service.checkSavedTracks(trackIds);
            return { action: "check_saved_tracks", results };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Spotify tracks tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Spotify",
        };
      }
    },
  });
