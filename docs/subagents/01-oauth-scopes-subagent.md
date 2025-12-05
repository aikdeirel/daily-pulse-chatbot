# Sub-Agent Task: OAuth Scopes Update

> **Priority**: 1 (Must run FIRST before any tool implementation)
> **Estimated Complexity**: Low
> **Files to Modify**: 1

---

## 🎯 Objective

Update the Spotify OAuth authorization flow to request additional scopes required by the new endpoints.

---

## 📋 Task Details

### Current Scopes (in app/api/auth/spotify/route.ts)

```
user-read-playback-state
user-modify-playback-state
user-read-currently-playing
playlist-read-private
playlist-modify-public
playlist-modify-private
user-library-read
user-top-read
```

### Scopes to ADD

| Scope | Required By |
|-------|-------------|
| `user-library-modify` | save-tracks-user, remove-tracks-user |
| `user-follow-read` | Checking if user follows artists/users |
| `user-follow-modify` | follow-artists-users, unfollow-artists-users |

---

## 📁 File to Modify

### `app/api/auth/spotify/route.ts`

Find the `scope` parameter in the authorization URL construction and add the new scopes.

**Before:**
```typescript
const scope = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-library-read",
  "user-top-read",
].join(" ");
```

**After:**
```typescript
const scope = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-library-read",
  "user-library-modify",
  "user-top-read",
  "user-follow-read",
  "user-follow-modify",
].join(" ");
```

---

## ✅ Acceptance Criteria

1. [ ] Three new scopes added: `user-library-modify`, `user-follow-read`, `user-follow-modify`
2. [ ] Scopes are properly joined with spaces
3. [ ] No syntax errors in the file
4. [ ] Existing scopes remain unchanged

---

## ⚠️ Important Notes

- Users who connected Spotify BEFORE this change will need to disconnect and reconnect to get the new scopes
- This is expected behavior and documented in SPOTIFY_INTEGRATION.md under "Cannot add tracks to playlist (403 error)"
- The documentation sub-agent will update the docs to mention this for the new scopes as well

---

## 🧪 Verification

After implementation, verify by:
1. Starting the dev server
2. Navigating to `/api/auth/spotify`
3. Checking that the OAuth URL includes all scopes in the `scope` parameter