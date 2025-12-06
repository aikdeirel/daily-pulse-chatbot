import { auth } from "@/app/(auth)/auth";
import { GoogleService } from "@/lib/services/google";

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const calendarId = searchParams.get("calendarId");
  if (!calendarId) {
    return new Response("calendarId is required", { status: 400 });
  }

  const googleService = new GoogleService(session.user.id);

  try {
    const events = await googleService.listEvents(calendarId, {
      timeMin: searchParams.get("timeMin") || undefined,
      timeMax: searchParams.get("timeMax") || undefined,
      maxResults: searchParams.get("maxResults")
        ? Number(searchParams.get("maxResults"))
        : 10,
    });

    return Response.json(events);
  } catch (error: unknown) {
    console.error("Google Events API error:", error);

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

      if (errorResponse.error === "permission_denied") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 403 },
        );
      }

      if (errorResponse.error === "rate_limit") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 429 },
        );
      }

      if (errorResponse.error === "scope_validation_error") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 403 },
        );
      }

      if (errorResponse.error === "token_management_error") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 401 },
        );
      }

      if (errorResponse.error === "privacy_error") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 403 },
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

export async function POST(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const calendarId = searchParams.get("calendarId");
  if (!calendarId) {
    return new Response("calendarId is required", { status: 400 });
  }

  const eventData = await request.json();
  const googleService = new GoogleService(session.user.id);

  try {
    const event = await googleService.createEvent(calendarId, eventData);
    return Response.json(event);
  } catch (error: unknown) {
    console.error("Google Events API error:", error);

    // Handle specific error cases using the enhanced error handling
    if (error instanceof Error) {
      const errorResponse = googleService.handleApiError(error);

      // Return appropriate error response based on error type
      if (errorResponse.error === "invalid_event") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 400 },
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

      if (errorResponse.error === "permission_denied") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 403 },
        );
      }

      if (errorResponse.error === "scope_validation_error") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 403 },
        );
      }

      if (errorResponse.error === "token_management_error") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 401 },
        );
      }

      if (errorResponse.error === "privacy_error") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 403 },
        );
      }
    }

    // Default error handling
    const statusCode2 =
      error instanceof Error && (error as any).status
        ? (error as any).status
        : 500;
    return Response.json(googleService.handleGoogleCalendarError(error), {
      status: statusCode2,
    });
  }
}
