# Spotify Integration Documentation

> **Status:** ✅ Fully Implemented | Last Updated: 2025-12-05

This document describes the Spotify integration for AI agents, providing guidance on available tools, actions, and common usage patterns.

---

## Quick Reference for AI Agents

### Tool Group Selector

The chat UI now exposes a "Spotify" button next to the web search toggle. When clicked, users can enable any of three tool groups (persisted per browser, defaulting to disabled):

1. **Discovery & Research** – `spotifyArtists`, `spotifyAlbums`, `spotifyTracks`, `spotifyUser`
2. **Playback Control** – `spotifyPlayback`
3. **Playlists & Queue** – `spotifyPlaylists`, `spotifyQueue`

Only the enabled groups are injected into the system prompt and made available as tools, keeping context compact.

### Available Tools & Actions

The Spotify integration is split into 7 specialized tools:

#### spotifyAlbums
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_album` | Get album details | `albumId` | No |
| `get_multiple_albums` | Get multiple albums (max 20) | `albumIds` | No |
| `get_album_tracks` | Get tracks from an album | `albumId` | No |
| `check_saved_albums` | Check if albums are saved | `albumIds` | No |

**Optional params:** `limit`, `offset`, `market`

#### spotifyArtists
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_artist` | Get artist details | `artistId` | No |
| `get_multiple_artists` | Get multiple artists (max 50) | `artistIds` | No |
| `get_artist_albums` | Get artist's albums | `artistId` | No |
| `get_artist_top_tracks` | Get artist's top tracks | `artistId` | No |

**Optional params:** `includeGroups`, `limit`, `offset`, `market`

#### spotifyPlayback
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_current_playback` | Get now playing | None | No |
| `get_devices` | List available devices | None | No |
| `play` | Start/resume playback | None (opt: `uri`, `deviceId`) | **Yes** |
| `pause` | Pause playback | None | **Yes** |
| `skip_to_next` | Skip to next track | None | **Yes** |
| `skip_to_previous` | Go to previous track | None | **Yes** |
| `seek` | Seek to position | `positionMs` | **Yes** |
| `set_volume` | Set playback volume | `volumePercent` | **Yes** |
| `set_repeat_mode` | Set repeat mode | `repeatState` | **Yes** |
| `toggle_shuffle` | Toggle shuffle | `shuffleState` | **Yes** |
| `transfer_playback` | Switch playback device | `deviceId` | **Yes** |

**Parameter details:**
- `repeatState`: `"track"` | `"context"` | `"off"`
- `shuffleState`: `true` | `false`
- `volumePercent`: 0-100
- `positionMs`: position in milliseconds

#### spotifyQueue
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_queue` | Get playback queue | None | No |
| `add_to_queue` | Add track to queue | `uri` | **Yes** |

**Note:** `uri` must be a track URI (e.g., `spotify:track:xxx`)

#### spotifyPlaylists
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_my_playlists` | Get user's playlists | None | No |
| `get_playlist` | Get playlist details | `playlistId` | No |
| `get_playlist_tracks` | Get playlist tracks | `playlistId` | No |
| `create_playlist` | Create new playlist | `playlistName` | No |
| `change_details` | Update playlist info | `playlistId` + changes | No |
| `add_tracks` | Add tracks to playlist | `playlistId`, `trackUris` | No |
| `remove_tracks` | Remove tracks from playlist | `playlistId`, `trackUris` | No |
| `reorder_tracks` | Reorder/replace tracks | `playlistId` + params | No |

**Optional params:** `playlistDescription`, `isPublic`, `limit`, `offset`, `rangeStart`, `insertBefore`, `rangeLength`, `snapshotId`

#### spotifyTracks
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_track` | Get track details | `trackId` | No |
| `get_multiple_tracks` | Get multiple tracks (max 50) | `trackIds` | No |
| `get_saved_tracks` | Get user's liked songs | None | No |
| `save_tracks` | Like tracks | `trackIds` | No |
| `remove_saved_tracks` | Unlike tracks | `trackIds` | No |
| `check_saved_tracks` | Check if tracks liked | `trackIds` | No |

**Optional params:** `limit`, `offset`, `market`

#### spotifyUser
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_profile` | Get user profile | None | No |
| `get_top_tracks` | Get top tracks | None (opt: `timeRange`) | No |
| `get_top_artists` | Get top artists | None (opt: `timeRange`) | No |
| `get_followed_artists` | Get followed artists | None | No |
| `follow_artists` | Follow artists | `artistIds` | No |
| `follow_users` | Follow users | `userIds` | No |
| `unfollow_artists` | Unfollow artists | `artistIds` | No |
| `unfollow_users` | Unfollow users | `userIds` | No |
| `check_following_artists` | Check if following artists | `artistIds` | No |
| `check_following_users` | Check if following users | `userIds` | No |

**Parameter details:**
- `timeRange`: `"short_term"` (~4 weeks) | `"medium_term"` (~6 months) | `"long_term"` (years)
- `limit`, `after` (cursor for pagination)

---

## Common User Requests & Tool Usage

```
User: "What's playing on Spotify?"
→ spotifyPlayback: action: "get_current_playback"

User: "Show me albums by Taylor Swift"
→ spotifyArtists: action: "get_artist_albums", artistId: "xxx"

User: "Show my top artists"
→ spotifyUser: action: "get_top_artists"

User: "Skip this song"
→ spotifyPlayback: action: "skip_to_next"

User: "Add this to my queue"
→ spotifyQueue: action: "add_to_queue", uri: "spotify:track:xxx"

User: "Create a workout playlist"
→ spotifyPlaylists: action: "create_playlist", playlistName: "Workout"

User: "Like this song"
→ spotifyTracks: action: "save_tracks", trackIds: ["xxx"]

User: "Follow this artist"
→ spotifyUser: action: "follow_artists", artistIds: ["xxx"]

User: "Get my playlists"
→ spotifyPlaylists: action: "get_my_playlists"

User: "Show me the queue"
→ spotifyQueue: action: "get_queue"

User: "Set volume to 50%"
→ spotifyPlayback: action: "set_volume", volumePercent: 50

User: "Turn on shuffle"
→ spotifyPlayback: action: "toggle_shuffle", shuffleState: true

User: "Pause the music"
→ spotifyPlayback: action: "pause"
```

---

## Error Handling Guide

### Common Error Codes

| Error Code | Meaning | Response |
|------------|---------|----------|
| `not_connected` | User hasn't connected Spotify | Guide to user menu → Connect Spotify |
| `premium_required` | Action needs Spotify Premium | Inform user, suggest alternatives |
| `no_device` | No active playback device | Tell user to open Spotify app |
| `not_found` | Resource doesn't exist | Check ID validity |
| `permission_denied` | Can't modify resource | User doesn't own playlist |
| `missing_scopes` | Token lacks permissions | Disconnect and reconnect Spotify |
| `missing_{param}` | Required parameter absent | Include the parameter |
| `too_many_ids` | Exceeded ID limit | Reduce array size (see limits per action) |
| `invalid_uri` | Invalid Spotify URI format | Use correct format (spotify:track:xxx) |
| `invalid_volume` | Volume out of range | Use value between 0-100 |
| `api_error` | Generic Spotify error | Check error message |
| `unknown_action` | Invalid action name | Check available actions for the tool |

### Scope-Related Errors

Some actions require specific OAuth scopes. If a user connected before these scopes were added, they'll need to disconnect and reconnect:

| Scope | Required For |
|-------|--------------|
| `user-library-modify` | save_tracks, remove_saved_tracks |
| `user-follow-read` | check_following_artists/users, get_followed_artists |
| `user-follow-modify` | follow_artists/users, unfollow_artists/users |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI Tool Layer                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │spotifyAlbums│ │spotifyArtists│ │spotifyPlayback│ │ spotifyQueue │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬───────┘ └──────┬──────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                    │
│  │spotifyPlaylists│ │spotifyTracks│ │ spotifyUser │                    │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘                    │
└─────────┼────────────────┼────────────────┼─────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Service Layer: lib/services/spotify.ts                  │
│              SpotifyService class - ALL API methods                  │
│  • Token management (auto-refresh with 5-min buffer)                │
│  • Premium detection (403 → premium_required error)                 │
│  • Device handling (404 → returns available devices)                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Spotify Web API                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
lib/
├── services/
│   └── spotify.ts              # SpotifyService class - all API methods
├── ai/tools/
│   └── spotify/
│       ├── index.ts            # Exports all Spotify tools
│       ├── spotify-albums.ts   # Album operations (4 actions)
│       ├── spotify-artists.ts  # Artist operations (4 actions)
│       ├── spotify-playback.ts # Playback control (11 actions)
│       ├── spotify-queue.ts    # Queue management (2 actions)
│       ├── spotify-playlists.ts# Playlist operations (8 actions)
│       ├── spotify-tracks.ts   # Track operations (6 actions)
│       └── spotify-user.ts     # User profile & following (10 actions)
└── db/
    ├── schema.ts               # oauthConnection table
    └── queries.ts              # OAuth CRUD functions

hooks/
└── use-spotify-now-playing.ts  # SWR hook for header indicator

app/api/auth/spotify/
├── route.ts                    # OAuth initiation
├── callback/route.ts           # OAuth callback
├── disconnect/route.ts         # Disconnect endpoint
└── status/route.ts             # Connection status

app/api/spotify/
├── now-playing/route.ts        # GET - current playback
└── playback/route.ts           # POST - play/pause control

components/
├── spotify-player.tsx          # UI component for tool output
├── spotify-now-playing-indicator.tsx  # Header indicator
├── chat-header.tsx             # Includes the indicator
├── message.tsx                 # Tool rendering
└── sidebar-user-nav.tsx        # Connect/disconnect menu
```

---

## OAuth Scopes

The integration requests these 11 Spotify API scopes:

| Scope | Purpose |
|-------|---------|
| `user-read-playback-state` | Get playback state, queue, devices |
| `user-modify-playback-state` | Control playback (Premium only) |
| `user-read-currently-playing` | Get currently playing track |
| `playlist-read-private` | Read user's private playlists |
| `playlist-modify-public` | Create/modify public playlists |
| `playlist-modify-private` | Create/modify private playlists |
| `user-library-read` | Read saved tracks, albums |
| `user-library-modify` | Save/remove tracks, albums |
| `user-top-read` | Read top tracks/artists |
| `user-follow-read` | Check followed artists/users |
| `user-follow-modify` | Follow/unfollow artists/users |

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

## Header Now Playing Indicator

The application displays a real-time "Now Playing" indicator in the header.

### Features

- **Real-time updates**: Polls the Spotify API every 5 seconds
- **Responsive design**: Adapts to mobile and desktop layouts
- **Marquee animation**: Long track names scroll horizontally on mobile
- **Playback control**: Click to play/pause (Premium users only)
- **Visual feedback**: Animated equalizer bars when playing
- **Smart polling**: Pauses when browser tab is hidden

### UI Behavior

| Screen Size | Display |
|-------------|---------|
| Mobile | Album art + scrolling text + equalizer |
| Desktop | Album art + full track info + equalizer |

---

## Known Limitations

### Device Activation Requirement
Spotify's Web API cannot "wake up" idle devices. Users must manually open Spotify and start playback before the AI can control it.

### Premium Requirements
Playback control (play, pause, skip, seek, volume, repeat, shuffle, queue) requires Spotify Premium.

### Rate Limits
Spotify API has rate limits. Heavy usage may result in temporary 429 errors.

### ID Limits
- Albums: max 20 IDs per request
- Artists: max 50 IDs per request
- Tracks: max 50 IDs per request
- Users/Artists to follow: max 50 IDs per request

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Spotify not connected" | User menu → Connect Spotify |
| Playback controls fail | Check for Spotify Premium |
| "No active device" | Open Spotify on any device |
| Can't modify playlist | Check ownership or missing scopes |
| Follow/unfollow fails | Disconnect and reconnect Spotify |
| Images not loading | Check next.config.ts image domains |
| "Missing scopes" errors | Disconnect and reconnect to grant new scopes |

---

## Workflow Examples

### Creating a Playlist with Tracks

```
1. Create playlist:
   spotifyPlaylists: action: "create_playlist",
                     playlistName: "Workout Mix",
                     playlistDescription: "High energy tracks"
   → Returns playlist with ID

2. Add tracks (using track URIs):
   spotifyPlaylists: action: "add_tracks",
                     playlistId: "playlist_id_from_step_1",
                     trackUris: ["spotify:track:xxx", "spotify:track:yyy"]
   → Confirms tracks added
```

### Finding and Playing an Artist's Top Tracks

```
1. Get artist details (if you have the ID):
   spotifyArtists: action: "get_artist", artistId: "xxx"
   → Returns artist info

2. Get their top tracks:
   spotifyArtists: action: "get_artist_top_tracks", artistId: "xxx"
   → Returns top 10 tracks with URIs

3. Play a track:
   spotifyPlayback: action: "play", uri: "spotify:track:yyy"
   → Starts playback (Premium required)
```

### Managing User's Library

```
1. Check if tracks are liked:
   spotifyTracks: action: "check_saved_tracks", trackIds: ["xxx", "yyy"]
   → Returns array of booleans

2. Like a track:
   spotifyTracks: action: "save_tracks", trackIds: ["xxx"]
   → Confirms track saved

3. Get user's liked songs:
   spotifyTracks: action: "get_saved_tracks", limit: 20
   → Returns saved tracks with pagination info
```

### Exploring Artist's Discography

```
1. Get artist's albums:
   spotifyArtists: action: "get_artist_albums",
                   artistId: "xxx",
                   includeGroups: ["album", "single"]
   → Returns albums and singles

2. Get tracks from an album:
   spotifyAlbums: action: "get_album_tracks", albumId: "yyy"
   → Returns album tracks with URIs
