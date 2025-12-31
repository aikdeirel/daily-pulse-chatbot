import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  createKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  getKnowledgeBaseEntries,
  getKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const entries = await getKnowledgeBaseEntries(session.user.id);
  return Response.json(entries);
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { content } = await request.json();

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return new ChatSDKError(
        "bad_request:api",
        "Content is required",
      ).toResponse();
    }

    const entry = await createKnowledgeBaseEntry({
      userId: session.user.id,
      content: content.trim(),
    });

    return Response.json(entry, { status: 201 });
  } catch (_error) {
    return new ChatSDKError(
      "bad_request:api",
      "Invalid request body",
    ).toResponse();
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required",
    ).toResponse();
  }

  try {
    const { content } = await request.json();

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return new ChatSDKError(
        "bad_request:api",
        "Content is required",
      ).toResponse();
    }

    const existingEntry = await getKnowledgeBaseEntry(id, session.user.id);

    if (!existingEntry) {
      return new ChatSDKError("not_found:document").toResponse();
    }

    const entry = await updateKnowledgeBaseEntry({
      id,
      userId: session.user.id,
      content: content.trim(),
    });

    return Response.json(entry);
  } catch (_error) {
    return new ChatSDKError(
      "bad_request:api",
      "Invalid request body",
    ).toResponse();
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required",
    ).toResponse();
  }

  const existingEntry = await getKnowledgeBaseEntry(id, session.user.id);

  if (!existingEntry) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  const deleted = await deleteKnowledgeBaseEntry(id, session.user.id);

  if (!deleted) {
    return new ChatSDKError(
      "bad_request:api",
      "Failed to delete entry",
    ).toResponse();
  }

  return Response.json({ success: true });
}
