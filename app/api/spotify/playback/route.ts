import { auth } from "@/app/(auth)/auth";
import { hasOAuthConnection } from "@/lib/db/queries";
import { SpotifyService } from "@/lib/services/spotify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json(
        { error: "unauthorized", message: "Not authenticated" },
        { status: 401 },
      );
    }

    const connected = await hasOAuthConnection(session.user.id, "spotify");

    if (!connected) {
      return Response.json(
        { error: "not_connected", message: "Spotify not connected" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !["play", "pause"].includes(action)) {
      return Response.json(
        {
          error: "invalid_action",
          message: "Action must be 'play' or 'pause'",
        },
        { status: 400 },
      );
    }

    const spotifyService = new SpotifyService(session.user.id);

    let result: { error?: string; success?: boolean };
    if (action === "play") {
      result = await spotifyService.play();
    } else {
      result = await spotifyService.pause();
    }

    if (result.error) {
      return Response.json(result, {
        status: result.error === "premium_required" ? 403 : 400,
      });
    }

    return Response.json({ success: true, action });
  } catch (error: any) {
    console.error("Error controlling playback:", error);

    return Response.json(
      { error: "playback_failed", message: error.message },
      { status: 500 },
    );
  }
}
