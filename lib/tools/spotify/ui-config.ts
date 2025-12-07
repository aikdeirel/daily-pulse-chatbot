/**
 * Centralized Spotify Tool UI Configuration
 *
 * This module provides a single source of truth for all Spotify tool display
 * configurations, including:
 * - Tool types and their identifiers
 * - Default labels, colors, and descriptions
 * - Action-specific titles and descriptions
 *
 * Used by both components/elements/tool.tsx and components/message.tsx
 */

// Spotify tool type names (matching the tool definitions)
export const SPOTIFY_TOOL_TYPES = [
  "tool-spotifyAlbums",
  "tool-spotifyArtists",
  "tool-spotifyPlayback",
  "tool-spotifyQueue",
  "tool-spotifyPlaylists",
  "tool-spotifySearch",
  "tool-spotifyTracks",
  "tool-spotifyUser",
] as const;

export type SpotifyToolType = (typeof SPOTIFY_TOOL_TYPES)[number];

// Action configuration with title and description
type ActionConfig = {
  title: string;
  description: string;
};

// Complete tool UI configuration
type SpotifyToolUIConfig = {
  label: string;
  color: string;
  defaultTitle: string;
  defaultDescription: string;
  actions: Record<string, ActionConfig>;
};

// Spotify brand color
const SPOTIFY_COLOR = "text-[#1DB954] dark:text-[#1DB954]";

/**
 * Centralized configuration for all Spotify tools.
 * Each tool has:
 * - label: The tool's display name
 * - color: Tailwind CSS classes for the tool's brand color
 * - defaultTitle: Default title when no action is specified
 * - defaultDescription: Default description when no action is specified
 * - actions: Map of action names to their specific title/description
 */
export const spotifyToolUIConfig: Record<SpotifyToolType, SpotifyToolUIConfig> =
  {
    "tool-spotifyAlbums": {
      label: "Spotify Albums",
      color: SPOTIFY_COLOR,
      defaultTitle: "Albums",
      defaultDescription: "Searching albums",
      actions: {
        get_album: {
          title: "Album Details",
          description: "Fetching album details",
        },
        get_multiple_albums: {
          title: "Albums",
          description: "Fetching albums",
        },
        get_album_tracks: {
          title: "Album Tracks",
          description: "Fetching album tracks",
        },
        check_saved_albums: {
          title: "Checking Saved Albums",
          description: "Checking saved albums",
        },
      },
    },
    "tool-spotifyArtists": {
      label: "Spotify Artists",
      color: SPOTIFY_COLOR,
      defaultTitle: "Artists",
      defaultDescription: "Searching artists",
      actions: {
        get_artist: {
          title: "Artist Details",
          description: "Fetching artist details",
        },
        get_multiple_artists: {
          title: "Artists",
          description: "Fetching artists",
        },
        get_artist_albums: {
          title: "Artist Albums",
          description: "Fetching artist albums",
        },
        get_artist_top_tracks: {
          title: "Artist Top Tracks",
          description: "Fetching artist top tracks",
        },
      },
    },
    "tool-spotifyPlayback": {
      label: "Spotify Playback",
      color: SPOTIFY_COLOR,
      defaultTitle: "Playback",
      defaultDescription: "Managing playback",
      actions: {
        get_current_playback: {
          title: "Now Playing",
          description: "Fetching now playing",
        },
        get_devices: {
          title: "Devices",
          description: "Fetching devices",
        },
        play: {
          title: "Playing",
          description: "Starting playback",
        },
        pause: {
          title: "Pausing",
          description: "Pausing playback",
        },
        skip_to_next: {
          title: "Next Track",
          description: "Skipping to next track",
        },
        skip_to_previous: {
          title: "Previous Track",
          description: "Skipping to previous track",
        },
        seek: {
          title: "Seeking",
          description: "Seeking in track",
        },
        set_volume: {
          title: "Volume",
          description: "Setting volume",
        },
        set_repeat_mode: {
          title: "Repeat Mode",
          description: "Setting repeat mode",
        },
        toggle_shuffle: {
          title: "Shuffle",
          description: "Toggling shuffle",
        },
        transfer_playback: {
          title: "Transfer Playback",
          description: "Transferring playback",
        },
      },
    },
    "tool-spotifyQueue": {
      label: "Spotify Queue",
      color: SPOTIFY_COLOR,
      defaultTitle: "Queue",
      defaultDescription: "Managing queue",
      actions: {
        get_queue: {
          title: "Queue",
          description: "Fetching queue",
        },
        add_to_queue: {
          title: "Adding to Queue",
          description: "Adding to queue",
        },
      },
    },
    "tool-spotifyPlaylists": {
      label: "Spotify Playlists",
      color: SPOTIFY_COLOR,
      defaultTitle: "Playlists",
      defaultDescription: "Managing playlists",
      actions: {
        get_my_playlists: {
          title: "Playlists",
          description: "Fetching playlists",
        },
        get_playlist: {
          title: "Playlist Details",
          description: "Fetching playlist details",
        },
        get_playlist_tracks: {
          title: "Playlist Tracks",
          description: "Fetching playlist tracks",
        },
        create_playlist: {
          title: "Creating Playlist",
          description: "Creating playlist",
        },
        change_details: {
          title: "Updating Playlist",
          description: "Updating playlist details",
        },
        add_tracks: {
          title: "Adding to Playlist",
          description: "Adding tracks to playlist",
        },
        remove_tracks: {
          title: "Removing from Playlist",
          description: "Removing tracks from playlist",
        },
        reorder_tracks: {
          title: "Reordering Playlist",
          description: "Reordering playlist tracks",
        },
      },
    },
    "tool-spotifySearch": {
      label: "Spotify Search",
      color: SPOTIFY_COLOR,
      defaultTitle: "Spotify Search",
      defaultDescription: "Searching on Spotify",
      actions: {},
    },
    "tool-spotifyTracks": {
      label: "Spotify Tracks",
      color: SPOTIFY_COLOR,
      defaultTitle: "Tracks",
      defaultDescription: "Searching tracks",
      actions: {
        get_track: {
          title: "Track Details",
          description: "Fetching track details",
        },
        get_multiple_tracks: {
          title: "Tracks",
          description: "Fetching tracks",
        },
        get_saved_tracks: {
          title: "Saved Tracks",
          description: "Fetching saved tracks",
        },
        save_tracks: {
          title: "Saving Tracks",
          description: "Saving tracks",
        },
        remove_saved_tracks: {
          title: "Removing Tracks",
          description: "Removing tracks",
        },
        check_saved_tracks: {
          title: "Checking Saved Tracks",
          description: "Checking saved tracks",
        },
      },
    },
    "tool-spotifyUser": {
      label: "Spotify User",
      color: SPOTIFY_COLOR,
      defaultTitle: "User",
      defaultDescription: "Fetching user profile",
      actions: {
        get_profile: {
          title: "Profile",
          description: "Fetching user profile",
        },
        get_top_tracks: {
          title: "Top Tracks",
          description: "Fetching top tracks",
        },
        get_top_artists: {
          title: "Top Artists",
          description: "Fetching top artists",
        },
        get_followed_artists: {
          title: "Followed Artists",
          description: "Fetching followed artists",
        },
        follow_artists: {
          title: "Following Artists",
          description: "Following artists",
        },
        follow_users: {
          title: "Following Users",
          description: "Following users",
        },
        unfollow_artists: {
          title: "Unfollowing Artists",
          description: "Unfollowing artists",
        },
        unfollow_users: {
          title: "Unfollowing Users",
          description: "Unfollowing users",
        },
        check_following_artists: {
          title: "Checking Following",
          description: "Checking following status",
        },
        check_following_users: {
          title: "Checking Following",
          description: "Checking following status",
        },
      },
    },
  };

/**
 * Result type for getSpotifyToolDisplay function
 */
export type SpotifyToolDisplayInfo = {
  title: string;
  description: string;
  label: string;
  color: string;
};

/**
 * Get the display information for a Spotify tool based on its type and action.
 *
 * @param toolType - The tool type (e.g., "tool-spotifyUser")
 * @param action - Optional action name (e.g., "get_top_tracks")
 * @returns Display information including title, description, label, and color
 */
export function getSpotifyToolDisplay(
  toolType: string,
  action?: string,
): SpotifyToolDisplayInfo {
  const config = spotifyToolUIConfig[toolType as SpotifyToolType];

  if (!config) {
    return {
      title: "Spotify",
      description: "Processing",
      label: "Spotify",
      color: SPOTIFY_COLOR,
    };
  }

  const actionConfig = action ? config.actions[action] : null;

  return {
    title: actionConfig?.title || config.defaultTitle,
    description: actionConfig?.description || config.defaultDescription,
    label: config.label,
    color: config.color,
  };
}

/**
 * Check if a tool type is a Spotify tool
 *
 * @param toolType - The tool type to check
 * @returns True if the tool is a Spotify tool
 */
export function isSpotifyTool(toolType: string): toolType is SpotifyToolType {
  return SPOTIFY_TOOL_TYPES.includes(toolType as SpotifyToolType);
}

/**
 * Get just the title for a Spotify tool
 *
 * @param toolType - The tool type
 * @param action - Optional action name
 * @returns The title string
 */
export function getSpotifyToolTitle(toolType: string, action?: string): string {
  return getSpotifyToolDisplay(toolType, action).title;
}

/**
 * Get just the description for a Spotify tool
 *
 * @param toolType - The tool type
 * @param action - Optional action name
 * @returns The description string
 */
export function getSpotifyToolDescription(
  toolType: string,
  action?: string,
): string {
  return getSpotifyToolDisplay(toolType, action).description;
}

/**
 * Get the base configuration for a Spotify tool (used by tool.tsx for toolConfigData)
 *
 * @param toolType - The tool type
 * @returns Object with label, color, and description
 */
export function getSpotifyToolBaseConfig(toolType: string): {
  label: string;
  color: string;
  description: string;
} {
  const config = spotifyToolUIConfig[toolType as SpotifyToolType];

  if (!config) {
    return {
      label: "Spotify",
      color: SPOTIFY_COLOR,
      description: "Processing",
    };
  }

  return {
    label: config.label,
    color: config.color,
    description: config.defaultDescription,
  };
}
