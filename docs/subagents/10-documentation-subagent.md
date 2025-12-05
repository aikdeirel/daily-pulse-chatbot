# Sub-Agent Task: Documentation Update

> **Priority**: 4 (Must run LAST after all other sub-agents complete)
> **Estimated Complexity**: Medium
> **Files to Modify**: 1

---

## 🎯 Objective

Update the `docs/SPOTIFY_INTEGRATION.md` documentation to reflect all new tools, actions, and endpoints added by the previous sub-agents.

---

## 📋 Tasks

1. Update Quick Reference table with all new actions
2. Update Tool Parameters section with new input schemas
3. Update Error Handling section with new error codes
4. Update File Structure section with new directory layout
5. Update OAuth Scopes section with new scopes
6. Add documentation for each new tool category
7. Update Architecture diagram

---

## 📁 File to Modify

### `docs/SPOTIFY_INTEGRATION.md`

**Complete rewrite of the document with all new tools:**

```markdown
# Spotify Integration Documentation

> **Status:** ✅ Fully Implemented | Last Updated: 2025-12-XX

This document describes the Spotify integration for AI agents, providing guidance on available tools, actions, and common usage patterns.

---

## Quick Reference for AI Agents

### Available Tools & Actions

The Spotify integration is split into 7 specialized tools:

#### spotifyAlbums
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_album` | Get album details | `albumId` | No |
| `get_multiple_albums` | Get multiple albums (max 20) | `albumIds` | No |
| `get_album_tracks` | Get tracks from an album | `albumId` | No |
| `check_saved_albums` | Check if albums are saved | `albumIds` | No |

#### spotifyArtists
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_artist` | Get artist details | `artistId` | No |
| `get_multiple_artists` | Get multiple artists (max 50) | `artistIds` | No |
| `get_artist_albums` | Get artist's albums | `artistId` | No |
| `get_artist_top_tracks` | Get artist's top tracks | `artistId` | No |
| `get_related_artists` | Get similar artists | `artistId` | No |

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

#### spotifyQueue
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_queue` | Get playback queue | None | No |
| `add_to_queue` | Add track to queue | `uri` | **Yes** |

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

#### spotifyTracks
| Action | Description | Required Params | Premium |
|--------|-------------|-----------------|---------|
| `get_track` | Get track details | `trackId` | No |
| `get_multiple_tracks` | Get multiple tracks (max 50) | `trackIds` | No |
| `get_saved_tracks` | Get user's liked songs | None | No |
| `save_tracks` | Like tracks | `trackIds` | No |
| `remove_saved_tracks` | Unlike tracks | `trackIds` | No |
| `check_saved_tracks` | Check if tracks liked | `trackIds` | No |

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

---

## Common User Requests & Tool Usage

```
User: "What's playing on Spotify?"
→ spotifyPlayback: action: "get_current_playback"

User: "Search for Taylor Swift"
→ spotifyArtists: action: "get_artist" (after finding ID via search)
   Or use general search endpoint if available

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

User: "Show me albums by [artist]"
→ spotifyArtists: action: "get_artist_albums", artistId: "xxx"
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
| `too_many_ids` | Exceeded ID limit | Reduce array size |
| `api_error` | Generic Spotify error | Check error message |

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
│  │ spotifyAlbums │ │spotifyArtists│ │spotifyPlayback│ │ spotifyQueue │   │
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
│       ├── spotify-albums.ts   # Album operations
│       ├── spotify-artists.ts  # Artist operations
│       ├── spotify-playback.ts # Playback control
│       ├── spotify-queue.ts    # Queue management
│       ├── spotify-playlists.ts# Playlist operations
│       ├── spotify-tracks.ts   # Track operations
│       └── spotify-user.ts     # User profile & following
└── db/
    ├── schema.ts               # oauthConnection table
    └── queries.ts              # OAuth CRUD functions

app/api/auth/spotify/
├── route.ts                    # OAuth initiation
├── callback/route.ts           # OAuth callback
├── disconnect/route.ts         # Disconnect endpoint
└── status/route.ts             # Connection status

app/api/spotify/
├── now-playing/route.ts        # GET - current playback
└── playback/route.ts           # POST - play/pause control
```

---

## OAuth Scopes

The integration requests these Spotify API scopes:

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

---

## Known Limitations

### Device Activation Requirement
Spotify's Web API cannot "wake up" idle devices. Users must manually open Spotify and start playback before the AI can control it.

### Premium Requirements
Playback control (play, pause, skip, seek, volume, repeat, shuffle, queue) requires Spotify Premium.

### Rate Limits
Spotify API has rate limits. Heavy usage may result in temporary 429 errors.

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
```

---

## ✅ Acceptance Criteria

1. [ ] Quick Reference tables updated with all 7 tools and all actions
2. [ ] Common User Requests section updated with new tool names
3. [ ] Error Handling section includes new error codes
4. [ ] Architecture diagram shows new tool structure
5. [ ] File Structure shows new directory layout
6. [ ] OAuth Scopes includes new scopes
7. [ ] All action/parameter names are accurate
8. [ ] Premium requirements correctly indicated

---

## 🔗 Dependencies

**Must wait for completion of ALL other sub-agents:**
- `01-oauth-scopes-subagent.md` - For new scopes
- `02-albums-tool-subagent.md` through `08-user-tool-subagent.md` - For tool details
- `09-tool-registration-subagent.md` - For file structure

---

## 📝 Notes

- The documentation should serve as a reference for AI agents
- Keep action names and parameter names EXACTLY as implemented
- Include premium requirements for each action
- Document any edge cases or special behaviors