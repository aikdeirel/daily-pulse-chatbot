import { auth } from "@/app/(auth)/auth";
import { GoogleService } from "@/lib/services/google";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ calendarId: string; eventId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { calendarId, eventId } = await params;

  if (!calendarId || !eventId) {
    return new Response("calendarId and eventId are required", { status: 400 });
  }

  const googleService = new GoogleService(session.user.id);

  try {
    const event = await googleService.getEvent(calendarId, eventId);
    return Response.json(event);
  } catch (error: unknown) {
    console.error("Google Events API error:", error);

    // Handle specific error cases using the enhanced error handling
    if (error instanceof Error) {
      const errorResponse = googleService.handleApiError(error);

      // Return appropriate error response based on error type
      if (errorResponse.error === "not_found") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 404 },
        );
      }

      if (errorResponse.error === "authentication_error") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 401 },
        );
      }
    }

    // Default error handling
    const statusCode =
      error instanceof Error && (error as any).status
        ? (error as any).status
        : 500;
    return Response.json(googleService.handleGoogleCalendarError(error), {
      status: statusCode,
    });
  }
}
