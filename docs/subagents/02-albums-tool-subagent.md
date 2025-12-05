# Sub-Agent Task: Spotify Albums Tool

> **Priority**: 2 (Can run in parallel with other tool sub-agents)
> **Estimated Complexity**: Medium
> **Files to Create**: 1
> **Files to Modify**: 1

---

## 🎯 Objective

Create a new `spotifyAlbums` tool that handles all album-related Spotify API endpoints.

---

## 📋 Endpoints to Implement

### 1. get_album
**Spotify API**: `GET /v1/albums/{id}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-an-album
**Premium Required**: No

### 2. get_multiple_albums
**Spotify API**: `GET /v1/albums?ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-multiple-albums
**Premium Required**: No

### 3. get_album_tracks
**Spotify API**: `GET /v1/albums/{id}/tracks`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-an-albums-tracks
**Premium Required**: No

### 4. check_saved_albums
**Spotify API**: `GET /v1/me/albums/contains?ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/check-users-saved-albums
**Premium Required**: No

---

## 📁 Files to Create/Modify

### CREATE: `lib/ai/tools/spotify-albums.ts`

```typescript
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
        .describe("Array of album IDs, max 20 (required for get_multiple_albums, check_saved_albums)"),
      limit: z
        .number()
        .optional()
        .describe("Number of tracks to return for get_album_tracks (default: 20, max: 50)"),
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
          message: "Spotify is not connected. Please connect your Spotify account from the user menu in the sidebar.",
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
            const tracks = await service.getAlbumTracks(albumId, { limit, offset, market });
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
```

### MODIFY: `lib/services/spotify.ts`

Add these interfaces and methods to the SpotifyService class:

```typescript
// Add to interfaces section (near top of file after existing interfaces)

export interface SpotifyAlbum {
  id: string;
  name: string;
  albumType: 'album' | 'single' | 'compilation';
  artists: { id: string; name: string; uri: string }[];
  images: { url: string; width: number; height: number }[];
  releaseDate: string;
  releaseDatePrecision: 'year' | 'month' | 'day';
  totalTracks: number;
  uri: string;
  externalUrl: string;
  copyrights?: { text: string; type: string }[];
  genres?: string[];
  label?: string;
  popularity?: number;
}

export interface SpotifySimplifiedTrack {
  id: string;
  name: string;
  trackNumber: number;
  discNumber: number;
  durationMs: number;
  explicit: boolean;
  artists: { id: string; name: string; uri: string }[];
  uri: string;
  previewUrl: string | null;
}

// Add to SpotifyService class

async getAlbum(albumId: string, market?: string): Promise<SpotifyAlbum> {
  const params = market ? `?market=${market}` : '';
  const data = await this.apiCall<any>(`/albums/${albumId}${params}`);
  return {
    id: data.id,
    name: data.name,
    albumType: data.album_type,
    artists: data.artists.map((a: any) => ({ id: a.id, name: a.name, uri: a.uri })),
    images: data.images,
    releaseDate: data.release_date,
    releaseDatePrecision: data.release_date_precision,
    totalTracks: data.total_tracks,
    uri: data.uri,
    externalUrl: data.external_urls?.spotify,
    copyrights: data.copyrights,
    genres: data.genres,
    label: data.label,
    popularity: data.popularity,
  };
}

async getMultipleAlbums(albumIds: string[], market?: string): Promise<SpotifyAlbum[]> {
  const params = new URLSearchParams({ ids: albumIds.join(',') });
  if (market) params.set('market', market);
  const data = await this.apiCall<{ albums: any[] }>(`/albums?${params}`);
  return data.albums.filter(Boolean).map((album) => ({
    id: album.id,
    name: album.name,
    albumType: album.album_type,
    artists: album.artists.map((a: any) => ({ id: a.id, name: a.name, uri: a.uri })),
    images: album.images,
    releaseDate: album.release_date,
    releaseDatePrecision: album.release_date_precision,
    totalTracks: album.total_tracks,
    uri: album.uri,
    externalUrl: album.external_urls?.spotify,
    copyrights: album.copyrights,
    genres: album.genres,
    label: album.label,
    popularity: album.popularity,
  }));
}

async getAlbumTracks(
  albumId: string,
  options?: { limit?: number; offset?: number; market?: string }
): Promise<{ tracks: SpotifySimplifiedTrack[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.market) params.set('market', options.market);
  
  const paramString = params.toString() ? `?${params}` : '';
  const data = await this.apiCall<any>(`/albums/${albumId}/tracks${paramString}`);
  
  return {
    tracks: data.items.map((t: any) => ({
      id: t.id,
      name: t.name,
      trackNumber: t.track_number,
      discNumber: t.disc_number,
      durationMs: t.duration_ms,
      explicit: t.explicit,
      artists: t.artists.map((a: any) => ({ id: a.id, name: a.name, uri: a.uri })),
      uri: t.uri,
      previewUrl: t.preview_url,
    })),
    total: data.total,
    hasMore: data.next !== null,
  };
}

async checkSavedAlbums(albumIds: string[]): Promise<{ albumId: string; isSaved: boolean }[]> {
  const params = new URLSearchParams({ ids: albumIds.join(',') });
  const data = await this.apiCall<boolean[]>(`/me/albums/contains?${params}`);
  return albumIds.map((id, index) => ({
    albumId: id,
    isSaved: data[index],
  }));
}
```

---

## ✅ Acceptance Criteria

1. [ ] `lib/ai/tools/spotify-albums.ts` created with all 4 actions
2. [ ] All 4 service methods added to `SpotifyService`
3. [ ] Interfaces `SpotifyAlbum` and `SpotifySimplifiedTrack` added
4. [ ] Error handling follows master blueprint patterns
5. [ ] Parameter validation for required fields
6. [ ] No TypeScript errors
7. [ ] Follows naming conventions from master blueprint

---

## 🔗 Dependencies

- Requires master blueprint: `docs/subagents/00-master-blueprint.md`
- Must be registered by Tool Registration sub-agent after completion