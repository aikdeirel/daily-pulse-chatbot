import { auth } from "@/app/(auth)/auth";
import { SpotifyService } from "@/lib/services/spotify";
import { hasOAuthConnection } from "@/lib/db/queries";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ connected: false });
    }

    const connected = await hasOAuthConnection(session.user.id, "spotify");

    if (!connected) {
      return Response.json({ connected: false });
    }

    const spotifyService = new SpotifyService(session.user.id);
    const nowPlaying = await spotifyService.getCurrentlyPlaying();

    if (!nowPlaying.track) {
      return Response.json({
        connected: true,
        isPlaying: false,
        track: null,
      });
    }

    // Get the smallest album art for the header indicator (64px is usually the smallest)
    const albumArt =
      nowPlaying.track.album.images
        .sort((a, b) => a.width - b.width)
        .find((img) => img.width >= 64)?.url ||
      nowPlaying.track.album.images[0]?.url;

    return Response.json({
      connected: true,
      isPlaying: nowPlaying.isPlaying,
      track: {
        name: nowPlaying.track.name,
        artist: nowPlaying.track.artists.map((a) => a.name).join(", "),
        album: nowPlaying.track.album.name,
        albumArt,
        uri: nowPlaying.track.uri,
        durationMs: nowPlaying.track.durationMs,
      },
      progressMs: nowPlaying.progressMs,
      device: nowPlaying.device,
    });
  } catch (error: any) {
    console.error("Error fetching now playing:", error);

    // Handle specific error cases
    if (
      error.message?.includes("not connected") ||
      error.message?.includes("expired")
    ) {
      return Response.json({ connected: false, error: "not_connected" });
    }

    return Response.json(
      {
        connected: true,
        error: "fetch_failed",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
