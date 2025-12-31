import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { getKnowledgeBaseEntries } from "@/lib/db/queries";
import { KnowledgeBasePage } from "./knowledge-base-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <KnowledgeBaseWrapper />
    </Suspense>
  );
}

async function KnowledgeBaseWrapper() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const entries = await getKnowledgeBaseEntries(session.user.id);

  return <KnowledgeBasePage initialEntries={entries} />;
}
