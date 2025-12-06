import { auth } from "@/app/(auth)/auth";
import { GoogleService } from "@/lib/services/google";

export async function GET(_request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const googleService = new GoogleService(session.user.id);

  try {
    const calendars = await googleService.listCalendars();
    return Response.json(calendars);
  } catch (error) {
    console.error("Google Calendar API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 },
    );
  }
}
