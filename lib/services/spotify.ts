import { getOAuthConnection, saveOAuthConnection } from "@/lib/db/queries";
import { APILogger } from "@/lib/utils/api-logger";

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

export interface SpotifyAlbum {
  id: string;
  name: string;
  albumType: "album" | "single" | "compilation";
  artists: { id: string; name: string; uri: string }[];
  images: { url: string; width: number; height: number }[];
  releaseDate: string;
  releaseDatePrecision: "year" | "month" | "day";
  totalTracks: number;
  uri: string;
  externalUrl: string;
  copyrights?: { text: string; type: string }[];
  genres?: string[];
  label?: string;
  popularity?: number;
}

export interface SpotifySimplifiedTrack {
  id: string;
  name: string;
  trackNumber: number;
  discNumber: number;
  durationMs: number;
  explicit: boolean;
  artists: { id: string; name: string; uri: string }[];
  uri: string;
  previewUrl: string | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; width: number; height: number }[];
  popularity: number;
  followers: number;
  uri: string;
  externalUrl: string;
}

export interface SpotifyArtistAlbum {
  id: string;
  name: string;
  albumType: "album" | "single" | "compilation";
  albumGroup: "album" | "single" | "appears_on" | "compilation";
  artists: { id: string; name: string; uri: string }[];
  images: { url: string; width: number; height: number }[];
  releaseDate: string;
  releaseDatePrecision: "year" | "month" | "day";
  totalTracks: number;
  uri: string;
  externalUrl: string;
}

export interface SpotifyQueueTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  durationMs: number;
  uri: string;
}

export interface SpotifyQueueResponse {
  currentlyPlaying: SpotifyQueueTrack | null;
  queue: SpotifyQueueTrack[];
}

export interface SpotifyFullTrack {
  id: string;
  name: string;
  artists: { id: string; name: string; uri: string }[];
  album: {
    id: string;
    name: string;
    albumType: string;
    images: { url: string; width: number; height: number }[];
    releaseDate: string;
    uri: string;
  };
  durationMs: number;
  explicit: boolean;
  popularity: number;
  trackNumber: number;
  discNumber: number;
  uri: string;
  externalUrl: string;
  previewUrl: string | null;
  isPlayable?: boolean;
}

export interface SpotifySavedTrack {
  addedAt: string;
  track: SpotifyFullTrack;
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
    const startTime = Date.now();

    try {
      const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const error = new Error(`Spotify API error: ${response.status}`);
        (error as any).status = response.status;

        // Log API errors
        APILogger.logError(
          "Spotify",
          options?.method || "GET",
          endpoint,
          error,
          options?.body,
        );

        throw error;
      }

      // Handle 204 No Content or empty responses
      if (response.status === 204) {
        // Log successful API requests
        APILogger.logRequest(
          "Spotify",
          options?.method || "GET",
          endpoint,
          options?.body,
          {},
          response.status,
          durationMs,
        );
        return {} as T;
      }

      // Check if response has content before parsing JSON
      const contentType = response.headers.get("content-type");
      const contentLength = response.headers.get("content-length");

      // If no content or not JSON, return empty object
      if (contentLength === "0" || !contentType?.includes("application/json")) {
        // Log successful API requests
        APILogger.logRequest(
          "Spotify",
          options?.method || "GET",
          endpoint,
          options?.body,
          {},
          response.status,
          durationMs,
        );
        return {} as T;
      }

      // Try to parse JSON, return empty object if it fails
      try {
        const text = await response.text();
        if (!text || text.trim() === "") {
          // Log successful API requests
          APILogger.logRequest(
            "Spotify",
            options?.method || "GET",
            endpoint,
            options?.body,
            {},
            response.status,
            durationMs,
          );
          return {} as T;
        }
        const responseData = JSON.parse(text) as T;

        // Log successful API requests
        APILogger.logRequest(
          "Spotify",
          options?.method || "GET",
          endpoint,
          options?.body,
          responseData,
          response.status,
          durationMs,
        );

        return responseData;
      } catch (parseError) {
        // Log JSON parsing errors
        APILogger.logError(
          "Spotify",
          options?.method || "GET",
          endpoint,
          parseError,
          options?.body,
        );
        return {} as T;
      }
    } catch (error) {
      // Log any unexpected errors
      if (error instanceof Error) {
        APILogger.logError(
          "Spotify",
          options?.method || "GET",
          endpoint,
          error,
          options?.body,
        );
      }
      throw error;
    }
  }

  async getCurrentlyPlaying(): Promise<{
    track: SpotifyTrack | null;
    isPlaying: boolean;
    progressMs: number;
    device?: SpotifyDevice;
  }> {
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
    limit: number = 10,
  ) {
    const params = new URLSearchParams({
      q: query,
      type: types.join(","),
      limit: limit.toString(),
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

  async getTopArtists(
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  ) {
    return this.apiCall<{ items: any[] }>(
      `/me/top/artists?time_range=${timeRange}&limit=10`,
    );
  }

  async getPlaylists(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    const paramString = params.toString() ? `?${params}` : "?limit=20";
    return this.apiCall<{ items: any[]; total: number; next: string | null }>(
      `/me/playlists${paramString}`,
    );
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

  async getPlaylistTracks(playlistId: string, limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    const paramString = params.toString() ? `?${params}` : "?limit=50";
    return this.apiCall<{ items: any[]; total: number; next: string | null }>(
      `/playlists/${playlistId}/tracks${paramString}`,
    );
  }

  async getAlbum(albumId: string, market?: string): Promise<SpotifyAlbum> {
    const params = market ? `?market=${market}` : "";
    const data = await this.apiCall<any>(`/albums/${albumId}${params}`);
    return {
      id: data.id,
      name: data.name,
      albumType: data.album_type,
      artists: data.artists.map((a: any) => ({
        id: a.id,
        name: a.name,
        uri: a.uri,
      })),
      images: data.images,
      releaseDate: data.release_date,
      releaseDatePrecision: data.release_date_precision,
      totalTracks: data.total_tracks,
      uri: data.uri,
      externalUrl: data.external_urls?.spotify,
      copyrights: data.copyrights,
      genres: data.genres,
      label: data.label,
      popularity: data.popularity,
    };
  }

  async getMultipleAlbums(
    albumIds: string[],
    market?: string,
  ): Promise<SpotifyAlbum[]> {
    const params = new URLSearchParams({ ids: albumIds.join(",") });
    if (market) params.set("market", market);
    const data = await this.apiCall<{ albums: any[] }>(`/albums?${params}`);
    return data.albums.filter(Boolean).map((album) => ({
      id: album.id,
      name: album.name,
      albumType: album.album_type,
      artists: album.artists.map((a: any) => ({
        id: a.id,
        name: a.name,
        uri: a.uri,
      })),
      images: album.images,
      releaseDate: album.release_date,
      releaseDatePrecision: album.release_date_precision,
      totalTracks: album.total_tracks,
      uri: album.uri,
      externalUrl: album.external_urls?.spotify,
      copyrights: album.copyrights,
      genres: album.genres,
      label: album.label,
      popularity: album.popularity,
    }));
  }

  async getAlbumTracks(
    albumId: string,
    options?: { limit?: number; offset?: number; market?: string },
  ): Promise<{
    tracks: SpotifySimplifiedTrack[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.market) params.set("market", options.market);

    const paramString = params.toString() ? `?${params}` : "";
    const data = await this.apiCall<any>(
      `/albums/${albumId}/tracks${paramString}`,
    );

    return {
      tracks: data.items.map((t: any) => ({
        id: t.id,
        name: t.name,
        trackNumber: t.track_number,
        discNumber: t.disc_number,
        durationMs: t.duration_ms,
        explicit: t.explicit,
        artists: t.artists.map((a: any) => ({
          id: a.id,
          name: a.name,
          uri: a.uri,
        })),
        uri: t.uri,
        previewUrl: t.preview_url,
      })),
      total: data.total,
      hasMore: data.next !== null,
    };
  }

  async checkSavedAlbums(
    albumIds: string[],
  ): Promise<{ albumId: string; isSaved: boolean }[]> {
    const params = new URLSearchParams({ ids: albumIds.join(",") });
    const data = await this.apiCall<boolean[]>(`/me/albums/contains?${params}`);
    return albumIds.map((id, index) => ({
      albumId: id,
      isSaved: data[index],
    }));
  }

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    const data = await this.apiCall<any>(`/artists/${artistId}`);
    return {
      id: data.id,
      name: data.name,
      genres: data.genres,
      images: data.images,
      popularity: data.popularity,
      followers: data.followers?.total || 0,
      uri: data.uri,
      externalUrl: data.external_urls?.spotify,
    };
  }

  async getMultipleArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
    const params = new URLSearchParams({ ids: artistIds.join(",") });
    const data = await this.apiCall<{ artists: any[] }>(`/artists?${params}`);
    return data.artists.filter(Boolean).map((artist) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      images: artist.images,
      popularity: artist.popularity,
      followers: artist.followers?.total || 0,
      uri: artist.uri,
      externalUrl: artist.external_urls?.spotify,
    }));
  }

  async getArtistAlbums(
    artistId: string,
    options?: {
      includeGroups?: ("album" | "single" | "appears_on" | "compilation")[];
      limit?: number;
      offset?: number;
      market?: string;
    },
  ): Promise<{
    albums: SpotifyArtistAlbum[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (options?.includeGroups?.length)
      params.set("include_groups", options.includeGroups.join(","));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.market) params.set("market", options.market);

    const paramString = params.toString() ? `?${params}` : "";
    const data = await this.apiCall<any>(
      `/artists/${artistId}/albums${paramString}`,
    );

    return {
      albums: data.items.map((album: any) => ({
        id: album.id,
        name: album.name,
        albumType: album.album_type,
        albumGroup: album.album_group,
        artists: album.artists.map((a: any) => ({
          id: a.id,
          name: a.name,
          uri: a.uri,
        })),
        images: album.images,
        releaseDate: album.release_date,
        releaseDatePrecision: album.release_date_precision,
        totalTracks: album.total_tracks,
        uri: album.uri,
        externalUrl: album.external_urls?.spotify,
      })),
      total: data.total,
      hasMore: data.next !== null,
    };
  }

  async getArtistTopTracks(
    artistId: string,
    market: string,
  ): Promise<SpotifyTrack[]> {
    const data = await this.apiCall<{ tracks: any[] }>(
      `/artists/${artistId}/top-tracks?market=${market}`,
    );
    return data.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      artists: t.artists,
      album: t.album,
      uri: t.uri,
      durationMs: t.duration_ms,
    }));
  }

  async seekToPosition(
    positionMs: number,
    deviceId?: string,
  ): Promise<SpotifyPlayResult> {
    try {
      const params = new URLSearchParams({ position_ms: String(positionMs) });
      if (deviceId) params.set("device_id", deviceId);
      await this.apiCall(`/me/player/seek?${params}`, { method: "PUT" });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message: "Seek control requires Spotify Premium",
        };
      }
      if (error.status === 404) {
        return {
          error: "no_device",
          message:
            "No active Spotify device found. Open Spotify on any device and try again.",
        };
      }
      throw error;
    }
  }

  async setVolume(
    volumePercent: number,
    deviceId?: string,
  ): Promise<SpotifyPlayResult> {
    try {
      const params = new URLSearchParams({
        volume_percent: String(volumePercent),
      });
      if (deviceId) params.set("device_id", deviceId);
      await this.apiCall(`/me/player/volume?${params}`, { method: "PUT" });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message: "Volume control requires Spotify Premium",
        };
      }
      if (error.status === 404) {
        return {
          error: "no_device",
          message:
            "No active Spotify device found. Open Spotify on any device and try again.",
        };
      }
      throw error;
    }
  }

  async setRepeatMode(
    state: "track" | "context" | "off",
    deviceId?: string,
  ): Promise<SpotifyPlayResult> {
    try {
      const params = new URLSearchParams({ state });
      if (deviceId) params.set("device_id", deviceId);
      await this.apiCall(`/me/player/repeat?${params}`, { method: "PUT" });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message: "Repeat mode control requires Spotify Premium",
        };
      }
      if (error.status === 404) {
        return {
          error: "no_device",
          message:
            "No active Spotify device found. Open Spotify on any device and try again.",
        };
      }
      throw error;
    }
  }

  async setShuffle(
    state: boolean,
    deviceId?: string,
  ): Promise<SpotifyPlayResult> {
    try {
      const params = new URLSearchParams({ state: String(state) });
      if (deviceId) params.set("device_id", deviceId);
      await this.apiCall(`/me/player/shuffle?${params}`, { method: "PUT" });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message: "Shuffle control requires Spotify Premium",
        };
      }
      if (error.status === 404) {
        return {
          error: "no_device",
          message:
            "No active Spotify device found. Open Spotify on any device and try again.",
        };
      }
      throw error;
    }
  }

  async transferPlayback(
    deviceId: string,
    play?: boolean,
  ): Promise<SpotifyPlayResult> {
    try {
      await this.apiCall("/me/player", {
        method: "PUT",
        body: JSON.stringify({
          device_ids: [deviceId],
          play: play ?? false,
        }),
      });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message: "Transfer playback requires Spotify Premium",
        };
      }
      throw error;
    }
  }

  async getQueue(): Promise<SpotifyQueueResponse> {
    try {
      const data = await this.apiCall<any>("/me/player/queue");

      const mapTrack = (t: any): SpotifyQueueTrack | null => {
        if (!t) return null;
        return {
          id: t.id,
          name: t.name,
          artists:
            t.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
          album: {
            id: t.album?.id,
            name: t.album?.name,
            images: t.album?.images || [],
          },
          durationMs: t.duration_ms,
          uri: t.uri,
        };
      };

      return {
        currentlyPlaying: mapTrack(data.currently_playing),
        queue: (data.queue || [])
          .map(mapTrack)
          .filter(Boolean) as SpotifyQueueTrack[],
      };
    } catch (error: any) {
      if (error.status === 204 || error.status === 404) {
        // No active playback
        return {
          currentlyPlaying: null,
          queue: [],
        };
      }
      throw error;
    }
  }

  async addToQueue(uri: string, deviceId?: string): Promise<SpotifyPlayResult> {
    try {
      const params = new URLSearchParams({ uri });
      if (deviceId) params.set("device_id", deviceId);
      await this.apiCall(`/me/player/queue?${params}`, { method: "POST" });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "premium_required",
          message: "Adding to queue requires Spotify Premium",
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

  async getPlaylist(playlistId: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    owner: { id: string; displayName: string };
    public: boolean;
    collaborative: boolean;
    trackCount: number;
    followers: number;
    images: { url: string; width: number; height: number }[];
    uri: string;
    externalUrl: string;
    snapshotId: string;
  }> {
    const data = await this.apiCall<any>(`/playlists/${playlistId}`);
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      owner: {
        id: data.owner.id,
        displayName: data.owner.display_name,
      },
      public: data.public,
      collaborative: data.collaborative,
      trackCount: data.tracks.total,
      followers: data.followers?.total || 0,
      images: data.images || [],
      uri: data.uri,
      externalUrl: data.external_urls?.spotify,
      snapshotId: data.snapshot_id,
    };
  }

  async changePlaylistDetails(
    playlistId: string,
    details: { name?: string; description?: string; public?: boolean },
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      await this.apiCall(`/playlists/${playlistId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...(details.name && { name: details.name }),
          ...(details.description !== undefined && {
            description: details.description,
          }),
          ...(details.public !== undefined && { public: details.public }),
        }),
      });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          success: false,
          error: "permission_denied",
          message: "You do not have permission to edit this playlist",
        };
      }
      throw error;
    }
  }

  async removeTracksFromPlaylist(
    playlistId: string,
    trackUris: string[],
    snapshotId?: string,
  ): Promise<{
    success?: boolean;
    snapshotId?: string;
    error?: string;
    message?: string;
  }> {
    try {
      const body: any = {
        tracks: trackUris.map((uri) => ({ uri })),
      };
      if (snapshotId) body.snapshot_id = snapshotId;

      const data = await this.apiCall<{ snapshot_id: string }>(
        `/playlists/${playlistId}/tracks`,
        {
          method: "DELETE",
          body: JSON.stringify(body),
        },
      );
      return { success: true, snapshotId: data.snapshot_id };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "permission_denied",
          message: "You do not have permission to modify this playlist",
        };
      }
      throw error;
    }
  }

  async replacePlaylistTracks(
    playlistId: string,
    trackUris: string[],
  ): Promise<{
    success?: boolean;
    snapshotId?: string;
    error?: string;
    message?: string;
  }> {
    try {
      const data = await this.apiCall<{ snapshot_id: string }>(
        `/playlists/${playlistId}/tracks`,
        {
          method: "PUT",
          body: JSON.stringify({ uris: trackUris }),
        },
      );
      return { success: true, snapshotId: data.snapshot_id };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "permission_denied",
          message: "You do not have permission to modify this playlist",
        };
      }
      throw error;
    }
  }

  async reorderPlaylistTracks(
    playlistId: string,
    rangeStart: number,
    insertBefore: number,
    rangeLength?: number,
    snapshotId?: string,
  ): Promise<{
    success?: boolean;
    snapshotId?: string;
    error?: string;
    message?: string;
  }> {
    try {
      const body: any = {
        range_start: rangeStart,
        insert_before: insertBefore,
      };
      if (rangeLength !== undefined) body.range_length = rangeLength;
      if (snapshotId) body.snapshot_id = snapshotId;

      const data = await this.apiCall<{ snapshot_id: string }>(
        `/playlists/${playlistId}/tracks`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );
      return { success: true, snapshotId: data.snapshot_id };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          error: "permission_denied",
          message: "You do not have permission to modify this playlist",
        };
      }
      throw error;
    }
  }

  async getTrack(trackId: string, market?: string): Promise<SpotifyFullTrack> {
    const params = market ? `?market=${market}` : "";
    const data = await this.apiCall<any>(`/tracks/${trackId}${params}`);
    return this.mapFullTrack(data);
  }

  async getMultipleTracks(
    trackIds: string[],
    market?: string,
  ): Promise<SpotifyFullTrack[]> {
    const params = new URLSearchParams({ ids: trackIds.join(",") });
    if (market) params.set("market", market);
    const data = await this.apiCall<{ tracks: any[] }>(`/tracks?${params}`);
    return data.tracks.filter(Boolean).map((t) => this.mapFullTrack(t));
  }

  async getSavedTracks(options?: {
    limit?: number;
    offset?: number;
    market?: string;
  }): Promise<{
    tracks: SpotifySavedTrack[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.market) params.set("market", options.market);

    const paramString = params.toString() ? `?${params}` : "?limit=20";
    const data = await this.apiCall<any>(`/me/tracks${paramString}`);

    return {
      tracks: data.items.map((item: any) => ({
        addedAt: item.added_at,
        track: this.mapFullTrack(item.track),
      })),
      total: data.total,
      hasMore: data.next !== null,
    };
  }

  async saveTracks(
    trackIds: string[],
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      await this.apiCall(`/me/tracks?ids=${trackIds.join(",")}`, {
        method: "PUT",
      });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          success: false,
          error: "missing_scopes",
          message:
            "Missing permission to modify library. Please disconnect and reconnect Spotify.",
        };
      }
      throw error;
    }
  }

  async removeSavedTracks(
    trackIds: string[],
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      await this.apiCall(`/me/tracks?ids=${trackIds.join(",")}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          success: false,
          error: "missing_scopes",
          message:
            "Missing permission to modify library. Please disconnect and reconnect Spotify.",
        };
      }
      throw error;
    }
  }

  async checkSavedTracks(
    trackIds: string[],
  ): Promise<{ trackId: string; isSaved: boolean }[]> {
    const data = await this.apiCall<boolean[]>(
      `/me/tracks/contains?ids=${trackIds.join(",")}`,
    );
    return trackIds.map((id, index) => ({
      trackId: id,
      isSaved: data[index],
    }));
  }

  private mapFullTrack(t: any): SpotifyFullTrack {
    return {
      id: t.id,
      name: t.name,
      artists: t.artists.map((a: any) => ({
        id: a.id,
        name: a.name,
        uri: a.uri,
      })),
      album: {
        id: t.album.id,
        name: t.album.name,
        albumType: t.album.album_type,
        images: t.album.images,
        releaseDate: t.album.release_date,
        uri: t.album.uri,
      },
      durationMs: t.duration_ms,
      explicit: t.explicit,
      popularity: t.popularity,
      trackNumber: t.track_number,
      discNumber: t.disc_number,
      uri: t.uri,
      externalUrl: t.external_urls?.spotify,
      previewUrl: t.preview_url,
      isPlayable: t.is_playable,
    };
  }

  // ===== User Profile & Following Methods =====

  async getCurrentUserProfile(): Promise<SpotifyUserProfile> {
    const data = await this.apiCall<any>("/me");
    return {
      id: data.id,
      displayName: data.display_name,
      email: data.email,
      uri: data.uri,
      externalUrl: data.external_urls?.spotify,
      followers: data.followers?.total || 0,
      country: data.country,
      product: data.product,
      images: data.images || [],
    };
  }

  async getFollowedArtists(options?: {
    limit?: number;
    after?: string;
  }): Promise<{
    artists: SpotifyFollowedArtist[];
    total: number;
    cursors: { after: string | null };
  }> {
    const params = new URLSearchParams({ type: "artist" });
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.after) params.set("after", options.after);

    const data = await this.apiCall<any>(`/me/following?${params}`);

    return {
      artists: data.artists.items.map((a: any) => ({
        id: a.id,
        name: a.name,
        genres: a.genres,
        images: a.images,
        popularity: a.popularity,
        uri: a.uri,
        externalUrl: a.external_urls?.spotify,
      })),
      total: data.artists.total,
      cursors: {
        after: data.artists.cursors?.after || null,
      },
    };
  }

  async followArtists(
    artistIds: string[],
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      await this.apiCall(
        `/me/following?type=artist&ids=${artistIds.join(",")}`,
        {
          method: "PUT",
        },
      );
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          success: false,
          error: "missing_scopes",
          message:
            "Missing permission to follow. Please disconnect and reconnect Spotify.",
        };
      }
      throw error;
    }
  }

  async followUsers(
    userIds: string[],
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      await this.apiCall(`/me/following?type=user&ids=${userIds.join(",")}`, {
        method: "PUT",
      });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          success: false,
          error: "missing_scopes",
          message:
            "Missing permission to follow. Please disconnect and reconnect Spotify.",
        };
      }
      throw error;
    }
  }

  async unfollowArtists(
    artistIds: string[],
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      await this.apiCall(
        `/me/following?type=artist&ids=${artistIds.join(",")}`,
        {
          method: "DELETE",
        },
      );
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          success: false,
          error: "missing_scopes",
          message:
            "Missing permission to unfollow. Please disconnect and reconnect Spotify.",
        };
      }
      throw error;
    }
  }

  async unfollowUsers(
    userIds: string[],
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      await this.apiCall(`/me/following?type=user&ids=${userIds.join(",")}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (error: any) {
      if (error.status === 403) {
        return {
          success: false,
          error: "missing_scopes",
          message:
            "Missing permission to unfollow. Please disconnect and reconnect Spotify.",
        };
      }
      throw error;
    }
  }

  async checkFollowingArtists(
    artistIds: string[],
  ): Promise<{ artistId: string; isFollowing: boolean }[]> {
    const data = await this.apiCall<boolean[]>(
      `/me/following/contains?type=artist&ids=${artistIds.join(",")}`,
    );
    return artistIds.map((id, index) => ({
      artistId: id,
      isFollowing: data[index],
    }));
  }

  async checkFollowingUsers(
    userIds: string[],
  ): Promise<{ userId: string; isFollowing: boolean }[]> {
    const data = await this.apiCall<boolean[]>(
      `/me/following/contains?type=user&ids=${userIds.join(",")}`,
    );
    return userIds.map((id, index) => ({
      userId: id,
      isFollowing: data[index],
    }));
  }
}

// ===== User Profile & Following Interfaces =====

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  email?: string;
  uri: string;
  externalUrl: string;
  followers: number;
  country?: string;
  product?: "free" | "premium";
  images: { url: string; width: number; height: number }[];
}

export interface SpotifyFollowedArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; width: number; height: number }[];
  popularity: number;
  uri: string;
  externalUrl: string;
}
