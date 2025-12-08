import { auth } from "@/app/(auth)/auth";
import { GoogleService } from "@/lib/services/google";

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tasklistId = searchParams.get("tasklistId");
  if (!tasklistId) {
    return new Response("tasklistId is required", { status: 400 });
  }

  const googleService = new GoogleService(session.user.id);

  try {
    const showCompleted = searchParams.get("showCompleted");
    const tasks = await googleService.listTasks(tasklistId, {
      showCompleted: showCompleted ? showCompleted === "true" : undefined,
      maxResults: searchParams.get("maxResults")
        ? Number(searchParams.get("maxResults"))
        : undefined,
      dueMin: searchParams.get("dueMin") || undefined,
      dueMax: searchParams.get("dueMax") || undefined,
    });

    return Response.json(tasks);
  } catch (error) {
    console.error("Google Tasks API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tasklistId = searchParams.get("tasklistId");
  if (!tasklistId) {
    return new Response("tasklistId is required", { status: 400 });
  }

  const taskData = await request.json();
  const googleService = new GoogleService(session.user.id);

  try {
    const task = await googleService.createTask(tasklistId, taskData);
    return Response.json(task);
  } catch (error) {
    console.error("Google Tasks API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 },
    );
  }
}
