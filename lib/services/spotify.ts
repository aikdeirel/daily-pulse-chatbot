import { getOAuthConnection, saveOAuthConnection } from "@/lib/db/queries";

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  uri: string;
  durationMs: number;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number;
}

export interface SpotifyPlayResult {
  success?: boolean;
  error?: "premium_required" | "no_device" | "no_track" | string;
  message?: string;
  devices?: SpotifyDevice[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  uri: string;
  externalUrl: string;
  trackCount: number;
  image?: string;
  public: boolean;
}

export interface SpotifyUser {
  id: string;
  displayName: string;
  email?: string;
  uri: string;
}

export class SpotifyService {
  constructor(private userId: string) {}

  private cachedScopes: string | null = null;

  private async getValidToken(): Promise<string> {
    const connection = await getOAuthConnection(this.userId, "spotify");

    if (!connection) {
      throw new Error("Spotify not connected");
    }

    // Cache scopes for diagnostic purposes
    this.cachedScopes = connection.scopes || null;

    // Check if token is expired (with 5 min buffer)
    if (
      connection.expiresAt &&
      connection.expiresAt < new Date(Date.now() + 5 * 60 * 1000)
    ) {
      if (!connection.refreshToken) {
        throw new Error("Refresh token not available");
      }
      return this.refreshAccessToken(connection.refreshToken);
    }

    return connection.accessToken;
  }

  async getStoredScopes(): Promise<string | null> {
    const connection = await getOAuthConnection(this.userId, "spotify");
    return connection?.scopes || null;
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      // Provide more specific error messages based on status code
      if (response.status === 400 || response.status === 401) {
        throw new Error(
          "Spotify authentication expired or revoked. Please reconnect your Spotify account.",
        );
      }
      throw new Error(`Token refresh failed (status ${response.status})`);
    }

    const data = await response.json();

    // Preserve existing scopes if not returned by Spotify
    const currentConnection = await getOAuthConnection(this.userId, "spotify");
    await saveOAuthConnection({
      userId: this.userId,
      provider: "spotify",
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope || currentConnection?.scopes || undefined,
    });

    return data.access_token;
  }

  private async apiCall<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const token = await this.getValidToken();
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = new Error(`Spotify API error: ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async getCurrentlyPlaying(): Promise<{
    track: SpotifyTrack | null;
    isPlaying: boolean;
    progressMs: number;
    device?: SpotifyDevice;
  }> {
    try {
      const data = await this.apiCall<any>("/me/player/currently-playing");

      if (!data || !data.item) {
        return { track: null, isPlaying: false, progressMs: 0 };
      }

      return {
        track: {
          id: data.item.id,
          name: data.item.name,
          artists: data.item.artists,
          album: data.item.album,
          uri: data.item.uri,
          durationMs: data.item.duration_ms,
        },
        isPlaying: data.is_playing,
        progressMs: data.progress_ms,
        device: data.device
          ? {
              id: data.device.id,
              name: data.device.name,
              type: data.device.type,
              isActive: data.device.is_active,
              volumePercent: data.device.volume_percent,
            }
          : undefined,
      };
    } catch (error: any) {
      // Note: 204 status is already handled in apiCall, so it won't reach here
      throw error;
    }
  }

  async getDevices(): Promise<SpotifyDevice[]> {
    const data = await this.apiCall<{ devices: any[] }>("/me/player/devices");
    return data.devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      isActive: d.is_active,
      volumePercent: d.volume_percent,
    }));
  }

  async search(
    query: string,
    types: ("track" | "artist" | "album")[] = ["track"],
  ) {
    const params = new URLSearchParams({
      q: query,
      type: types.join(","),
      limit: "10",
    });
    return this.apiCall<any>(`/search?${params}`);
  }

  async play(uri?: string, deviceId?: string): Promise<SpotifyPlayResult> {
    try {
      const endpoint = deviceId
        ? `/me/player/play?device_id=${deviceId}`
        : "/me/player/play";

      // Determine the correct body format based on URI type
      let body: string | undefined;
      if (uri) {
        // Check if this is a track URI or a context URI (playlist/album/artist)
        if (uri.startsWith("spotify:track:")) {
          // Track URIs use the "uris" array parameter
          body = JSON.stringify({ uris: [uri] });
        } else if (
          uri.startsWith("spotify:playlist:") ||
          uri.startsWith("spotify:album:") ||
          uri.startsWith("spotify:artist:")
        ) {
          // Playlists, albums, and artists use "context_uri" parameter
          body = JSON.stringify({ context_uri: uri });
        } else {
          // For unknown URI types, try as context_uri (more permissive)
          body = JSON.stringify({ context_uri: uri });
        }
      }

      await this.apiCall(endpoint, {
        method: "PUT",
        body,
      });

      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message:
            "Playback control requires Spotify Premium. You can still search and see what's playing.",
        };
      }
      if (error.status === 404) {
        const devices = await this.getDevices();
        return {
          error: "no_device",
          message:
            "No active Spotify device found. Open Spotify on any device and try again.",
          devices,
        };
      }
      throw error;
    }
  }

  async pause(): Promise<SpotifyPlayResult> {
    try {
      await this.apiCall("/me/player/pause", { method: "PUT" });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message: "Requires Spotify Premium",
        };
      }
      throw error;
    }
  }

  async next(): Promise<SpotifyPlayResult> {
    try {
      await this.apiCall("/me/player/next", { method: "POST" });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message: "Requires Spotify Premium",
        };
      }
      throw error;
    }
  }

  async previous(): Promise<SpotifyPlayResult> {
    try {
      await this.apiCall("/me/player/previous", { method: "POST" });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message: "Requires Spotify Premium",
        };
      }
      throw error;
    }
  }

  async getTopTracks(
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  ) {
    return this.apiCall<{ items: SpotifyTrack[] }>(
      `/me/top/tracks?time_range=${timeRange}&limit=10`,
    );
  }

  async getPlaylists() {
    return this.apiCall<{ items: any[] }>("/me/playlists?limit=20");
  }

  async getCurrentUser(): Promise<SpotifyUser> {
    const data = await this.apiCall<any>("/me");
    return {
      id: data.id,
      displayName: data.display_name,
      email: data.email,
      uri: data.uri,
    };
  }

  async createPlaylist(
    name: string,
    options?: {
      description?: string;
      public?: boolean;
    },
  ): Promise<SpotifyPlaylist> {
    const user = await this.getCurrentUser();
    const data = await this.apiCall<any>(`/users/${user.id}/playlists`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description: options?.description || "",
        public: options?.public ?? false,
      }),
    });

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      uri: data.uri,
      externalUrl: data.external_urls?.spotify,
      trackCount: data.tracks?.total || 0,
      image: data.images?.[0]?.url,
      public: data.public,
    };
  }

  async getPlaylistDetails(playlistId: string): Promise<{
    id: string;
    name: string;
    ownerId: string;
    ownerName: string;
    collaborative: boolean;
  }> {
    const data = await this.apiCall<any>(
      `/playlists/${playlistId}?fields=id,name,owner(id,display_name),collaborative`,
    );
    return {
      id: data.id,
      name: data.name,
      ownerId: data.owner.id,
      ownerName: data.owner.display_name,
      collaborative: data.collaborative,
    };
  }

  async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[],
  ): Promise<{
    snapshotId?: string;
    error?: string;
    message?: string;
    diagnostics?: { storedScopes: string; hasPlaylistModifyScope: boolean };
  }> {
    try {
      const data = await this.apiCall<{ snapshot_id: string }>(
        `/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          body: JSON.stringify({
            uris: trackUris,
          }),
        },
      );

      return { snapshotId: data.snapshot_id };
    } catch (error: any) {
      if (error.status === 403) {
        // Check ownership to provide more specific error
        try {
          const [playlist, currentUser] = await Promise.all([
            this.getPlaylistDetails(playlistId),
            this.getCurrentUser(),
          ]);

          const isOwner = playlist.ownerId === currentUser.id;

          if (!isOwner && !playlist.collaborative) {
            return {
              error: "not_owner",
              message: `This playlist "${playlist.name}" is owned by ${playlist.ownerName}. You can only add tracks to playlists you own or collaborative playlists.`,
            };
          }

          // User is owner but still got 403 - likely missing scopes
          const storedScopes =
            this.cachedScopes || (await this.getStoredScopes());
          const hasPlaylistScopes =
            storedScopes?.includes("playlist-modify") ?? false;

          return {
            error: "missing_scopes",
            message: `You own this playlist but cannot modify it. ${
              hasPlaylistScopes
                ? "Your token has playlist-modify scopes but Spotify still rejected the request. Try disconnecting and reconnecting your Spotify account."
                : "Your Spotify connection is missing playlist modification permissions. Please disconnect and reconnect your Spotify account from the user menu."
            }`,
            diagnostics: {
              storedScopes: storedScopes || "none",
              hasPlaylistModifyScope: hasPlaylistScopes,
            },
          };
        } catch {
          // Fallback if we can't get details
          return {
            error: "permission_denied",
            message:
              "Cannot modify this playlist. Please try disconnecting and reconnecting your Spotify account from the user menu.",
          };
        }
      }
      throw error;
    }
  }

  async getPlaylistTracks(playlistId: string) {
    return this.apiCall<{ items: any[] }>(
      `/playlists/${playlistId}/tracks?limit=50`,
    );
  }
}
