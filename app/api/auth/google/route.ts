import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";

export const dynamic = "force-dynamic";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export async function GET() {
  console.log("Google OAuth: Starting authentication flow");

  const session = await auth();
  console.log("Google OAuth: Session retrieved", { userId: session?.user?.id });

  if (!session?.user?.id) {
    console.error("Google OAuth: Unauthorized - no session or user ID");
    return new Response("Unauthorized", { status: 401 });
  }

  // Validate required environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    console.error(
      "Missing required Google environment variables: GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI",
      {
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
      },
    );
    return new Response(
      "Server configuration error: Google integration is not properly configured.",
      { status: 500 },
    );
  }

  console.log("Google OAuth: Environment variables validated");
  console.log("Google OAuth: Redirect URI", process.env.GOOGLE_REDIRECT_URI);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    state: session.user.id, // CSRF protection
    access_type: "offline",
    prompt: "consent",
  });

  console.log(
    "Google OAuth: Redirecting to Google with params:",
    Object.fromEntries(params.entries()),
  );
  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
