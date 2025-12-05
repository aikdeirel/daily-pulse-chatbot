export const spotifyToolGroupIds = [
  "discovery",
  "playback",
  "collections",
] as const;

export type SpotifyToolGroupId = (typeof spotifyToolGroupIds)[number];

export type SpotifyToolName =
  | "spotifyAlbums"
  | "spotifyArtists"
  | "spotifyPlayback"
  | "spotifyPlaylists"
  | "spotifyQueue"
  | "spotifyTracks"
  | "spotifyUser";

export type SpotifyToolGroup = {
  id: SpotifyToolGroupId;
  label: string;
  description: string;
  prompt: string;
  tools: SpotifyToolName[];
};

export const SPOTIFY_TOOL_GROUP_STORAGE_KEY = "spotify-tool-groups";

export const spotifyToolGroups: SpotifyToolGroup[] = [
  {
    id: "discovery",
    label: "Discovery & Research",
    description: "Search artists, albums, tracks, and user stats for context.",
    prompt:
      "Use when the user asks to research artists, albums, tracks, or their Spotify stats.",
    tools: ["spotifyArtists", "spotifyAlbums", "spotifyTracks", "spotifyUser"],
  },
  {
    id: "playback",
    label: "Playback Control",
    description:
      "Inspect now playing and control playback on connected devices.",
    prompt:
      "Use when the user wants to check or control playback (play, pause, skip, volume).",
    tools: ["spotifyPlayback"],
  },
  {
    id: "collections",
    label: "Playlists & Queue",
    description:
      "Create playlists, edit queues, and organize the user library.",
    prompt:
      "Use when the user needs playlist management, queue updates, or library curation.",
    tools: ["spotifyPlaylists", "spotifyQueue"],
  },
];

export const getSpotifyGroupsByIds = (
  ids: SpotifyToolGroupId[],
): SpotifyToolGroup[] => {
  if (ids.length === 0) {
    return [];
  }

  const selection = new Set(ids);
  return spotifyToolGroups.filter((group) => selection.has(group.id));
};

export const getSpotifyToolNamesForGroups = (
  ids: SpotifyToolGroupId[],
): SpotifyToolName[] => {
  const groups = getSpotifyGroupsByIds(ids);
  const names = new Set<SpotifyToolName>();

  for (const group of groups) {
    for (const tool of group.tools) {
      names.add(tool);
    }
  }

  return Array.from(names);
};

export const getSpotifyPromptForGroups = (
  ids: SpotifyToolGroupId[],
): string => {
  const groups = getSpotifyGroupsByIds(ids);

  if (groups.length === 0) {
    return "";
  }

  const rows = groups
    .map((group) => `- ${group.label}: ${group.prompt}`)
    .join("\n");

  return `\n## Spotify Capabilities\n\n${rows}\n`;
};
