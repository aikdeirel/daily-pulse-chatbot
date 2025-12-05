import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotifyArtists = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `Artist operations for Spotify. Available actions:
- "get_artist": Get details of a single artist by ID
- "get_multiple_artists": Get details of multiple artists (up to 50) by IDs
- "get_artist_albums": Get albums by an artist
- "get_artist_top_tracks": Get an artist's top tracks in a market
- "get_related_artists": Get artists similar to a given artist

All actions work without Spotify Premium.`,

    inputSchema: z.object({
      action: z.enum([
        "get_artist",
        "get_multiple_artists",
        "get_artist_albums",
        "get_artist_top_tracks",
        "get_related_artists",
      ]),
      artistId: z
        .string()
        .optional()
        .describe(
          "Artist ID (required for get_artist, get_artist_albums, get_artist_top_tracks, get_related_artists)",
        ),
      artistIds: z
        .array(z.string())
        .optional()
        .describe(
          "Array of artist IDs, max 50 (required for get_multiple_artists)",
        ),
      includeGroups: z
        .array(z.enum(["album", "single", "appears_on", "compilation"]))
        .optional()
        .describe(
          "Filter album types for get_artist_albums (default: all types)",
        ),
      limit: z
        .number()
        .optional()
        .describe("Number of items to return (default: 20, max: 50)"),
      offset: z
        .number()
        .optional()
        .describe("Offset for pagination (default: 0)"),
      market: z
        .string()
        .optional()
        .describe(
          "ISO 3166-1 alpha-2 country code (required for get_artist_top_tracks)",
        ),
    }),

    execute: async ({
      action,
      artistId,
      artistIds,
      includeGroups,
      limit,
      offset,
      market,
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
          case "get_artist": {
            if (!artistId) {
              return {
                error: "missing_artist_id",
                message: "Artist ID is required for get_artist",
              };
            }
            const artist = await service.getArtist(artistId);
            return { action: "get_artist", artist };
          }

          case "get_multiple_artists": {
            if (!artistIds || artistIds.length === 0) {
              return {
                error: "missing_artist_ids",
                message:
                  "Artist IDs array is required for get_multiple_artists",
              };
            }
            if (artistIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 artist IDs allowed",
              };
            }
            const artists = await service.getMultipleArtists(artistIds);
            return { action: "get_multiple_artists", artists };
          }

          case "get_artist_albums": {
            if (!artistId) {
              return {
                error: "missing_artist_id",
                message: "Artist ID is required for get_artist_albums",
              };
            }
            const albums = await service.getArtistAlbums(artistId, {
              includeGroups,
              limit,
              offset,
              market,
            });
            return { action: "get_artist_albums", artistId, ...albums };
          }

          case "get_artist_top_tracks": {
            if (!artistId) {
              return {
                error: "missing_artist_id",
                message: "Artist ID is required for get_artist_top_tracks",
              };
            }
            // Market defaults to US if not specified
            const tracks = await service.getArtistTopTracks(
              artistId,
              market || "US",
            );
            return { action: "get_artist_top_tracks", artistId, tracks };
          }

          case "get_related_artists": {
            if (!artistId) {
              return {
                error: "missing_artist_id",
                message: "Artist ID is required for get_related_artists",
              };
            }
            const artists = await service.getRelatedArtists(artistId);
            return { action: "get_related_artists", artistId, artists };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Spotify artists tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Spotify",
        };
      }
    },
  });
