import { auth } from "@/app/(auth)/auth";
import { hasOAuthConnection } from "@/lib/db/queries";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ connected: false });
  }

  const connected = await hasOAuthConnection(session.user.id, "spotify");
  return Response.json({ connected });
}
