import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";

export const maxDuration = 60;

// The request body schema for voice transcription
interface VoiceTranscriptionRequest {
  audio: string; // Base64 encoded audio
  format: string; // Audio format (webm, mp4, ogg, wav)
  systemPrompt?: string; // Optional system instructions
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const body: VoiceTranscriptionRequest = await request.json();
    const { audio, format, systemPrompt } = body;

    if (!audio || !format) {
      return new ChatSDKError(
        "bad_request:api",
        "Missing audio data or format",
      ).toResponse();
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not configured");
      return new ChatSDKError(
        "offline:chat",
        "API key not configured",
      ).toResponse();
    }

    // Construct the multimodal message for Gemini 3 Flash
    const messages = [
      {
        role: "user",
        content: [
          // System instruction as text (optional)
          ...(systemPrompt
            ? [
                {
                  type: "text",
                  text: systemPrompt,
                },
              ]
            : [
                {
                  type: "text",
                  text: "Please transcribe the following audio and respond to what the user is saying. If the audio contains a question or request, answer it helpfully.",
                },
              ]),
          // Audio input
          {
            type: "input_audio",
            input_audio: {
              data: audio,
              format: format,
            },
          },
        ],
      },
    ];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": request.headers.get("origin") || "",
          "X-Title": "Daily Pulse Chatbot",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          max_tokens: 2048,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return new ChatSDKError(
        "offline:chat",
        `API error: ${response.status}`,
      ).toResponse();
    }

    const data = await response.json();

    // Extract the text response
    const textResponse =
      data.choices?.[0]?.message?.content || "No response generated";

    return Response.json({
      success: true,
      text: textResponse,
      usage: data.usage,
    });
  } catch (error) {
    console.error("Voice transcription error:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError(
      "offline:chat",
      "Failed to process voice input",
    ).toResponse();
  }
}
