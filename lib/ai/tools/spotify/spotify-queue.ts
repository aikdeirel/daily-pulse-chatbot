import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotifyQueue = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `Queue management for Spotify. Available actions:
- "get_queue": Get the user's current playback queue (currently playing + upcoming tracks)
- "add_to_queue": Add a track to the end of the playback queue

Note: get_queue requires active playback. add_to_queue requires Spotify Premium.`,

    inputSchema: z.object({
      action: z.enum(["get_queue", "add_to_queue"]),
      uri: z
        .string()
        .optional()
        .describe(
          "Spotify track URI to add to queue (required for add_to_queue, e.g., spotify:track:xxx)",
        ),
      deviceId: z
        .string()
        .optional()
        .describe(
          "Device ID to target (optional, uses active device if not specified)",
        ),
    }),

    execute: async ({ action, uri, deviceId }) => {
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
          case "get_queue": {
            const queue = await service.getQueue();
            return {
              action: "get_queue",
              currentlyPlaying: queue.currentlyPlaying,
              queue: queue.queue,
              queueLength: queue.queue.length,
            };
          }

          case "add_to_queue": {
            if (!uri) {
              return {
                error: "missing_uri",
                message:
                  "Track URI is required for add_to_queue (e.g., spotify:track:xxx)",
              };
            }
            // Validate it's a track URI
            if (!uri.startsWith("spotify:track:")) {
              return {
                error: "invalid_uri",
                message:
                  "Only track URIs are supported for queue (spotify:track:xxx format)",
              };
            }
            const result = await service.addToQueue(uri, deviceId);
            return {
              action: "add_to_queue",
              uri,
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
          console.error("Spotify queue tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Spotify",
        };
      }
    },
  });
