import { auth } from "@/app/(auth)/auth";
import { GoogleService } from "@/lib/services/google";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tasklistId: string; taskId: string }> },
) {
  const session = await auth();
  const { tasklistId, taskId } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const googleService = new GoogleService(session.user.id);

  try {
    const task = await googleService.getTask(tasklistId, taskId);
    return Response.json(task);
  } catch (error) {
    console.error("Google Tasks API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tasklistId: string; taskId: string }> },
) {
  const session = await auth();
  const { tasklistId, taskId } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const taskData = await request.json();
  const googleService = new GoogleService(session.user.id);

  try {
    const task = await googleService.updateTask(tasklistId, taskId, taskData);
    return Response.json(task);
  } catch (error) {
    console.error("Google Tasks API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tasklistId: string; taskId: string }> },
) {
  const session = await auth();
  const { tasklistId, taskId } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const googleService = new GoogleService(session.user.id);

  try {
    await googleService.deleteTask(tasklistId, taskId);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Google Tasks API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 },
    );
  }
}
