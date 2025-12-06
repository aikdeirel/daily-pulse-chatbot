import { auth } from "@/app/(auth)/auth";
import { GoogleService } from "@/lib/services/google";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { query, calendarId = "primary" } = await request.json();

  if (!query) {
    return new Response("Query parameter is required", { status: 400 });
  }

  const googleService = new GoogleService(session.user.id);

  try {
    // Use the smart search functionality
    const events = await googleService.searchEventsSmart(calendarId, query);

    return Response.json(events);
  } catch (error: unknown) {
    console.error("Google Events Smart Search API error:", error);

    // Handle specific error cases using the enhanced error handling
    if (error instanceof Error) {
      const errorResponse = googleService.handleApiError(error);

      // Return appropriate error response based on error type
      if (errorResponse.error === "not_connected") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 401 },
        );
      }

      if (errorResponse.error === "invalid_calendar") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 400 },
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
