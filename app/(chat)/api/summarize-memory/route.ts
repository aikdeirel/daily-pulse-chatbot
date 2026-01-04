import { generateText } from "ai";
import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@/lib/ai/providers";
import { ChatSDKError } from "@/lib/errors";

const MEMORY_SUMMARY_PROMPT = `Create a summary for storing relevant information about the user, based on the current chat session.
CONSTRAINT: Be extremely concise and sacrifice grammar for the sake of concision. Use telegraphic style.
Focus on: user preferences, facts about user, decisions made, important context for future conversations.
Output only the summary, no preamble.
IMPORTANT: Focus on the USER's perspective, not the assistant's actions.
Do not add a date or time to the summary.`;

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { conversation } = await request.json();

    if (
      !conversation ||
      typeof conversation !== "string" ||
      conversation.trim().length === 0
    ) {
      return new ChatSDKError(
        "bad_request:api",
        "Conversation content is required",
      ).toResponse();
    }

    const { text: summary } = await generateText({
      model: myProvider.languageModel("memory-summary-model"),
      system: MEMORY_SUMMARY_PROMPT,
      prompt: conversation,
    });

    return Response.json({ summary: summary.trim() });
  } catch (error) {
    console.error("Failed to summarize memory:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to generate summary",
    ).toResponse();
  }
}
