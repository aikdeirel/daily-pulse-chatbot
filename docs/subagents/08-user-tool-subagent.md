# Sub-Agent Task: Spotify User Tool

> **Priority**: 2 (Can run in parallel with other tool sub-agents)
> **Estimated Complexity**: Medium (includes migration)
> **Files to Create**: 1
> **Files to Modify**: 1

---

## 🎯 Objective

Create a new `spotifyUser` tool that handles all user profile and personalization Spotify API endpoints. This includes **migrating** existing actions and adding new endpoints.

---

## 📋 Endpoints to Implement

### MIGRATE from existing spotify.ts:
- `top_tracks` → `get_top_tracks`
- `top_artists` → `get_top_artists`
- Internal `getCurrentUser()` → Expose as `get_profile`

### NEW Endpoints:

### 1. get_profile
**Spotify API**: `GET /v1/me`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile
**Premium Required**: No

### 2. follow_artists
**Spotify API**: `PUT /v1/me/following?type=artist&ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/follow-artists-users
**Premium Required**: No
**Scope Required**: `user-follow-modify`

### 3. follow_users
**Spotify API**: `PUT /v1/me/following?type=user&ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/follow-artists-users
**Premium Required**: No
**Scope Required**: `user-follow-modify`

### 4. unfollow_artists
**Spotify API**: `DELETE /v1/me/following?type=artist&ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/unfollow-artists-users
**Premium Required**: No
**Scope Required**: `user-follow-modify`

### 5. unfollow_users
**Spotify API**: `DELETE /v1/me/following?type=user&ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/unfollow-artists-users
**Premium Required**: No
**Scope Required**: `user-follow-modify`

### 6. check_following_artists
**Spotify API**: `GET /v1/me/following/contains?type=artist&ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/check-current-user-follows
**Premium Required**: No
**Scope Required**: `user-follow-read`

### 7. check_following_users
**Spotify API**: `GET /v1/me/following/contains?type=user&ids={ids}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/check-current-user-follows
**Premium Required**: No
**Scope Required**: `user-follow-read`

### 8. get_followed_artists
**Spotify API**: `GET /v1/me/following?type=artist`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/get-followed
**Premium Required**: No
**Scope Required**: `user-follow-read`

---

## 📁 Files to Create/Modify

### CREATE: `lib/ai/tools/spotify-user.ts`

```typescript
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
        .describe("Array of artist IDs, max 50 (for follow/unfollow/check artists)"),
      userIds: z
        .array(z.string())
        .optional()
        .describe("Array of user IDs, max 50 (for follow/unfollow/check users)"),
      timeRange: z
        .enum(["short_term", "medium_term", "long_term"])
        .optional()
        .describe("Time range for top tracks/artists: short_term (~4 weeks), medium_term (~6 months), long_term (years). Default: medium_term"),
      limit: z
        .number()
        .optional()
        .describe("Number of items to return (default: 20, max: 50)"),
      after: z
        .string()
        .optional()
        .describe("Cursor for pagination of followed artists (the last artist ID from previous page)"),
    }),

    execute: async ({ action, artistIds, userIds, timeRange, limit, after }) => {
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
          case "get_profile": {
            const profile = await service.getCurrentUserProfile();
            return { action: "get_profile", profile };
          }

          case "get_top_tracks": {
            const result = await service.getTopTracks(timeRange || "medium_term");
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
            const result = await service.getTopArtists(timeRange || "medium_term");
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
            return { action: "follow_artists", artistsFollowed: artistIds.length, ...result };
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
            return { action: "follow_users", usersFollowed: userIds.length, ...result };
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
            return { action: "unfollow_artists", artistsUnfollowed: artistIds.length, ...result };
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
            return { action: "unfollow_users", usersUnfollowed: userIds.length, ...result };
          }

          case "check_following_artists": {
            if (!artistIds || artistIds.length === 0) {
              return {
                error: "missing_artist_ids",
                message: "Artist IDs array is required for check_following_artists",
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
```

### MODIFY: `lib/services/spotify.ts`

Add these interfaces and methods to the SpotifyService class:

```typescript
// Add to interfaces section

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  email?: string;
  uri: string;
  externalUrl: string;
  followers: number;
  country?: string;
  product?: 'free' | 'premium';
  images: { url: string; width: number; height: number }[];
}

export interface SpotifyFollowedArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; width: number; height: number }[];
  popularity: number;
  uri: string;
  externalUrl: string;
}

// Add to SpotifyService class

async getCurrentUserProfile(): Promise<SpotifyUserProfile> {
  const data = await this.apiCall<any>('/me');
  return {
    id: data.id,
    displayName: data.display_name,
    email: data.email,
    uri: data.uri,
    externalUrl: data.external_urls?.spotify,
    followers: data.followers?.total || 0,
    country: data.country,
    product: data.product,
    images: data.images || [],
  };
}

async getFollowedArtists(options?: { limit?: number; after?: string }): Promise<{
  artists: SpotifyFollowedArtist[];
  total: number;
  cursors: { after: string | null };
}> {
  const params = new URLSearchParams({ type: 'artist' });
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.after) params.set('after', options.after);
  
  const data = await this.apiCall<any>(`/me/following?${params}`);
  
  return {
    artists: data.artists.items.map((a: any) => ({
      id: a.id,
      name: a.name,
      genres: a.genres,
      images: a.images,
      popularity: a.popularity,
      uri: a.uri,
      externalUrl: a.external_urls?.spotify,
    })),
    total: data.artists.total,
    cursors: {
      after: data.artists.cursors?.after || null,
    },
  };
}

async followArtists(artistIds: string[]): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await this.apiCall(`/me/following?type=artist&ids=${artistIds.join(',')}`, { method: 'PUT' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        success: false,
        error: 'missing_scopes',
        message: 'Missing permission to follow. Please disconnect and reconnect Spotify.',
      };
    }
    throw error;
  }
}

async followUsers(userIds: string[]): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await this.apiCall(`/me/following?type=user&ids=${userIds.join(',')}`, { method: 'PUT' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        success: false,
        error: 'missing_scopes',
        message: 'Missing permission to follow. Please disconnect and reconnect Spotify.',
      };
    }
    throw error;
  }
}

async unfollowArtists(artistIds: string[]): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await this.apiCall(`/me/following?type=artist&ids=${artistIds.join(',')}`, { method: 'DELETE' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        success: false,
        error: 'missing_scopes',
        message: 'Missing permission to unfollow. Please disconnect and reconnect Spotify.',
      };
    }
    throw error;
  }
}

async unfollowUsers(userIds: string[]): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await this.apiCall(`/me/following?type=user&ids=${userIds.join(',')}`, { method: 'DELETE' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        success: false,
        error: 'missing_scopes',
        message: 'Missing permission to unfollow. Please disconnect and reconnect Spotify.',
      };
    }
    throw error;
  }
}

async checkFollowingArtists(artistIds: string[]): Promise<{ artistId: string; isFollowing: boolean }[]> {
  const data = await this.apiCall<boolean[]>(`/me/following/contains?type=artist&ids=${artistIds.join(',')}`);
  return artistIds.map((id, index) => ({
    artistId: id,
    isFollowing: data[index],
  }));
}

async checkFollowingUsers(userIds: string[]): Promise<{ userId: string; isFollowing: boolean }[]> {
  const data = await this.apiCall<boolean[]>(`/me/following/contains?type=user&ids=${userIds.join(',')}`);
  return userIds.map((id, index) => ({
    userId: id,
    isFollowing: data[index],
  }));
}
```

---

## ✅ Acceptance Criteria

1. [ ] `lib/ai/tools/spotify-user.ts` created with all 10 actions
2. [ ] 9 new/modified service methods added
3. [ ] Interfaces `SpotifyUserProfile` and `SpotifyFollowedArtist` added
4. [ ] Existing `getTopTracks` and `getTopArtists` methods reused
5. [ ] Follow/unfollow endpoints handle missing scopes gracefully
6. [ ] Cursor-based pagination for followed artists
7. [ ] Error handling follows master blueprint patterns
8. [ ] No TypeScript errors

---

## 🔗 Dependencies

- Requires master blueprint: `docs/subagents/00-master-blueprint.md`
- Requires OAuth scopes sub-agent to add `user-follow-read` and `user-follow-modify` scopes
- Must be registered by Tool Registration sub-agent after completion