import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";

const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-library-read",
  "user-top-read",
].join(" ");

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SPOTIFY_SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    state: session.user.id, // CSRF protection
  });

  redirect(`https://accounts.spotify.com/authorize?${params}`);
}
