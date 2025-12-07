// Spotify Tools Index
// Exports all Spotify-related AI tools for use in the chat route

export { spotifyAlbums } from "./spotify-albums";
export { spotifyArtists } from "./spotify-artists";
export { spotifyPlayback } from "./spotify-playback";
export { spotifyPlaylists } from "./spotify-playlists";
export { spotifyQueue } from "./spotify-queue";
export { spotifySearch } from "./spotify-search";
export { spotifyTracks } from "./spotify-tracks";
export { spotifyUser } from "./spotify-user";

// Type for tool props
export type SpotifyToolProps = {
  userId: string;
};
