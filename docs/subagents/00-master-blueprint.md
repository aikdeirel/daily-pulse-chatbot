# Spotify API Sub-Agent Master Blueprint

> **Purpose**: This document defines the conventions, patterns, and standards that ALL sub-agents must follow when implementing Spotify Web API endpoints.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool Layer (NEW)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │spotifyAlbums │ │spotifyArtists│ │spotifyPlayback│ ...    │
│  │    tool      │ │    tool      │ │    tool       │         │
│  └──────┬───────┘ └──────┬───────┘ └──────┬────────┘         │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              Service Layer (lib/services/spotify.ts)         │
│  SpotifyService class - contains ALL API methods             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Spotify Web API                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
lib/
├── services/
│   └── spotify.ts              # SpotifyService class - ALL API methods go here
├── ai/tools/
│   ├── spotify.ts              # LEGACY - will be deprecated/removed
│   ├── spotify-albums.ts       # NEW: Album-related actions
│   ├── spotify-artists.ts      # NEW: Artist-related actions
│   ├── spotify-playback.ts     # NEW: Playback control actions
│   ├── spotify-queue.ts        # NEW: Queue management actions
│   ├── spotify-playlists.ts    # NEW: Playlist management actions
│   ├── spotify-tracks.ts       # NEW: Track-related actions
│   └── spotify-user.ts         # NEW: User profile actions
```

---

## 🔧 Service Layer Pattern

### Adding a New Method to SpotifyService

```typescript
// In lib/services/spotify.ts

// 1. Add interface if returning complex type
export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; width: number; height: number }[];
  releaseDate: string;
  totalTracks: number;
  uri: string;
}

// 2. Add method to SpotifyService class
async getAlbum(albumId: string): Promise<SpotifyAlbum> {
  const data = await this.apiCall<any>(`/albums/${albumId}`);
  return {
    id: data.id,
    name: data.name,
    artists: data.artists.map((a: any) => ({ id: a.id, name: a.name })),
    images: data.images,
    releaseDate: data.release_date,
    totalTracks: data.total_tracks,
    uri: data.uri,
  };
}

// 3. For endpoints that require Premium, wrap in try-catch
async setRepeatMode(state: 'track' | 'context' | 'off'): Promise<SpotifyPlayResult> {
  try {
    await this.apiCall(`/me/player/repeat?state=${state}`, { method: 'PUT' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        error: 'premium_required',
        message: 'Repeat mode control requires Spotify Premium',
      };
    }
    throw error;
  }
}
```

---

## 🛠️ Tool Layer Pattern

### Creating a New Category Tool

```typescript
// In lib/ai/tools/spotify-{category}.ts

import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotify{Category} = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `{Category} operations for Spotify. Available actions:
- "action_one": Description of what it does
- "action_two": Description with required params noted

Note: {Any premium requirements or important notes}`,
    
    inputSchema: z.object({
      action: z.enum([
        "action_one",
        "action_two",
        // ... more actions
      ]),
      // Parameters - all optional with .describe()
      param1: z
        .string()
        .optional()
        .describe("Description (required for action_one)"),
      param2: z
        .array(z.string())
        .optional()
        .describe("Array of IDs (required for action_two)"),
    }),

    execute: async ({ action, param1, param2 }) => {
      // 1. ALWAYS check OAuth connection first
      const connected = await hasOAuthConnection(userId, "spotify");
      if (!connected) {
        return {
          error: "not_connected",
          message: "Spotify is not connected. Please connect your Spotify account from the user menu in the sidebar.",
        };
      }

      // 2. Instantiate service
      const service = new SpotifyService(userId);

      try {
        // 3. Switch on action
        switch (action) {
          case "action_one": {
            // 4. Validate required params
            if (!param1) {
              return {
                error: "missing_param1",
                message: "param1 is required for action_one",
              };
            }
            // 5. Call service method
            const result = await service.someMethod(param1);
            // 6. Return with action field
            return {
              action: "action_one",
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
        // 7. Sanitized error handling
        if (error instanceof Error) {
          console.error("Spotify tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Spotify",
        };
      }
    },
  });
```

---

## 📝 Naming Conventions

### Action Names
- Use snake_case: `get_album`, `add_to_queue`
- Be verb-first: `get_`, `set_`, `add_`, `remove_`, `toggle_`
- Match the Spotify API concept, not the endpoint URL

### Parameter Names
- Use camelCase: `albumId`, `trackUris`
- Be consistent with existing patterns:
  - IDs: `albumId`, `artistId`, `playlistId`, `trackId`
  - Arrays of IDs: `albumIds`, `artistIds`, `trackUris`
  - Options: `limit`, `offset`, `market`, `timeRange`

### Service Method Names
- Use camelCase: `getAlbum()`, `addToQueue()`
- Match action names conceptually

---

## ✅ Required Response Fields

Every tool response MUST include:
1. `action`: The action that was performed
2. Either `success: true` OR `error` + `message`

### Success Response
```typescript
return {
  action: "get_album",
  album: { /* album data */ },
};
```

### Error Response
```typescript
return {
  error: "not_found",
  message: "Album not found",
};
```

---

## 🚫 Common Error Codes

| Error Code | HTTP Status | Meaning |
|------------|-------------|---------|
| `not_connected` | N/A | User hasn't connected Spotify |
| `premium_required` | 403 | Action requires Spotify Premium |
| `no_device` | 404 | No active playback device |
| `not_found` | 404 | Resource doesn't exist |
| `missing_{param}` | N/A | Required parameter missing |
| `api_error` | Various | Generic API error |

---

## 📋 Tool Registration Checklist

After creating a new tool, the Tool Registration sub-agent must:

1. Import the tool in `app/(chat)/api/chat/route.ts`
2. Add to the `tools` object
3. Add to `experimental_activeTools` array
4. Update the tools list in the system prompt if needed

---

## 🔒 OAuth Scopes Reference

| Scope | Required For |
|-------|--------------|
| `user-read-playback-state` | Now playing, queue, devices |
| `user-modify-playback-state` | Play, pause, skip, seek, repeat, shuffle |
| `user-read-currently-playing` | Currently playing track |
| `playlist-read-private` | User's private playlists |
| `playlist-modify-public` | Create/modify public playlists |
| `playlist-modify-private` | Create/modify private playlists |
| `user-library-read` | Saved tracks, albums, shows |
| `user-library-modify` | Save/remove tracks, albums |
| `user-top-read` | Top tracks/artists |
| `user-follow-read` | Check if following artists/users |
| `user-follow-modify` | Follow/unfollow artists/users |

---

## 📖 Endpoint Documentation Template

When implementing an endpoint, document it in this format:

```markdown
### action_name

**Spotify API**: `GET /v1/endpoint/{id}`
**Premium Required**: No/Yes
**Parameters**:
- `paramName` (required): Description
- `optionalParam` (optional): Description

**Returns**:
- `field1`: Description
- `field2`: Description
```

---

## ⚠️ Important Notes

1. **Never expose tokens** - All token management is handled by SpotifyService
2. **Always validate parameters** - Check required params before calling service
3. **Transform snake_case to camelCase** - Spotify API uses snake_case, our code uses camelCase
4. **Handle empty responses** - 204 No Content is valid for many operations
5. **Limit array results** - Include reasonable limits (10-50 items typically)