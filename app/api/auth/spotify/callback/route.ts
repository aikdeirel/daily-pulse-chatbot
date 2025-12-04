import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { saveOAuthConnection } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Verify state matches user ID (CSRF protection)
  if (!session?.user?.id || state !== session.user.id) {
    redirect("/?error=spotify_auth_failed");
  }

  if (error || !code) {
    redirect("/?error=spotify_auth_denied");
  }

  // Validate required environment variables
  if (
    !process.env.SPOTIFY_CLIENT_ID ||
    !process.env.SPOTIFY_CLIENT_SECRET ||
    !process.env.SPOTIFY_REDIRECT_URI
  ) {
    console.error(
      "Missing required Spotify environment variables: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REDIRECT_URI",
    );
    redirect("/?error=spotify_config_error");
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error("Token exchange failed");
    }

    const tokens = await tokenResponse.json();

    // Store in database
    await saveOAuthConnection({
      userId: session.user.id,
      provider: "spotify",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: tokens.scope,
    });

    // Frontend contract: When redirected with `?spotify=connected`, the frontend
    // should show a success notification/toast to inform the user that Spotify
    // was connected successfully.
    redirect("/?spotify=connected");
  } catch (error) {
    // Re-throw redirect errors - they're not actual errors in Next.js 14+
    // Redirect throws a special error with digest starting with 'NEXT_REDIRECT'
    if (
      error instanceof Error &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Spotify OAuth error:", error);
    redirect("/?error=spotify_auth_failed");
  }
}
