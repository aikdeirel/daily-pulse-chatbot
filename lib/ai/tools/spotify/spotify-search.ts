import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotifySearch = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `Search operations for Spotify. Available actions:
- "search": Search for tracks, artists, or albums by query

All actions work without Spotify Premium.`,
    inputSchema: z.object({
      action: z.enum(["search"]),
      query: z.string().describe("Search query (required for search)"),
      types: z
        .array(z.enum(["track", "artist", "album"]))
        .optional()
        .describe("Array of item types to search for (default: ['track'])"),
    }),

    execute: async ({ action, query, types }) => {
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
          case "search": {
            if (!query) {
              return {
                error: "missing_query",
                message: "Query is required for search",
              };
            }

            // Default to searching for tracks if no types specified
            const searchTypes: ("track" | "artist" | "album")[] =
              types && types.length > 0 ? types : ["track"];

            const results = await service.search(query, searchTypes);

            return {
              action: "search",
              query,
              types: searchTypes,
              results,
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
          console.error("Spotify search tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Spotify",
        };
      }
    },
  });
