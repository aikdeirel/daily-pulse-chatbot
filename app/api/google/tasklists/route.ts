import { auth } from "@/app/(auth)/auth";
import { GoogleService } from "@/lib/services/google";

export async function GET(_request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const googleService = new GoogleService(session.user.id);

  try {
    const tasklists = await googleService.listTaskLists();
    return Response.json(tasklists);
  } catch (error: unknown) {
    console.error("Google Tasks API error:", error);

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

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tasklistData = await request.json();
  const googleService = new GoogleService(session.user.id);

  try {
    const tasklist = await googleService.createTaskList(tasklistData);
    return Response.json(tasklist);
  } catch (error: unknown) {
    console.error("Google Tasks API error:", error);

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

      if (errorResponse.error === "bad_request") {
        return Response.json(
          {
            success: false,
            error: errorResponse.error,
            message: errorResponse.message,
          },
          { status: 400 },
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
