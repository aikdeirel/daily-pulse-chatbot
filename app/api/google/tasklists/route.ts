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

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tasklistData = await request.json();
  const googleService = new GoogleService(session.user.id);

  try {
    const tasklist = await googleService.createTaskList(tasklistData);
    return Response.json(tasklist);
  } catch (error) {
    console.error("Google Tasks API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 },
    );
  }
}
