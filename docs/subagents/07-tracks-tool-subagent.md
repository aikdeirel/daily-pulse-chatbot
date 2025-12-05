# Sub-Agent Task: Spotify Tracks Tool

> **Priority**: 2 (Can run in parallel with other tool sub-agents)
> **Estimated Complexity**: Medium
> **Files to Create**: 1
> **Files to Modify**: 1

---

## 🎯 Objective

Create a new `spotifyTracks` tool that handles all track-related Spotify API endpoints including library management.

---

## 📋 Endpoints to Implement

### 1. get_track
**Spotify API**: `GET /v1/tracks/{id}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-track
**Premium Required**: No

### 2. get_multiple_tracks
**Spotify API**: `GET /v1/tracks?ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-several-tracks
**Premium Required**: No

### 3. get_saved_tracks
**Spotify API**: `GET /v1/me/tracks`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-users-saved-tracks
**Premium Required**: No

### 4. save_tracks
**Spotify API**: `PUT /v1/me/tracks?ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/save-tracks-user
**Premium Required**: No
**Scope Required**: `user-library-modify`

### 5. remove_saved_tracks
**Spotify API**: `DELETE /v1/me/tracks?ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/remove-tracks-user
**Premium Required**: No
**Scope Required**: `user-library-modify`

### 6. check_saved_tracks
**Spotify API**: `GET /v1/me/tracks/contains?ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/check-users-saved-tracks
**Premium Required**: No

---

## 📁 Files to Create/Modify

### CREATE: `lib/ai/tools/spotify-tracks.ts`

```typescript
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
        .describe("Array of track IDs, max 50 (required for get_multiple_tracks, save_tracks, remove_saved_tracks, check_saved_tracks)"),
      limit: z
        .number()
        .optional()
        .describe("Number of tracks to return for get_saved_tracks (default: 20, max: 50)"),
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
          message: "Spotify is not connected. Please connect your Spotify account from the user menu in the sidebar.",
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
            const result = await service.getSavedTracks({ limit, offset, market });
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
              ...result 
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
              ...result 
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
```

### MODIFY: `lib/services/spotify.ts`

Add these interfaces and methods to the SpotifyService class:

```typescript
// Add to interfaces section

export interface SpotifyFullTrack {
  id: string;
  name: string;
  artists: { id: string; name: string; uri: string }[];
  album: {
    id: string;
    name: string;
    albumType: string;
    images: { url: string; width: number; height: number }[];
    releaseDate: string;
    uri: string;
  };
  durationMs: number;
  explicit: boolean;
  popularity: number;
  trackNumber: number;
  discNumber: number;
  uri: string;
  externalUrl: string;
  previewUrl: string | null;
  isPlayable?: boolean;
}

export interface SpotifySavedTrack {
  addedAt: string;
  track: SpotifyFullTrack;
}

// Add to SpotifyService class

async getTrack(trackId: string, market?: string): Promise<SpotifyFullTrack> {
  const params = market ? `?market=${market}` : '';
  const data = await this.apiCall<any>(`/tracks/${trackId}${params}`);
  return this.mapFullTrack(data);
}

async getMultipleTracks(trackIds: string[], market?: string): Promise<SpotifyFullTrack[]> {
  const params = new URLSearchParams({ ids: trackIds.join(',') });
  if (market) params.set('market', market);
  const data = await this.apiCall<{ tracks: any[] }>(`/tracks?${params}`);
  return data.tracks.filter(Boolean).map(this.mapFullTrack);
}

async getSavedTracks(options?: { limit?: number; offset?: number; market?: string }): Promise<{
  tracks: SpotifySavedTrack[];
  total: number;
  hasMore: boolean;
}> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.market) params.set('market', options.market);
  
  const paramString = params.toString() ? `?${params}` : '?limit=20';
  const data = await this.apiCall<any>(`/me/tracks${paramString}`);
  
  return {
    tracks: data.items.map((item: any) => ({
      addedAt: item.added_at,
      track: this.mapFullTrack(item.track),
    })),
    total: data.total,
    hasMore: data.next !== null,
  };
}

async saveTracks(trackIds: string[]): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await this.apiCall(`/me/tracks?ids=${trackIds.join(',')}`, { method: 'PUT' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        success: false,
        error: 'missing_scopes',
        message: 'Missing permission to modify library. Please disconnect and reconnect Spotify.',
      };
    }
    throw error;
  }
}

async removeSavedTracks(trackIds: string[]): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await this.apiCall(`/me/tracks?ids=${trackIds.join(',')}`, { method: 'DELETE' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        success: false,
        error: 'missing_scopes',
        message: 'Missing permission to modify library. Please disconnect and reconnect Spotify.',
      };
    }
    throw error;
  }
}

async checkSavedTracks(trackIds: string[]): Promise<{ trackId: string; isSaved: boolean }[]> {
  const data = await this.apiCall<boolean[]>(`/me/tracks/contains?ids=${trackIds.join(',')}`);
  return trackIds.map((id, index) => ({
    trackId: id,
    isSaved: data[index],
  }));
}

// Helper method to map track data
private mapFullTrack(t: any): SpotifyFullTrack {
  return {
    id: t.id,
    name: t.name,
    artists: t.artists.map((a: any) => ({ id: a.id, name: a.name, uri: a.uri })),
    album: {
      id: t.album.id,
      name: t.album.name,
      albumType: t.album.album_type,
      images: t.album.images,
      releaseDate: t.album.release_date,
      uri: t.album.uri,
    },
    durationMs: t.duration_ms,
    explicit: t.explicit,
    popularity: t.popularity,
    trackNumber: t.track_number,
    discNumber: t.disc_number,
    uri: t.uri,
    externalUrl: t.external_urls?.spotify,
    previewUrl: t.preview_url,
    isPlayable: t.is_playable,
  };
}
```

---

## ✅ Acceptance Criteria

1. [ ] `lib/ai/tools/spotify-tracks.ts` created with all 6 actions
2. [ ] 6 service methods added (`getTrack`, `getMultipleTracks`, `getSavedTracks`, `saveTracks`, `removeSavedTracks`, `checkSavedTracks`)
3. [ ] Helper method `mapFullTrack` added
4. [ ] Interfaces `SpotifyFullTrack` and `SpotifySavedTrack` added
5. [ ] Library modification endpoints handle missing scopes gracefully
6. [ ] Error handling follows master blueprint patterns
7. [ ] Parameter validation with proper ID limits (50 max)
8. [ ] No TypeScript errors

---

## 🔗 Dependencies

- Requires master blueprint: `docs/subagents/00-master-blueprint.md`
- Requires OAuth scopes sub-agent to add `user-library-modify` scope
- Must be registered by Tool Registration sub-agent after completion