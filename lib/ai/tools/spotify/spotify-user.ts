import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotifyUser = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `User profile and personalization for Spotify. Available actions:
- "get_profile": Get current user's profile information
- "get_top_tracks": Get user's top tracks based on listening history
- "get_top_artists": Get user's top artists based on listening history
- "get_followed_artists": Get artists the user follows
- "follow_artists": Follow one or more artists
- "follow_users": Follow one or more users
- "unfollow_artists": Unfollow one or more artists
- "unfollow_users": Unfollow one or more users
- "check_following_artists": Check if user follows specific artists
- "check_following_users": Check if user follows specific users

All actions work without Spotify Premium.`,

    inputSchema: z.object({
      action: z.enum([
        "get_profile",
        "get_top_tracks",
        "get_top_artists",
        "get_followed_artists",
        "follow_artists",
        "follow_users",
        "unfollow_artists",
        "unfollow_users",
        "check_following_artists",
        "check_following_users",
      ]),
      artistIds: z
        .array(z.string())
        .optional()
        .describe(
          "Array of artist IDs, max 50 (for follow/unfollow/check artists)",
        ),
      userIds: z
        .array(z.string())
        .optional()
        .describe(
          "Array of user IDs, max 50 (for follow/unfollow/check users)",
        ),
      timeRange: z
        .enum(["short_term", "medium_term", "long_term"])
        .optional()
        .describe(
          "Time range for top tracks/artists: short_term (~4 weeks), medium_term (~6 months), long_term (years). Default: medium_term",
        ),
      limit: z
        .number()
        .optional()
        .describe("Number of items to return (default: 20, max: 50)"),
      after: z
        .string()
        .optional()
        .describe(
          "Cursor for pagination of followed artists (the last artist ID from previous page)",
        ),
    }),

    execute: async ({
      action,
      artistIds,
      userIds,
      timeRange,
      limit,
      after,
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
          case "get_profile": {
            const profile = await service.getCurrentUserProfile();
            return { action: "get_profile", profile };
          }

          case "get_top_tracks": {
            const result = await service.getTopTracks(
              timeRange || "medium_term",
            );
            return {
              action: "get_top_tracks",
              timeRange: timeRange || "medium_term",
              tracks: result.items.map((t: any) => ({
                name: t.name,
                artist: t.artists.map((a: any) => a.name).join(", "),
                album: t.album.name,
                albumArt: t.album.images[0]?.url,
                uri: t.uri,
              })),
            };
          }

          case "get_top_artists": {
            const result = await service.getTopArtists(
              timeRange || "medium_term",
            );
            return {
              action: "get_top_artists",
              timeRange: timeRange || "medium_term",
              artists: result.items.map((a: any) => ({
                name: a.name,
                uri: a.uri,
                image: a.images[0]?.url,
                genres: a.genres,
                popularity: a.popularity,
              })),
            };
          }

          case "get_followed_artists": {
            const result = await service.getFollowedArtists({ limit, after });
            return {
              action: "get_followed_artists",
              artists: result.artists,
              total: result.total,
              cursors: result.cursors,
            };
          }

          case "follow_artists": {
            if (!artistIds || artistIds.length === 0) {
              return {
                error: "missing_artist_ids",
                message: "Artist IDs array is required for follow_artists",
              };
            }
            if (artistIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 artist IDs allowed",
              };
            }
            const result = await service.followArtists(artistIds);
            return {
              action: "follow_artists",
              artistsFollowed: artistIds.length,
              ...result,
            };
          }

          case "follow_users": {
            if (!userIds || userIds.length === 0) {
              return {
                error: "missing_user_ids",
                message: "User IDs array is required for follow_users",
              };
            }
            if (userIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 user IDs allowed",
              };
            }
            const result = await service.followUsers(userIds);
            return {
              action: "follow_users",
              usersFollowed: userIds.length,
              ...result,
            };
          }

          case "unfollow_artists": {
            if (!artistIds || artistIds.length === 0) {
              return {
                error: "missing_artist_ids",
                message: "Artist IDs array is required for unfollow_artists",
              };
            }
            if (artistIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 artist IDs allowed",
              };
            }
            const result = await service.unfollowArtists(artistIds);
            return {
              action: "unfollow_artists",
              artistsUnfollowed: artistIds.length,
              ...result,
            };
          }

          case "unfollow_users": {
            if (!userIds || userIds.length === 0) {
              return {
                error: "missing_user_ids",
                message: "User IDs array is required for unfollow_users",
              };
            }
            if (userIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 user IDs allowed",
              };
            }
            const result = await service.unfollowUsers(userIds);
            return {
              action: "unfollow_users",
              usersUnfollowed: userIds.length,
              ...result,
            };
          }

          case "check_following_artists": {
            if (!artistIds || artistIds.length === 0) {
              return {
                error: "missing_artist_ids",
                message:
                  "Artist IDs array is required for check_following_artists",
              };
            }
            if (artistIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 artist IDs allowed",
              };
            }
            const results = await service.checkFollowingArtists(artistIds);
            return { action: "check_following_artists", results };
          }

          case "check_following_users": {
            if (!userIds || userIds.length === 0) {
              return {
                error: "missing_user_ids",
                message: "User IDs array is required for check_following_users",
              };
            }
            if (userIds.length > 50) {
              return {
                error: "too_many_ids",
                message: "Maximum 50 user IDs allowed",
              };
            }
            const results = await service.checkFollowingUsers(userIds);
            return { action: "check_following_users", results };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Spotify user tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Spotify",
        };
      }
    },
  });
