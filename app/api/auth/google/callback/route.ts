import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { saveOAuthConnection } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  console.log("Google OAuth Callback: Received callback request");

  const session = await auth();
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  console.log("Google OAuth Callback: Query parameters", {
    code: !!code,
    state,
    error,
  });

  // Verify state matches user ID (CSRF protection)
  if (!session?.user?.id || state !== session.user.id) {
    console.error("Google OAuth Callback: CSRF validation failed", {
      sessionUserId: session?.user?.id,
      state,
    });
    redirect("/?error=google_auth_failed");
  }

  if (error || !code) {
    console.error("Google OAuth Callback: Error or missing code", {
      error,
      code,
    });
    redirect("/?error=google_auth_denied");
  }

  // Validate required environment variables
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REDIRECT_URI
  ) {
    console.error(
      "Missing required Google environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI",
      {
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
      },
    );
    redirect("/?error=google_config_error");
  }

  try {
    console.log("Google OAuth Callback: Exchanging code for tokens");

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      }),
    });

    console.log(
      "Google OAuth Callback: Token response status",
      tokenResponse.status,
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Google OAuth Callback: Token exchange failed", {
        status: tokenResponse.status,
        errorText,
      });
      throw new Error("Token exchange failed");
    }

    const tokens = await tokenResponse.json();
    console.log("Google OAuth Callback: Tokens received successfully", {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
    });

    // Store in database
    await saveOAuthConnection({
      userId: session.user.id,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: tokens.scope,
    });

    console.log("Google OAuth Callback: OAuth connection saved to database");

    // Frontend contract: When redirected with `?google=connected`, the frontend
    // should show a success notification/toast to inform the user that Google
    // was connected successfully.
    redirect("/?google=connected");
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
    console.error("Google OAuth Callback: Error in callback handler", error);
    redirect("/?error=google_auth_failed");
  }
}
