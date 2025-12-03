# Spotify Integration Documentation

> **Status:** ✅ Fully Implemented | Last Updated: 2025-12-03

This document describes the Spotify integration for AI agents, providing guidance on available actions, parameters, and common usage patterns.

---

## Quick Reference for AI Agents

### Available Tool Actions

| Action                   | Description                      | Required Params                    | Premium Required |
| ------------------------ | -------------------------------- | ---------------------------------- | ---------------- |
| `now_playing`            | Get currently playing track      | None                               | No               |
| `search`                 | Search for tracks/artists/albums | `query`                            | No               |
| `play`                   | Start/resume playback            | None (optional: `uri`, `deviceId`) | **Yes**          |
| `pause`                  | Pause playback                   | None                               | **Yes**          |
| `next`                   | Skip to next track               | None                               | **Yes**          |
| `previous`               | Go to previous track             | None                               | **Yes**          |
| `top_tracks`             | Get user's top tracks            | None                               | No               |
| `top_artists`            | Get user's top artists           | None                               | No               |
| `playlists`              | Get user's playlists             | None                               | No               |
| `get_playlist_tracks`    | Get tracks from a playlist       | `playlistId`                       | No               |
| `create_playlist`        | Create a new playlist            | `playlistName`                     | No               |
| `add_tracks_to_playlist` | Add tracks to playlist           | `playlistId`, `trackUris`          | No               |
| `get_devices`            | List available devices           | None                               | No               |

### Common User Requests & Responses

```
User: "What's playing on Spotify?"
→ Use action: "now_playing"

User: "Search for Taylor Swift"
→ Use action: "search" with query: "Taylor Swift"

User: "Show my top artists"
→ Use action: "top_artists"

User: "Show my playlists"
→ Use action: "playlists"

User: "What songs are in my Workout playlist?"
→ First use "playlists" to get the playlist ID, then "get_playlist_tracks" with that ID

User: "Create a playlist called Road Trip"
→ Use action: "create_playlist" with playlistName: "Road Trip"

User: "Add this song to my playlist"
→ Use action: "add_tracks_to_playlist" with playlistId and trackUris from search results
```

---

## Tool Parameters

### Input Schema

```typescript
{
  action: enum [
    "now_playing", "search", "play", "pause", "next", "previous",
    "top_tracks", "top_artists", "playlists", "get_playlist_tracks",
    "create_playlist", "add_tracks_to_playlist", "get_devices"
  ],
  query?: string,           // For search action
  uri?: string,             // Spotify URI for play action (e.g., "spotify:track:xxx")
  deviceId?: string,        // Target device for playback
  playlistId?: string,      // For get_playlist_tracks and add_tracks_to_playlist
  playlistName?: string,    // For create_playlist
  playlistDescription?: string,  // Optional description for new playlist
  isPublic?: boolean,       // Whether playlist is public (default: false)
  trackUris?: string[],     // Array of track URIs for add_tracks_to_playlist
}
```

### Output Structure

All responses include an `action` field matching the requested action. Error responses include:

- `error`: Error code (e.g., "not_connected", "premium_required", "no_device")
- `message`: Human-readable error message

---

## Error Handling Guide

### "not_connected" Error

**Meaning:** User hasn't connected their Spotify account.
**Response:** Guide user to connect via the user menu in the sidebar.

### "premium_required" Error

**Meaning:** Action requires Spotify Premium (playback controls).
**Response:** Inform user that playback control requires Premium, but they can still search and view content.

### "no_device" Error

**Meaning:** No active Spotify device found.
**Response:** Tell user to open Spotify on any device. Response includes available devices if any.

### "not_owner" Error

**Meaning:** The playlist is owned by someone else and is not collaborative.
**Response:** Inform user they can only add tracks to playlists they own or collaborative playlists.

### "missing_scopes" Error

**Meaning:** User owns the playlist but their token lacks `playlist-modify-*` scopes (connected before these scopes were added).
**Response:** Guide user to disconnect and reconnect Spotify from the user menu.

### "permission_denied" Error

**Meaning:** Generic permission error when specific cause cannot be determined.
**Response:** Guide user to disconnect and reconnect Spotify from the user menu.

### "missing\_\*" Errors

**Meaning:** Required parameter was not provided.
**Response:** Retry with the missing parameter.

---

## Workflow Examples

### Creating a Playlist with Tracks

```
1. Search for tracks:
   action: "search", query: "workout songs"
   → Returns tracks with URIs

2. Create playlist:
   action: "create_playlist",
   playlistName: "Workout Mix",
   playlistDescription: "High energy workout tracks"
   → Returns playlist with ID

3. Add tracks:
   action: "add_tracks_to_playlist",
   playlistId: "playlist_id_from_step_2",
   trackUris: ["spotify:track:xxx", "spotify:track:yyy"]
   → Confirms tracks added
```

### Getting Tracks from a Specific Playlist

```
1. Get playlists to find the ID:
   action: "playlists"
   → Returns playlists with IDs

2. Get tracks from specific playlist:
   action: "get_playlist_tracks",
   playlistId: "target_playlist_id"
   → Returns up to 50 tracks with details
```

---

## Header Now Playing Indicator

The application displays a real-time "Now Playing" indicator in the header when music is playing on the user's Spotify account.

### Features

- **Real-time updates**: Polls the Spotify API every 5 seconds
- **Responsive design**: Adapts to mobile and desktop layouts
- **Marquee animation**: Long track names scroll horizontally on mobile
- **Playback control**: Click to play/pause (Premium users only)
- **Visual feedback**: Animated equalizer bars when playing
- **Smart polling**: Pauses when browser tab is hidden

### UI Behavior

| Screen Size | Display                                 |
| ----------- | --------------------------------------- |
| Mobile      | Album art + scrolling text + equalizer  |
| Desktop     | Album art + full track info + equalizer |

### Click Action

- **Premium users**: Toggle play/pause
- **Free users**: Shows "Premium required" toast
- **No device**: Shows "Open Spotify" toast

### Technical Details

- **Polling interval**: 5 seconds (configurable in hook)
- **Visibility API**: Pauses polling when tab is hidden
- **Optimistic updates**: UI updates immediately, then syncs
- **Error handling**: Graceful degradation with toasts

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
├─────────────────────────────────────────────────────────────────┤
│  Header                      │  Chat Message                    │
│  ├─ Now Playing Indicator   │  ├─ AI calls spotify tool        │
│  │   (click to play/pause)  │  └─ SpotifyPlayer component      │
│  │                          │                                    │
│  User Menu Dropdown          │                                    │
│  ├─ Connect Spotify         │                                    │
│  └─ Disconnect Spotify      │                                    │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Backend                                 │
├─────────────────────────────────────────────────────────────────┤
│  OAuth Routes               │  Spotify Service                   │
│  ├─ /api/auth/spotify      │  ├─ Token management (auto-refresh)│
│  ├─ /api/auth/spotify/     │  ├─ Premium detection              │
│  │   callback              │  ├─ Device selection               │
│  └─ /api/auth/spotify/     │  └─ All Spotify API calls          │
│      disconnect            │                                     │
│                             │                                     │
│  Playback API               │                                     │
│  ├─ /api/spotify/now-playing│ (GET - current track)             │
│  └─ /api/spotify/playback   │ (POST - play/pause)               │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                  │
├─────────────────────────────────────────────────────────────────┤
│  OAuthConnection table                                           │
│  ├─ userId, provider, accessToken, refreshToken                 │
│  └─ expiresAt, scopes, createdAt, updatedAt                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
lib/
├── services/
│   └── spotify.ts              # SpotifyService class - all API calls
├── ai/tools/
│   └── spotify.ts              # AI tool definition
└── db/
    ├── schema.ts               # oauthConnection table
    └── queries.ts              # OAuth CRUD functions

hooks/
└── use-spotify-now-playing.ts  # SWR hook for header indicator

app/api/auth/spotify/
├── route.ts                    # OAuth initiation
├── callback/route.ts           # OAuth callback
├── disconnect/route.ts         # Disconnect endpoint
└── status/route.ts             # Connection status check

app/api/spotify/
├── now-playing/route.ts        # GET - current playback state
└── playback/route.ts           # POST - play/pause control

components/
├── spotify-player.tsx          # UI component for tool output
├── spotify-now-playing-indicator.tsx  # Header indicator component
├── chat-header.tsx             # Includes the indicator
├── message.tsx                 # Tool rendering (tool-spotify case)
└── sidebar-user-nav.tsx        # Connect/disconnect menu item
```

---

## OAuth Scopes

The integration requests these Spotify API scopes:

| Scope                         | Purpose                         |
| ----------------------------- | ------------------------------- |
| `user-read-playback-state`    | Get current playback state      |
| `user-modify-playback-state`  | Control playback (Premium only) |
| `user-read-currently-playing` | Get currently playing track     |
| `playlist-read-private`       | Read user's private playlists   |
| `playlist-modify-public`      | Create/modify public playlists  |
| `playlist-modify-private`     | Create/modify private playlists |
| `user-library-read`           | Read user's saved content       |
| `user-top-read`               | Read user's top tracks/artists  |

---

## Environment Variables

Required in `.env.local`:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
```

For production, update `SPOTIFY_REDIRECT_URI` to your production domain.

---

## Image Domains Configuration

Spotify uses multiple CDN domains for images. These are configured in `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "*.scdn.co" },        // Album artwork, mosaics
    { protocol: "https", hostname: "*.spotifycdn.com" }, // User images, covers
  ],
}
```

---

## Key Implementation Notes

### Tool Definition Pattern

The AI SDK requires `inputSchema` (not `parameters`):

```typescript
// ✅ Correct
export const spotify = tool({
  inputSchema: z.object({ ... }),
});

// ❌ Wrong - causes TypeScript error
export const spotify = tool({
  parameters: z.object({ ... }),
});
```

### Token Management

The `SpotifyService` automatically:

- Checks token expiration (with 5-minute buffer)
- Refreshes expired tokens using the refresh token
- Updates the database with new tokens

### Premium Detection

Playback control endpoints return HTTP 403 for free-tier users. The service catches this and returns a `premium_required` error with a helpful message.

### Device Handling

When no active device is found (HTTP 404), the service:

1. Fetches available devices
2. Returns them in the error response
3. Allows user to see what devices are available

---

## Known Limitations

### Device Activation Requirement (Cannot "Wake Up" Idle Devices)

**This is a fundamental Spotify API limitation, not a bug in this implementation.**

#### The Problem

When users ask the AI to play music, they may receive a "No active Spotify device found" error even though their phone or other device appears as "available" in Spotify.

#### Why This Happens

Spotify's Web API distinguishes between two device states:

| State      | Meaning                                                              | Can Receive Commands |
| ---------- | -------------------------------------------------------------------- | -------------------- |
| Available  | Device is connected to Spotify Connect network (visible in the list) | ❌ No                |
| **Active** | Device is currently playing or has played very recently              | ✅ Yes               |

The Spotify Web API **cannot** "wake up" an idle device. This is intentional:

- **Battery preservation**: Mobile devices suspend apps in the background
- **User presence**: Spotify prevents third-party apps from unexpectedly starting audio
- **Platform constraints**: iOS/Android limit background app activation

#### User Workaround

Users must manually activate Spotify first by:

1. Opening the Spotify app on their phone/device
2. Playing any song (even briefly)
3. Then the AI can control playback seamlessly

Once a device is active, the AI can play/pause, skip, and queue tracks without issues.

#### Potential Future Solutions

1. **Spotify Web Playback SDK**: Implement a browser-based player that's always "active" when the tab is open. This would allow playback without needing an external device.

2. **User Education**: The AI should explain this limitation and guide users to activate Spotify manually when a `no_device` error occurs.

---

## Troubleshooting

### User says "Spotify not connected"

→ Guide them to click their avatar in the sidebar → "Connect Spotify"

### Playback controls don't work

→ Check if user has Spotify Premium. Free users can only search/view, not control playback.

### "No active device" error

→ User needs to open Spotify on any device (phone, desktop, web player)

### Cannot add tracks to playlist (403 error)

→ This can happen for several reasons:

1. **Missing permissions**: User connected before playlist scopes were added. They need to disconnect and reconnect Spotify from the user menu.
2. **Not the playlist owner**: The playlist belongs to someone else and is not collaborative. Only the owner can add tracks.
3. **Spotify-curated playlist**: Some playlists (like "Discover Weekly", "Release Radar", etc.) are generated by Spotify and cannot be modified.

### Images not loading

→ Check that `*.scdn.co` and `*.spotifycdn.com` are in `next.config.ts` image remotePatterns

### OAuth fails with redirect mismatch

→ Ensure `SPOTIFY_REDIRECT_URI` exactly matches what's configured in Spotify Developer Dashboard

### User connected before playlist features existed

→ They need to disconnect and reconnect to grant the new `playlist-modify-*` scopes
