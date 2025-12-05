# Sub-Agent Task: Spotify Playback Tool

> **Priority**: 2 (Can run in parallel with other tool sub-agents)
> **Estimated Complexity**: Medium-High (includes migration)
> **Files to Create**: 1
> **Files to Modify**: 1

---

## 🎯 Objective

Create a new `spotifyPlayback` tool that handles all playback control Spotify API endpoints. This includes **migrating** existing actions from the monolithic tool and adding new endpoints.

---

## 📋 Endpoints to Implement

### MIGRATE from existing spotify.ts:
- `play` → `play`
- `pause` → `pause`
- `next` → `skip_to_next`
- `previous` → `skip_to_previous`
- `now_playing` → `get_current_playback`
- `get_devices` → `get_devices`

### NEW Endpoints:

### 1. set_repeat_mode
**Spotify API**: `PUT /v1/me/player/repeat?state={state}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/set-repeat-mode-on-users-playback
**Premium Required**: Yes

### 2. toggle_shuffle
**Spotify API**: `PUT /v1/me/player/shuffle?state={state}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/toggle-shuffle-for-users-playback
**Premium Required**: Yes

### 3. seek_to_position
**Spotify API**: `PUT /v1/me/player/seek?position_ms={position}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/seek-to-position-in-currently-playing-track
**Premium Required**: Yes

### 4. set_volume
**Spotify API**: `PUT /v1/me/player/volume?volume_percent={volume}`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/set-volume-for-users-playback
**Premium Required**: Yes

### 5. transfer_playback
**Spotify API**: `PUT /v1/me/player`
**Reference**: https://developer.spotify.com/documentation/web-api/reference/transfer-a-users-playback
**Premium Required**: Yes

---

## 📁 Files to Create/Modify

### CREATE: `lib/ai/tools/spotify-playback.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

type SpotifyToolProps = {
  userId: string;
};

export const spotifyPlayback = ({ userId }: SpotifyToolProps) =>
  tool({
    description: `Playback control for Spotify. Available actions:
- "get_current_playback": Get currently playing track with progress and device info
- "get_devices": List available Spotify devices
- "play": Start/resume playback, optionally with a specific track/album/playlist URI
- "pause": Pause playback
- "skip_to_next": Skip to next track
- "skip_to_previous": Go to previous track
- "seek": Seek to position in current track
- "set_volume": Set playback volume (0-100)
- "set_repeat_mode": Set repeat mode (track/context/off)
- "toggle_shuffle": Turn shuffle on or off
- "transfer_playback": Transfer playback to another device

Note: All playback control actions (except get_current_playback and get_devices) require Spotify Premium.`,
    
    inputSchema: z.object({
      action: z.enum([
        "get_current_playback",
        "get_devices",
        "play",
        "pause",
        "skip_to_next",
        "skip_to_previous",
        "seek",
        "set_volume",
        "set_repeat_mode",
        "toggle_shuffle",
        "transfer_playback",
      ]),
      uri: z
        .string()
        .optional()
        .describe("Spotify URI to play (e.g., spotify:track:xxx, spotify:album:xxx, spotify:playlist:xxx)"),
      deviceId: z
        .string()
        .optional()
        .describe("Device ID to target for playback"),
      positionMs: z
        .number()
        .optional()
        .describe("Position in milliseconds for seek action"),
      volumePercent: z
        .number()
        .optional()
        .describe("Volume percentage (0-100) for set_volume action"),
      repeatState: z
        .enum(["track", "context", "off"])
        .optional()
        .describe("Repeat mode: 'track' (repeat one), 'context' (repeat playlist/album), 'off'"),
      shuffleState: z
        .boolean()
        .optional()
        .describe("Shuffle state: true to enable, false to disable"),
      play: z
        .boolean()
        .optional()
        .describe("For transfer_playback: whether to start playing on new device (default: false)"),
    }),

    execute: async ({ 
      action, uri, deviceId, positionMs, volumePercent, 
      repeatState, shuffleState, play 
    }) => {
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
          case "get_current_playback": {
            const result = await service.getCurrentlyPlaying();
            if (!result.track) {
              return {
                action: "get_current_playback",
                playing: false,
                message: "Nothing is currently playing on Spotify.",
              };
            }
            return {
              action: "get_current_playback",
              playing: result.isPlaying,
              track: {
                name: result.track.name,
                artist: result.track.artists.map((a) => a.name).join(", "),
                album: result.track.album.name,
                albumArt: result.track.album.images[0]?.url,
                uri: result.track.uri,
                durationMs: result.track.durationMs,
              },
              progressMs: result.progressMs,
              device: result.device,
            };
          }

          case "get_devices": {
            const devices = await service.getDevices();
            return {
              action: "get_devices",
              devices,
              activeDevice: devices.find((d) => d.isActive),
            };
          }

          case "play": {
            const result = await service.play(uri, deviceId);
            return { action: "play", ...result };
          }

          case "pause": {
            const result = await service.pause();
            return { action: "pause", ...result };
          }

          case "skip_to_next": {
            const result = await service.next();
            return { action: "skip_to_next", ...result };
          }

          case "skip_to_previous": {
            const result = await service.previous();
            return { action: "skip_to_previous", ...result };
          }

          case "seek": {
            if (positionMs === undefined) {
              return {
                error: "missing_position",
                message: "positionMs is required for seek",
              };
            }
            const result = await service.seekToPosition(positionMs, deviceId);
            return { action: "seek", ...result };
          }

          case "set_volume": {
            if (volumePercent === undefined) {
              return {
                error: "missing_volume",
                message: "volumePercent is required for set_volume",
              };
            }
            if (volumePercent < 0 || volumePercent > 100) {
              return {
                error: "invalid_volume",
                message: "volumePercent must be between 0 and 100",
              };
            }
            const result = await service.setVolume(volumePercent, deviceId);
            return { action: "set_volume", ...result };
          }

          case "set_repeat_mode": {
            if (!repeatState) {
              return {
                error: "missing_repeat_state",
                message: "repeatState is required (track/context/off)",
              };
            }
            const result = await service.setRepeatMode(repeatState, deviceId);
            return { action: "set_repeat_mode", state: repeatState, ...result };
          }

          case "toggle_shuffle": {
            if (shuffleState === undefined) {
              return {
                error: "missing_shuffle_state",
                message: "shuffleState is required (true/false)",
              };
            }
            const result = await service.setShuffle(shuffleState, deviceId);
            return { action: "toggle_shuffle", state: shuffleState, ...result };
          }

          case "transfer_playback": {
            if (!deviceId) {
              return {
                error: "missing_device_id",
                message: "deviceId is required for transfer_playback",
              };
            }
            const result = await service.transferPlayback(deviceId, play);
            return { action: "transfer_playback", deviceId, ...result };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Spotify playback tool error:", error.message);
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

Add these new methods to the SpotifyService class (existing methods like `play`, `pause`, `next`, `previous`, `getCurrentlyPlaying`, `getDevices` already exist - keep them):

```typescript
// Add to SpotifyService class

async seekToPosition(positionMs: number, deviceId?: string): Promise<SpotifyPlayResult> {
  try {
    const params = new URLSearchParams({ position_ms: String(positionMs) });
    if (deviceId) params.set('device_id', deviceId);
    await this.apiCall(`/me/player/seek?${params}`, { method: 'PUT' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        error: 'premium_required',
        message: 'Seek control requires Spotify Premium',
      };
    }
    if (error.status === 404) {
      return {
        error: 'no_device',
        message: 'No active Spotify device found. Open Spotify on any device and try again.',
      };
    }
    throw error;
  }
}

async setVolume(volumePercent: number, deviceId?: string): Promise<SpotifyPlayResult> {
  try {
    const params = new URLSearchParams({ volume_percent: String(volumePercent) });
    if (deviceId) params.set('device_id', deviceId);
    await this.apiCall(`/me/player/volume?${params}`, { method: 'PUT' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        error: 'premium_required',
        message: 'Volume control requires Spotify Premium',
      };
    }
    if (error.status === 404) {
      return {
        error: 'no_device',
        message: 'No active Spotify device found. Open Spotify on any device and try again.',
      };
    }
    throw error;
  }
}

async setRepeatMode(state: 'track' | 'context' | 'off', deviceId?: string): Promise<SpotifyPlayResult> {
  try {
    const params = new URLSearchParams({ state });
    if (deviceId) params.set('device_id', deviceId);
    await this.apiCall(`/me/player/repeat?${params}`, { method: 'PUT' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        error: 'premium_required',
        message: 'Repeat mode control requires Spotify Premium',
      };
    }
    if (error.status === 404) {
      return {
        error: 'no_device',
        message: 'No active Spotify device found. Open Spotify on any device and try again.',
      };
    }
    throw error;
  }
}

async setShuffle(state: boolean, deviceId?: string): Promise<SpotifyPlayResult> {
  try {
    const params = new URLSearchParams({ state: String(state) });
    if (deviceId) params.set('device_id', deviceId);
    await this.apiCall(`/me/player/shuffle?${params}`, { method: 'PUT' });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        error: 'premium_required',
        message: 'Shuffle control requires Spotify Premium',
      };
    }
    if (error.status === 404) {
      return {
        error: 'no_device',
        message: 'No active Spotify device found. Open Spotify on any device and try again.',
      };
    }
    throw error;
  }
}

async transferPlayback(deviceId: string, play?: boolean): Promise<SpotifyPlayResult> {
  try {
    await this.apiCall('/me/player', {
      method: 'PUT',
      body: JSON.stringify({
        device_ids: [deviceId],
        play: play ?? false,
      }),
    });
    return { success: true };
  } catch (error: any) {
    if (error.status === 403) {
      return {
        error: 'premium_required',
        message: 'Transfer playback requires Spotify Premium',
      };
    }
    throw error;
  }
}
```

---

## ✅ Acceptance Criteria

1. [ ] `lib/ai/tools/spotify-playback.ts` created with all 11 actions
2. [ ] 5 new service methods added (`seekToPosition`, `setVolume`, `setRepeatMode`, `setShuffle`, `transferPlayback`)
3. [ ] Existing service methods reused (`play`, `pause`, `next`, `previous`, `getCurrentlyPlaying`, `getDevices`)
4. [ ] All Premium-required actions return proper `premium_required` error
5. [ ] Device-dependent actions return proper `no_device` error
6. [ ] Error handling follows master blueprint patterns
7. [ ] Parameter validation for required fields
8. [ ] No TypeScript errors

---

## 🔗 Dependencies

- Requires master blueprint: `docs/subagents/00-master-blueprint.md`
- Reuses existing `SpotifyPlayResult`, `SpotifyDevice`, `SpotifyTrack` interfaces
- Must be registered by Tool Registration sub-agent after completion