# Sub-Agent Task: Tool Registration

> **Priority**: 3 (Must run AFTER all tool sub-agents complete)
> **Estimated Complexity**: Medium
> **Files to Create**: 1 (index file)
> **Files to Modify**: 2

---

## 🎯 Objective

Register all new Spotify tools in the chat API route and create an index file for clean imports. Also handle deprecation of the legacy monolithic tool.

---

## 📋 Tasks

### 1. Create Tool Index File
Create an index file that exports all Spotify tools for clean imports.

### 2. Update Chat Route
Register all new tools in `app/(chat)/api/chat/route.ts`.

### 3. Handle Legacy Tool
Deprecate the old monolithic `spotify` tool (keep for backwards compatibility with a deprecation notice, or remove entirely).

---

## 📁 Files to Create/Modify

### CREATE: `lib/ai/tools/spotify/index.ts`

```typescript
// Spotify Tools Index
// Exports all Spotify-related AI tools for use in the chat route

export { spotifyAlbums } from './spotify-albums';
export { spotifyArtists } from './spotify-artists';
export { spotifyPlayback } from './spotify-playback';
export { spotifyQueue } from './spotify-queue';
export { spotifyPlaylists } from './spotify-playlists';
export { spotifyTracks } from './spotify-tracks';
export { spotifyUser } from './spotify-user';

// Type for tool props
export type SpotifyToolProps = {
  userId: string;
};
```

### REORGANIZE: Move Tool Files

Move the following files from `lib/ai/tools/` to `lib/ai/tools/spotify/`:
- `spotify-albums.ts`
- `spotify-artists.ts`
- `spotify-playback.ts`
- `spotify-queue.ts`
- `spotify-playlists.ts`
- `spotify-tracks.ts`
- `spotify-user.ts`

**Directory structure after reorganization:**
```
lib/ai/tools/
├── spotify/
│   ├── index.ts
│   ├── spotify-albums.ts
│   ├── spotify-artists.ts
│   ├── spotify-playback.ts
│   ├── spotify-queue.ts
│   ├── spotify-playlists.ts
│   ├── spotify-tracks.ts
│   └── spotify-user.ts
├── spotify.ts                 # DEPRECATED - to be removed
├── create-document.ts
├── get-weather.ts
├── request-suggestions.ts
├── update-document.ts
├── use-skill.ts
└── web-fetch.ts
```

### MODIFY: `app/(chat)/api/chat/route.ts`

**Changes needed:**

1. Update imports (replace old spotify import with new ones):

```typescript
// REMOVE this import:
// import { spotify } from "@/lib/ai/tools/spotify";

// ADD these imports:
import {
  spotifyAlbums,
  spotifyArtists,
  spotifyPlayback,
  spotifyQueue,
  spotifyPlaylists,
  spotifyTracks,
  spotifyUser,
} from "@/lib/ai/tools/spotify";
```

2. Update the tools object (around line 225-238):

```typescript
// Before:
const tools = {
  getWeather,
  createDocument: createDocument({ session, dataStream }),
  updateDocument: updateDocument({ session, dataStream }),
  requestSuggestions: requestSuggestions({
    session,
    dataStream,
  }),
  useSkill: useSkill({ availableSkills }),
  getSkillResource: getSkillResource({ availableSkills }),
  webFetch,
  spotify: spotify({ userId: session.user.id }),
};

// After:
const tools = {
  getWeather,
  createDocument: createDocument({ session, dataStream }),
  updateDocument: updateDocument({ session, dataStream }),
  requestSuggestions: requestSuggestions({
    session,
    dataStream,
  }),
  useSkill: useSkill({ availableSkills }),
  getSkillResource: getSkillResource({ availableSkills }),
  webFetch,
  // Spotify tools (separated by domain)
  spotifyAlbums: spotifyAlbums({ userId: session.user.id }),
  spotifyArtists: spotifyArtists({ userId: session.user.id }),
  spotifyPlayback: spotifyPlayback({ userId: session.user.id }),
  spotifyQueue: spotifyQueue({ userId: session.user.id }),
  spotifyPlaylists: spotifyPlaylists({ userId: session.user.id }),
  spotifyTracks: spotifyTracks({ userId: session.user.id }),
  spotifyUser: spotifyUser({ userId: session.user.id }),
};
```

3. Update the `activeTools` arrays (around line 252-274):

```typescript
// Before:
if (availableSkills.length > 0) {
  activeTools = [
    "getWeather",
    "createDocument",
    "updateDocument",
    "requestSuggestions",
    "useSkill",
    "getSkillResource",
    "webFetch",
    "spotify",
  ];
} else {
  activeTools = [
    "getWeather",
    "createDocument",
    "updateDocument",
    "requestSuggestions",
    "webFetch",
    "spotify",
  ];
}

// After:
const spotifyTools = [
  "spotifyAlbums",
  "spotifyArtists",
  "spotifyPlayback",
  "spotifyQueue",
  "spotifyPlaylists",
  "spotifyTracks",
  "spotifyUser",
] as ToolName[];

if (availableSkills.length > 0) {
  activeTools = [
    "getWeather",
    "createDocument",
    "updateDocument",
    "requestSuggestions",
    "useSkill",
    "getSkillResource",
    "webFetch",
    ...spotifyTools,
  ];
} else {
  activeTools = [
    "getWeather",
    "createDocument",
    "updateDocument",
    "requestSuggestions",
    "webFetch",
    ...spotifyTools,
  ];
}
```

### DELETE or DEPRECATE: `lib/ai/tools/spotify.ts`

**Option A - Delete the file** (recommended if confident all functionality is migrated):
Simply delete the file after all new tools are working.

**Option B - Mark as deprecated** (safer):
Rename to `spotify.ts.deprecated` or add a deprecation notice:

```typescript
// @deprecated - This file is deprecated and will be removed in a future version.
// Use the individual tools in lib/ai/tools/spotify/ instead:
// - spotifyAlbums for album operations
// - spotifyArtists for artist operations
// - spotifyPlayback for playback control
// - spotifyQueue for queue management
// - spotifyPlaylists for playlist operations
// - spotifyTracks for track operations
// - spotifyUser for user profile and follow operations

// ... rest of file
```

---

## ✅ Acceptance Criteria

1. [ ] `lib/ai/tools/spotify/index.ts` created with all exports
2. [ ] All 7 Spotify tool files moved to `lib/ai/tools/spotify/` directory
3. [ ] Chat route imports updated to use new tools
4. [ ] Tools object updated with all 7 new Spotify tools
5. [ ] activeTools arrays updated with all tool names
6. [ ] Legacy `spotify.ts` removed or deprecated
7. [ ] TypeScript compilation succeeds with no errors
8. [ ] Server starts without runtime errors

---

## 🔗 Dependencies

**Must wait for completion of:**
- `02-albums-tool-subagent.md`
- `03-artists-tool-subagent.md`
- `04-playback-tool-subagent.md`
- `05-queue-tool-subagent.md`
- `06-playlists-tool-subagent.md`
- `07-tracks-tool-subagent.md`
- `08-user-tool-subagent.md`

---

## 🧪 Verification

After implementation:

1. Run TypeScript compilation:
```bash
pnpm type-check
```

2. Start the dev server:
```bash
pnpm dev
```

3. Verify no console errors on startup

4. Test that at least one tool from each category responds to a chat message