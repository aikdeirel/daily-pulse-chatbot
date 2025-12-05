# Sub-Agent Task: Spotify Artists Tool

> **Priority**: 2 (Can run in parallel with other tool sub-agents)
> **Estimated Complexity**: Medium
> **Files to Create**: 1
> **Files to Modify**: 1

---

## 🎯 Objective

Create a new `spotifyArtists` tool that handles all artist-related Spotify API endpoints.

---

## 📋 Endpoints to Implement

### 1. get_artist
**Spotify API**: `GET /v1/artists/{id}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-an-artist
**Premium Required**: No

### 2. get_multiple_artists
**Spotify API**: `GET /v1/artists?ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-multiple-artists
**Premium Required**: No

### 3. get_artist_albums
**Spotify API**: `GET /v1/artists/{id}/albums`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-an-artists-albums
**Premium Required**: No

### 4. get_artist_top_tracks
**Spotify API**: `GET /v1/artists/{id}/top-tracks`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-an-artists-top-tracks
**Premium Required**: No

### 5. get_related_artists
**Spotify API**: `GET /v1/artists/{id}/related-artists`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-an-artists-related-artists
**Premium Required**: No

---

## 📁 Files to Create/Modify

### CREATE: `lib/ai/tools/spotify-artists.ts`

```typescript
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
        .describe("Artist ID (required for get_artist, get_artist_albums, get_artist_top_tracks, get_related_artists)"),
      artistIds: z
        .array(z.string())
        .optional()
        .describe("Array of artist IDs, max 50 (required for get_multiple_artists)"),
      includeGroups: z
        .array(z.enum(["album", "single", "appears_on", "compilation"]))
        .optional()
        .describe("Filter album types for get_artist_albums (default: all types)"),
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
        .describe("ISO 3166-1 alpha-2 country code (required for get_artist_top_tracks)"),
    }),

    execute: async ({ action, artistId, artistIds, includeGroups, limit, offset, market }) => {
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
                message: "Artist IDs array is required for get_multiple_artists",
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
            const albums = await service.getArtistAlbums(artistId, { includeGroups, limit, offset, market });
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
            const tracks = await service.getArtistTopTracks(artistId, market || 'US');
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
```

### MODIFY: `lib/services/spotify.ts`

Add these interfaces and methods to the SpotifyService class:

```typescript
// Add to interfaces section

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; width: number; height: number }[];
  popularity: number;
  followers: number;
  uri: string;
  externalUrl: string;
}

export interface SpotifyArtistAlbum {
  id: string;
  name: string;
  albumType: 'album' | 'single' | 'compilation';
  albumGroup: 'album' | 'single' | 'appears_on' | 'compilation';
  artists: { id: string; name: string; uri: string }[];
  images: { url: string; width: number; height: number }[];
  releaseDate: string;
  releaseDatePrecision: 'year' | 'month' | 'day';
  totalTracks: number;
  uri: string;
  externalUrl: string;
}

// Add to SpotifyService class

async getArtist(artistId: string): Promise<SpotifyArtist> {
  const data = await this.apiCall<any>(`/artists/${artistId}`);
  return {
    id: data.id,
    name: data.name,
    genres: data.genres,
    images: data.images,
    popularity: data.popularity,
    followers: data.followers?.total || 0,
    uri: data.uri,
    externalUrl: data.external_urls?.spotify,
  };
}

async getMultipleArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
  const params = new URLSearchParams({ ids: artistIds.join(',') });
  const data = await this.apiCall<{ artists: any[] }>(`/artists?${params}`);
  return data.artists.filter(Boolean).map((artist) => ({
    id: artist.id,
    name: artist.name,
    genres: artist.genres,
    images: artist.images,
    popularity: artist.popularity,
    followers: artist.followers?.total || 0,
    uri: artist.uri,
    externalUrl: artist.external_urls?.spotify,
  }));
}

async getArtistAlbums(
  artistId: string,
  options?: { 
    includeGroups?: ('album' | 'single' | 'appears_on' | 'compilation')[]; 
    limit?: number; 
    offset?: number; 
    market?: string 
  }
): Promise<{ albums: SpotifyArtistAlbum[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options?.includeGroups?.length) params.set('include_groups', options.includeGroups.join(','));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.market) params.set('market', options.market);
  
  const paramString = params.toString() ? `?${params}` : '';
  const data = await this.apiCall<any>(`/artists/${artistId}/albums${paramString}`);
  
  return {
    albums: data.items.map((album: any) => ({
      id: album.id,
      name: album.name,
      albumType: album.album_type,
      albumGroup: album.album_group,
      artists: album.artists.map((a: any) => ({ id: a.id, name: a.name, uri: a.uri })),
      images: album.images,
      releaseDate: album.release_date,
      releaseDatePrecision: album.release_date_precision,
      totalTracks: album.total_tracks,
      uri: album.uri,
      externalUrl: album.external_urls?.spotify,
    })),
    total: data.total,
    hasMore: data.next !== null,
  };
}

async getArtistTopTracks(artistId: string, market: string): Promise<SpotifyTrack[]> {
  const data = await this.apiCall<{ tracks: any[] }>(`/artists/${artistId}/top-tracks?market=${market}`);
  return data.tracks.map((t) => ({
    id: t.id,
    name: t.name,
    artists: t.artists,
    album: t.album,
    uri: t.uri,
    durationMs: t.duration_ms,
  }));
}

async getRelatedArtists(artistId: string): Promise<SpotifyArtist[]> {
  const data = await this.apiCall<{ artists: any[] }>(`/artists/${artistId}/related-artists`);
  return data.artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    genres: artist.genres,
    images: artist.images,
    popularity: artist.popularity,
    followers: artist.followers?.total || 0,
    uri: artist.uri,
    externalUrl: artist.external_urls?.spotify,
  }));
}
```

---

## ✅ Acceptance Criteria

1. [ ] `lib/ai/tools/spotify-artists.ts` created with all 5 actions
2. [ ] All 5 service methods added to `SpotifyService`
3. [ ] Interfaces `SpotifyArtist` and `SpotifyArtistAlbum` added
4. [ ] Error handling follows master blueprint patterns
5. [ ] Parameter validation for required fields
6. [ ] No TypeScript errors
7. [ ] Follows naming conventions from master blueprint

---

## 🔗 Dependencies

- Requires master blueprint: `docs/subagents/00-master-blueprint.md`
- Uses existing `SpotifyTrack` interface for top tracks
- Must be registered by Tool Registration sub-agent after completion