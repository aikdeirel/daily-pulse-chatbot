"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useLocalStorage } from "usehooks-ts";
import { ChatHeader } from "@/components/chat-header";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import {
  SPOTIFY_TOOL_GROUP_STORAGE_KEY,
  type SpotifyToolGroupId,
} from "@/lib/ai/tools/spotify/groups";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const revalidateSidebarHistory = useCallback(() => {
    return mutate(
      (key) => typeof key === "string" && key.startsWith("$inf$/api/history"),
      undefined,
      { revalidate: true },
    );
  }, [mutate]);

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [spotifyToolGroups, setSpotifyToolGroups] = useLocalStorage<
    SpotifyToolGroupId[]
  >(SPOTIFY_TOOL_GROUP_STORAGE_KEY, []);
  const currentModelIdRef = useRef(currentModelId);
  const webSearchEnabledRef = useRef(webSearchEnabled);
  const spotifyToolGroupsRef = useRef<SpotifyToolGroupId[]>(spotifyToolGroups);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  useEffect(() => {
    webSearchEnabledRef.current = webSearchEnabled;
  }, [webSearchEnabled]);

  useEffect(() => {
    spotifyToolGroupsRef.current = spotifyToolGroups;
  }, [spotifyToolGroups]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibilityType,
            webSearchEnabled: webSearchEnabledRef.current,
            spotifyToolGroups: spotifyToolGroupsRef.current,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data);
      }

      const eventType = (dataPart as { type?: string }).type;

      if (eventType === "data-chat-created") {
        // Immediate refresh to show "New Chat" in sidebar
        revalidateSidebarHistory();
        // Delayed refresh to catch the generated title (title gen takes ~2-3 sec)
        setTimeout(revalidateSidebarHistory, 4000);
      }

      if (eventType === "data-chat-title-updated") {
        revalidateSidebarHistory();
      }
    },
    onFinish: () => {
      revalidateSidebarHistory();
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: "error",
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Compute web search status for header indicator
  const webSearchStatus = useMemo(() => {
    if (status !== "streaming") {
      return { isSearching: false, sourceCount: 0 };
    }
    // Find the last assistant message
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistantMessage) {
      return { isSearching: false, sourceCount: 0 };
    }
    // Count sources in the message
    const sourceCount = (lastAssistantMessage.parts as unknown[]).filter(
      (part) => (part as Record<string, unknown>).type === "source-url",
    ).length;
    // If we have sources during streaming, web search is active
    return {
      isSearching: sourceCount > 0,
      sourceCount,
    };
  }, [messages, status]);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="overscroll-behavior-contain keyboard-aware-container min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
          selectedVisibilityType={initialVisibilityType}
          isWebSearching={webSearchStatus.isSearching}
          webSearchSourceCount={webSearchStatus.sourceCount}
        />

        <Messages
          chatId={id}
          isArtifactVisible={isArtifactVisible}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={initialChatModel}
          setMessages={setMessages}
          status={status}
          votes={votes}
        />

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-4 pb-4 md:px-6 md:pb-6 mobile-keyboard-safe">
          {!isReadonly && (
            <MultimodalInput
              attachments={attachments}
              chatId={id}
              input={input}
              messages={messages}
              onModelChange={setCurrentModelId}
              selectedModelId={currentModelId}
              selectedVisibilityType={visibilityType}
              sendMessage={sendMessage}
              setAttachments={setAttachments}
              setInput={setInput}
              setMessages={setMessages}
              spotifyToolGroups={spotifyToolGroups}
              onSpotifyToolGroupsChange={setSpotifyToolGroups}
              status={status}
              stop={stop}
              usage={usage}
              webSearchEnabled={webSearchEnabled}
              onWebSearchToggle={setWebSearchEnabled}
            />
          )}
        </div>
      </div>

      <Artifact
        attachments={attachments}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        status={status}
        stop={stop}
        votes={votes}
        webSearchEnabled={webSearchEnabled}
        onWebSearchToggle={setWebSearchEnabled}
        spotifyToolGroups={spotifyToolGroups}
        onSpotifyToolGroupsChange={setSpotifyToolGroups}
      />
    </>
  );
}
