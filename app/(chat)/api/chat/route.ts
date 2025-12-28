import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
  type UIMessagePart,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModelId } from "@/lib/ai/models.config";
import { modelsWithoutToolSupport } from "@/lib/ai/models.config";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { discoverSkills } from "@/lib/ai/skills";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import {
  gmailLabels,
  gmailMessages,
  googleCalendars,
  googleEvents,
  googleTaskLists,
  googleTasks,
} from "@/lib/ai/tools/google";
import {
  type GoogleToolGroupId,
  getGoogleToolNamesForGroups,
} from "@/lib/ai/tools/google/groups";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchPastConversations } from "@/lib/ai/tools/search-history";
import {
  spotifyAlbums,
  spotifyArtists,
  spotifyPlayback,
  spotifyPlaylists,
  spotifyQueue,
  spotifySearch,
  spotifyTracks,
  spotifyUser,
} from "@/lib/ai/tools/spotify";
import {
  getSpotifyToolNamesForGroups,
  type SpotifyToolGroupId,
} from "@/lib/ai/tools/spotify/groups";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { getSkillResource, useSkill } from "@/lib/ai/tools/use-skill";
import { webFetch } from "@/lib/ai/tools/web-fetch";
import {
  type AttachmentPart,
  processAttachmentsForLLM,
} from "@/lib/attachments";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
  updateChatTitleById,
  updateChatUpdatedAtById,
  updateMessageById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage, ChatTools, CustomUIDataTypes } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import {
  indexMessageSync,
  isAsyncIndexingEnabled,
  queueMessageForIndexing,
} from "@/lib/workers/message-indexer";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err,
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 }, // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL",
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    console.error("DEBUG: Schema validation failed:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      webSearchEnabled,
      spotifyToolGroups,
      googleToolGroups,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModelId;
      selectedVisibilityType: VisibilityType;
      webSearchEnabled: boolean;
      spotifyToolGroups: SpotifyToolGroupId[];
      googleToolGroups: GoogleToolGroupId[];
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let isNewChat = false;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      // Only fetch messages if chat already exists
      messagesFromDb = await getMessagesByChatId({ id });
    } else {
      isNewChat = true;
      // Create chat immediately with temporary title to avoid blocking
      // Title will be generated asynchronously after streaming starts
      await saveChat({
        id,
        userId: session.user.id,
        title: "New Chat",
        visibility: selectedVisibilityType,
      });
      // New chat - no need to fetch messages, it's empty
    }

    // Process attachments in the message before sending to LLM, preserving order
    // This converts text files to text content and handles document types
    const processedParts = await Promise.all(
      message.parts.map(async (part) => {
        if (part.type === "file" && "url" in part && "mediaType" in part) {
          const processed = await processAttachmentsForLLM([
            part as AttachmentPart,
          ]);
          return processed[0];
        }
        return part;
      }),
    );

    // Create a new message with processed parts
    const processedMessage = {
      ...message,
      parts: processedParts,
    };

    const uiMessages = [
      ...convertToUIMessages(messagesFromDb),
      processedMessage,
    ];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
      chatId: id,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    // Index user message for vector search (sync by default, async with worker if VECTOR_INDEX_MODE=async)
    if (process.env.QDRANT_URL) {
      const indexJob = {
        messageId: message.id,
        chatId: id,
        userId: session.user.id,
        role: "user" as const,
        parts: message.parts,
      };
      if (isAsyncIndexingEnabled()) {
        queueMessageForIndexing(indexJob).catch((err) =>
          console.warn("Vector indexing queue failed:", err),
        );
      } else {
        indexMessageSync(indexJob).catch((err) =>
          console.warn("Vector indexing failed:", err),
        );
      }
    }

    // Update the chat's updatedAt timestamp
    await updateChatUpdatedAtById({ chatId: id });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    // Discover available skills (Level 1 - metadata only)
    const availableSkills = await discoverSkills();

    let finalMergedUsage: AppUsage | undefined;

    // Track streaming content for progressive database saves
    // Variables outside execute function are needed for:
    // - assistantMessageId, firstAssistantMessageGenerated: accessed by generateId function
    // - currentTextContent, currentReasoningContent, lastSaveTime, messageSaved, finalSaveCompleted:
    //   accessed by saveAssistantMessage (called from onChunk, onFinish, and after() hook)
    const assistantMessageId = generateUUID();
    let firstAssistantMessageGenerated = false;
    let currentTextContent = "";
    let currentReasoningContent = "";
    let lastSaveTime = Date.now();
    let messageSaved = false;
    let finalSaveCompleted = false; // Prevents duplicate saves from onFinish and after()
    const SAVE_INTERVAL_MS = 3000; // Save every 3 seconds during streaming

    // Function to save/update the assistant message
    const saveAssistantMessage = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastSaveTime < SAVE_INTERVAL_MS) {
        return;
      }

      // Build parts array from accumulated content with proper typing
      const parts: UIMessagePart<CustomUIDataTypes, ChatTools>[] = [];
      if (currentTextContent) {
        parts.push({ type: "text", text: currentTextContent });
      }
      if (currentReasoningContent) {
        parts.push({
          type: "reasoning",
          text: currentReasoningContent,
        });
      }

      if (parts.length === 0) {
        return; // Nothing to save yet
      }

      try {
        if (!messageSaved) {
          // First time - create the message
          await saveMessages({
            messages: [
              {
                id: assistantMessageId,
                chatId: id,
                role: "assistant",
                parts,
                attachments: [],
                createdAt: new Date(),
              },
            ],
          });
          // Update the chat's updatedAt timestamp
          await updateChatUpdatedAtById({ chatId: id });
          messageSaved = true;
        } else {
          // Update existing message
          // Note: We don't update the chat's updatedAt here because this is just
          // a progressive update during streaming. The chat timestamp was already
          // updated when the message was first created.
          await updateMessageById({
            id: assistantMessageId,
            parts,
          });
        }
        lastSaveTime = now;
      } catch (err) {
        console.warn(
          `Failed to ${messageSaved ? "update" : "create"} assistant message ${assistantMessageId}:`,
          err,
        );
      }
    };

    // Use after() to ensure final save happens even on timeout
    after(async () => {
      if (
        !finalSaveCompleted &&
        (currentTextContent || currentReasoningContent)
      ) {
        await saveAssistantMessage(true);
      }
    });

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        let titleGenerationPromise: Promise<void> | undefined;
        // Notify client immediately that a new chat was created
        // so the sidebar can be updated optimistically
        if (isNewChat) {
          dataStream.write({
            type: "data-chat-created",
            data: { id, title: "New Chat" },
          });

          titleGenerationPromise = (async () => {
            try {
              const title = await generateTitleFromUserMessage({ message });
              await updateChatTitleById({ chatId: id, title });
              dataStream.write({
                type: "data-chat-title-updated",
                data: { id, title },
              });
            } catch (err) {
              console.warn("Failed to generate/update chat title:", err);
            }
          })();
        }

        // Always define all tools (including skill tools)
        // Skills are discovered at runtime, tools are always available
        const baseTools = {
          getWeather,
          createDocument: createDocument({ session, dataStream }),
          updateDocument: updateDocument({ session, dataStream }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
          }),
          // biome-ignore lint/correctness/useHookAtTopLevel: useSkill is not a React hook, it's a tool function
          useSkill: useSkill({ availableSkills }),
          getSkillResource: getSkillResource({ availableSkills }),
          webFetch,
          // Add semantic search tool for chat history (only when QDRANT_URL is configured)
          ...(process.env.QDRANT_URL
            ? {
                searchPastConversations: searchPastConversations({
                  userId: session.user.id,
                }),
              }
            : {}),
        };

        const spotifyTools = {
          spotifyAlbums: spotifyAlbums({ userId: session.user.id }),
          spotifyArtists: spotifyArtists({ userId: session.user.id }),
          spotifyPlayback: spotifyPlayback({ userId: session.user.id }),
          spotifyQueue: spotifyQueue({ userId: session.user.id }),
          spotifyPlaylists: spotifyPlaylists({ userId: session.user.id }),
          spotifySearch: spotifySearch({ userId: session.user.id }),
          spotifyTracks: spotifyTracks({ userId: session.user.id }),
          spotifyUser: spotifyUser({ userId: session.user.id }),
        };

        const googleTools = {
          googleCalendars: googleCalendars({ userId: session.user.id }),
          googleEvents: googleEvents({ userId: session.user.id }),
          gmailMessages: gmailMessages({ userId: session.user.id }),
          gmailLabels: gmailLabels({ userId: session.user.id }),
          googleTaskLists: googleTaskLists({ userId: session.user.id }),
          googleTasks: googleTasks({ userId: session.user.id }),
        };

        const selectedSpotifyToolNames = getSpotifyToolNamesForGroups(
          spotifyToolGroups,
        ) as (keyof typeof spotifyTools)[];

        const selectedSpotifyTools: Partial<typeof spotifyTools> = {};
        for (const toolName of selectedSpotifyToolNames) {
          const tool = spotifyTools[toolName];
          if (tool) {
            (selectedSpotifyTools[toolName] as any) = tool;
          }
        }

        const selectedGoogleToolNames = getGoogleToolNamesForGroups(
          googleToolGroups,
        ) as (keyof typeof googleTools)[];

        const selectedGoogleTools: Partial<typeof googleTools> = {};
        for (const toolName of selectedGoogleToolNames) {
          const tool = googleTools[toolName];
          if (tool) {
            (selectedGoogleTools[toolName] as any) = tool;
          }
        }

        const tools = {
          ...baseTools,
          ...selectedSpotifyTools,
          ...selectedGoogleTools,
        };

        // Determine which tools to activate
        type ToolName = keyof typeof tools;
        let activeTools: ToolName[] | undefined;

        const baseActiveTools: ToolName[] = [
          "getWeather",
          "createDocument",
          "updateDocument",
          "requestSuggestions",
          "webFetch",
          // Add search tool to active tools when configured
          ...(process.env.QDRANT_URL
            ? (["searchPastConversations"] as ToolName[])
            : []),
        ];

        const skillActiveTools: ToolName[] =
          availableSkills.length > 0
            ? (["useSkill", "getSkillResource"] as ToolName[])
            : [];

        const spotifyActiveTools = selectedSpotifyToolNames
          .filter((toolName) => toolName in selectedSpotifyTools)
          .map((toolName) => toolName as ToolName);

        const googleActiveTools = selectedGoogleToolNames
          .filter((toolName) => toolName in selectedGoogleTools)
          .map((toolName) => toolName as ToolName);

        if (modelsWithoutToolSupport.includes(selectedChatModel)) {
          activeTools = [];
        } else {
          activeTools = [
            ...baseActiveTools,
            ...skillActiveTools,
            ...spotifyActiveTools,
            ...googleActiveTools,
          ];
        }

        const result = streamText({
          model: getLanguageModel(selectedChatModel, webSearchEnabled),
          system: systemPrompt({
            requestHints,
            skills: availableSkills,
            spotifyGroups: spotifyToolGroups,
            googleGroups: googleToolGroups,
          }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools: activeTools,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools,
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onChunk: async ({ chunk }) => {
            // Accumulate content and periodically save
            if (chunk.type === "text-delta") {
              currentTextContent += chunk.text;
            } else if (chunk.type === "reasoning-delta") {
              currentReasoningContent += chunk.text;
            }

            // Only call save if enough time has passed since last save
            const now = Date.now();
            if (now - lastSaveTime >= SAVE_INTERVAL_MS) {
              await saveAssistantMessage();
            }
          },
          onFinish: async ({ usage, response }) => {
            // Final save to ensure all content is persisted
            await saveAssistantMessage(true);
            finalSaveCompleted = true; // Prevent duplicate save in after() hook

            // Index assistant message for vector search (sync by default, async with worker if VECTOR_INDEX_MODE=async)
            if (process.env.QDRANT_URL && currentTextContent) {
              const parts: UIMessagePart<CustomUIDataTypes, ChatTools>[] = [];
              if (currentTextContent) {
                parts.push({ type: "text", text: currentTextContent });
              }
              const indexJob = {
                messageId: assistantMessageId,
                chatId: id,
                userId: session.user.id,
                role: "assistant" as const,
                parts,
              };
              if (isAsyncIndexingEnabled()) {
                queueMessageForIndexing(indexJob).catch((err) =>
                  console.warn("Vector indexing queue failed:", err),
                );
              } else {
                indexMessageSync(indexJob).catch((err) =>
                  console.warn("Vector indexing failed:", err),
                );
              }
            }

            // Debug: log sources from OpenRouter
            if (response?.messages) {
              for (const msg of response.messages) {
                const content = msg.content as
                  | Array<{ type: string }>
                  | undefined;
                if (content) {
                  const sources = content.filter((c) => c.type === "source");
                  if (sources.length > 0) {
                    console.log(
                      "[WebSearch Debug] Response message sources:",
                      JSON.stringify(sources, null, 2),
                    );
                  }
                }
              }
            }
            try {
              const providers = await getTokenlensCatalog();
              const model = getLanguageModel(
                selectedChatModel,
                webSearchEnabled,
              );
              const modelId = model.modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
            sendSources: true,
          }),
        );

        if (titleGenerationPromise) await titleGenerationPromise;
      },
      generateId: () => {
        // Use our pre-generated ID for the first assistant message only
        // Other messages (tool calls, etc.) get new IDs
        if (!firstAssistantMessageGenerated) {
          firstAssistantMessageGenerated = true;
          return assistantMessageId;
        }
        return generateUUID();
      },
      onFinish: async ({ messages }) => {
        // Filter out the assistant message we're already saving progressively
        // and only save other messages (like tool results, etc.)
        const messagesToSave = messages.filter(
          (msg) => !(msg.role === "assistant" && msg.id === assistantMessageId),
        );

        if (messagesToSave.length > 0) {
          await saveMessages({
            messages: messagesToSave.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            })),
          });
          // Update the chat's updatedAt timestamp
          await updateChatUpdatedAtById({ chatId: id });
        }

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new ChatSDKError("bad_request:api", "Chat not found").toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  try {
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return new ChatSDKError(
        "bad_request:api",
        "Invalid title provided",
      ).toResponse();
    }

    await updateChatTitleById({ chatId: id, title: title.trim() });

    return Response.json(
      { success: true, title: title.trim() },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating chat title:", error);

    // Check if it's a JSON parsing error or database error
    if (error instanceof SyntaxError) {
      return new ChatSDKError(
        "bad_request:api",
        "Invalid request body",
      ).toResponse();
    }

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError(
      "offline:chat",
      "Failed to update chat title",
    ).toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
