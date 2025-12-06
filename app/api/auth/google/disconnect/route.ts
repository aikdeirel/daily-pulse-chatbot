import { auth } from "@/app/(auth)/auth";
import { deleteOAuthConnection } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await deleteOAuthConnection(session.user.id, "google");
    return Response.json({ success: true });
  } catch (_error) {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
