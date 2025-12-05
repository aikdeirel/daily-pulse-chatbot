# Sub-Agent Task: Spotify Queue Tool

> **Priority**: 2 (Can run in parallel with other tool sub-agents)
> **Estimated Complexity**: Low
> **Files to Create**: 1
> **Files to Modify**: 1

---

## 🎯 Objective

Create a new `spotifyQueue` tool that handles queue management Spotify API endpoints.

---

## 📋 Endpoints to Implement

### 1. get_queue
**Spotify API**: `GET /v1/me/player/queue`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-queue
**Premium Required**: No (but requires active playback)

### 2. add_to_queue
**Spotify API**: `POST /v1/me/player/queue?uri={uri}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/add-to-queue
**Premium Required**: Yes

---

## 📁 Files to Create/Modify

### CREATE: `lib/ai/tools/spotify-queue.ts`

```typescript
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
      action: z.enum([
        "get_queue",
        "add_to_queue",
      ]),
      uri: z
        .string()
        .optional()
        .describe("Spotify track URI to add to queue (required for add_to_queue, e.g., spotify:track:xxx)"),
      deviceId: z
        .string()
        .optional()
        .describe("Device ID to target (optional, uses active device if not specified)"),
    }),

    execute: async ({ action, uri, deviceId }) => {
      const connected = await hasOAuthConnection(userId, "spotify");
      if (!connected) {
        return {
          error: "not_connected",
          message: "Spotify is not connected. Please connect your Spotify account from the user menu in the sidebar.",
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
                message: "Track URI is required for add_to_queue (e.g., spotify:track:xxx)",
              };
            }
            // Validate it's a track URI
            if (!uri.startsWith("spotify:track:")) {
              return {
                error: "invalid_uri",
                message: "Only track URIs are supported for queue (spotify:track:xxx format)",
              };
            }
            const result = await service.addToQueue(uri, deviceId);
            return { 
              action: "add_to_queue", 
              uri,
              ...result 
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
```

### MODIFY: `lib/services/spotify.ts`

Add these interfaces and methods to the SpotifyService class:

```typescript
// Add to interfaces section

export interface SpotifyQueueTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  durationMs: number;
  uri: string;
}

export interface SpotifyQueueResponse {
  currentlyPlaying: SpotifyQueueTrack | null;
  queue: SpotifyQueueTrack[];
}

// Add to SpotifyService class

async getQueue(): Promise<SpotifyQueueResponse> {
  try {
    const data = await this.apiCall<any>('/me/player/queue');
    
    const mapTrack = (t: any): SpotifyQueueTrack | null => {
      if (!t) return null;
      return {
        id: t.id,
        name: t.name,
        artists: t.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: {
          id: t.album?.id,
          name: t.album?.name,
          images: t.album?.images || [],
        },
        durationMs: t.duration_ms,
        uri: t.uri,
      };
    };

    return {
      currentlyPlaying: mapTrack(data.currently_playing),
      queue: (data.queue || []).map(mapTrack).filter(Boolean) as SpotifyQueueTrack[],
    };
  } catch (error: any) {
    if (error.status === 204 || error.status === 404) {
      // No active playback
      return {
        currentlyPlaying: null,
        queue: [],
      };
    }
    throw error;
  }
}

async addToQueue(uri: string, deviceId?: string): Promise<SpotifyPlayResult> {
  try {
    const params = new URLSearchParams({ uri });
    if (deviceId) params.set('device_id', deviceId);
    await this.apiCall(`/me/player/queue?${params}`, { method: 'POST' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        error: 'premium_required',
        message: 'Adding to queue requires Spotify Premium',
      };
    }
    if (error.status === 404) {
      const devices = await this.getDevices();
      return {
        error: 'no_device',
        message: 'No active Spotify device found. Open Spotify on any device and try again.',
        devices,
      };
    }
    throw error;
  }
}
```

---

## ✅ Acceptance Criteria

1. [ ] `lib/ai/tools/spotify-queue.ts` created with 2 actions
2. [ ] 2 service methods added (`getQueue`, `addToQueue`)
3. [ ] Interfaces `SpotifyQueueTrack` and `SpotifyQueueResponse` added
4. [ ] Validates track URI format before calling API
5. [ ] Handles no active playback gracefully for get_queue
6. [ ] Premium and no_device errors handled properly
7. [ ] Error handling follows master blueprint patterns
8. [ ] No TypeScript errors

---

## 🔗 Dependencies

- Requires master blueprint: `docs/subagents/00-master-blueprint.md`
- Uses existing `SpotifyPlayResult` interface
- Must be registered by Tool Registration sub-agent after completion