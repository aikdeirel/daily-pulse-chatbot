"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import type { AnchorHTMLAttributes } from "react";
import { memo, useMemo, useState } from "react";
import { useThinkingPhrase } from "@/hooks/use-thinking-phrase";
import type { Vote } from "@/lib/db/schema";
import {
  getBasicToolDefaultOpen,
  getBasicToolDisplay,
  isBasicTool,
} from "@/lib/tools/basic/ui-config";
import {
  getGoogleToolDisplay,
  isGoogleTool,
} from "@/lib/tools/google/ui-config";
import {
  getSpotifyToolDisplay,
  isSpotifyTool,
} from "@/lib/tools/spotify/ui-config";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import {
  SkillOutput,
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./elements/tool";
import {
  type OpenRouterSourcePart,
  WebSearch,
  WebSearchContent,
  WebSearchHeader,
  WebSearchSources,
} from "./elements/web-search";
import { GoogleCalendarDisplay } from "./google-calendar-display";
import { BotIcon, UserIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { SpotifyPlayer } from "./spotify-player";
import { Timer } from "./timer";
import { Weather } from "./weather";

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  threadName,
  isTitleGenerating,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  threadName?: string;
  isTitleGenerating?: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  // Custom components for user messages to override Streamdown defaults
  // Only override `a` for links - inline code is handled via CSS
  const userMessageComponents = useMemo(
    () => ({
      // Custom link component with white color for user messages
      a: ({
        className,
        children,
        ...props
      }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a
          className={cn(
            "wrap-anywhere font-medium underline text-white",
            className,
          )}
          {...props}
        >
          {children}
        </a>
      ),
    }),
    [],
  );

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file",
  );

  // Filter for web search sources from Vercel AI SDK
  // The SDK transforms OpenRouter sources to { type: "source-url", url, title, ... }
  const sourcesFromMessage = (message.parts as unknown[]).filter(
    (part): part is OpenRouterSourcePart => {
      const p = part as Record<string, unknown>;
      return p.type === "source-url";
    },
  );

  useDataStream();

  return (
    <div
      className="group/message fade-in w-full max-w-full animate-in duration-200"
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      {/* Assistant message layout: header row + full-width content */}
      {message.role === "assistant" && (
        <div className="flex w-full flex-col gap-2">
          {/* Header row: icon + thread name */}
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center overflow-visible rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-600 ring-1 ring-orange-500/30 dark:from-orange-500/30 dark:to-amber-500/30 dark:text-orange-400 dark:ring-orange-500/40",
                {
                  "animate-pulse": isLoading,
                },
              )}
            >
              <div className={isLoading ? "animate-pulse" : ""}>
                <BotIcon />
              </div>
            </div>
            {/* Show skeleton while title is generating, actual title otherwise */}
            {isTitleGenerating ? (
              <div
                className="flex items-center gap-2"
                data-testid="message-title-generating"
              >
                <div
                  className="h-4 w-32 animate-pulse rounded-md bg-orange-500/20 dark:bg-orange-500/30"
                  aria-hidden="true"
                />
                <span
                  className="text-xs text-orange-500/60 dark:text-orange-400/60 animate-pulse"
                  aria-hidden="true"
                ></span>
                <output aria-live="polite" className="sr-only">
                  Generating chat title
                </output>
              </div>
            ) : threadName ? (
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                {threadName}
              </span>
            ) : null}
          </div>
          {/* Content row: full width */}
          <div
            className={cn("flex flex-col w-full", {
              "gap-3 md:gap-4": message.parts?.some(
                (p) => p.type === "text" && p.text?.trim(),
              ),
            })}
          >
            {attachmentsFromMessage.length > 0 && (
              <div
                className="flex flex-row justify-start gap-2"
                data-testid={"message-attachments"}
              >
                {attachmentsFromMessage.map((attachment) => (
                  <PreviewAttachment
                    attachment={{
                      name: attachment.filename ?? "file",
                      contentType: attachment.mediaType,
                      url: attachment.url,
                    }}
                    key={attachment.url}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              // Skip source-url parts - they're rendered in WebSearchSources
              const p = part as Record<string, unknown>;
              if (p.type === "source-url") {
                return null;
              }

              if (type === "reasoning" && part.text?.trim().length > 0) {
                return (
                  <MessageReasoning
                    isLoading={isLoading}
                    key={key}
                    reasoning={part.text}
                  />
                );
              }

              if (type === "text") {
                if (mode === "view") {
                  return (
                    <div className="w-full" key={key}>
                      <MessageContent
                        className="w-full bg-transparent px-0 py-0 text-left text-base leading-relaxed"
                        data-testid="message-content"
                      >
                        <Response>{sanitizeText(part.text)}</Response>
                      </MessageContent>
                    </div>
                  );
                }

                if (mode === "edit") {
                  return (
                    <div
                      className="flex w-full flex-row items-start gap-3"
                      key={key}
                    >
                      <div className="size-8" />
                      <div className="min-w-0 flex-1">
                        <MessageEditor
                          key={message.id}
                          message={message}
                          regenerate={regenerate}
                          setMessages={setMessages}
                          setMode={setMode}
                        />
                      </div>
                    </div>
                  );
                }
              }

              // Google Tools
              if (isGoogleTool(type)) {
                const googlePart = part as {
                  toolCallId: string;
                  state:
                    | "input-streaming"
                    | "input-available"
                    | "output-available"
                    | "output-error";
                  input?: { action?: string };
                  output?: Record<string, unknown>;
                };
                const { toolCallId, state } = googlePart;
                const action = googlePart.input?.action as string | undefined;

                // Get title and description from centralized config
                const { title, description } = getGoogleToolDisplay(
                  type,
                  action,
                );

                return (
                  <Tool defaultOpen={false} key={toolCallId}>
                    <ToolHeader
                      state={state}
                      type={type}
                      title={title}
                      description={description}
                    />
                    <ToolContent>
                      {state === "input-available" && (
                        <ToolInput input={googlePart.input} />
                      )}
                      {state === "output-available" && googlePart.output && (
                        <ToolOutput
                          errorText={
                            googlePart.output && "error" in googlePart.output
                              ? String(googlePart.output.error)
                              : undefined
                          }
                          output={
                            <GoogleCalendarDisplay
                              data={
                                googlePart.output as Parameters<
                                  typeof GoogleCalendarDisplay
                                >[0]["data"]
                              }
                            />
                          }
                        />
                      )}
                    </ToolContent>
                  </Tool>
                );
              }

              // Basic Tools (uses centralized config from lib/tools/basic/ui-config.ts)
              if (isBasicTool(type)) {
                const basicPart = part as {
                  toolCallId: string;
                  state:
                    | "input-streaming"
                    | "input-available"
                    | "output-available"
                    | "output-error";
                  input?: { action?: string };
                  output?: Record<string, unknown>;
                };
                const { toolCallId, state } = basicPart;
                const action = basicPart.input?.action as string | undefined;

                // Special handling for createDocument and updateDocument - they don't use Tool wrapper
                if (type === "tool-createDocument") {
                  if (basicPart.output && "error" in basicPart.output) {
                    return (
                      <div
                        className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                        key={toolCallId}
                      >
                        Error creating document:{" "}
                        {String(basicPart.output.error)}
                      </div>
                    );
                  }

                  return (
                    <DocumentPreview
                      isReadonly={isReadonly}
                      key={toolCallId}
                      result={basicPart.output}
                    />
                  );
                }

                if (type === "tool-updateDocument") {
                  if (basicPart.output && "error" in basicPart.output) {
                    return (
                      <div
                        className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                        key={toolCallId}
                      >
                        Error updating document:{" "}
                        {String(basicPart.output.error)}
                      </div>
                    );
                  }

                  return (
                    <div className="relative" key={toolCallId}>
                      <DocumentPreview
                        args={{ ...basicPart.output, isUpdate: true }}
                        isReadonly={isReadonly}
                        result={basicPart.output}
                      />
                    </div>
                  );
                }

                // Get title, description and defaultOpen from centralized config
                const { title, description } = getBasicToolDisplay(
                  type,
                  action,
                );
                const defaultOpen = getBasicToolDefaultOpen(type);

                return (
                  <Tool defaultOpen={defaultOpen} key={toolCallId}>
                    <ToolHeader
                      state={state}
                      type={type}
                      title={title}
                      description={description}
                    />
                    <ToolContent>
                      {state === "input-available" && (
                        <ToolInput input={basicPart.input} />
                      )}
                      {state === "output-available" && (
                        <ToolOutput
                          errorText={
                            basicPart.output && "error" in basicPart.output
                              ? String(basicPart.output.error)
                              : type === "tool-webFetch" &&
                                  basicPart.output &&
                                  basicPart.output.success === false
                                ? String(
                                    basicPart.output.error || "Request failed",
                                  )
                                : undefined
                          }
                          output={(() => {
                            switch (type) {
                              case "tool-getWeather":
                                return (
                                  <Weather
                                    weatherAtLocation={basicPart.output as any}
                                  />
                                );
                              case "tool-setTimer":
                                return (
                                  <Timer timerData={basicPart.output as any} />
                                );
                              case "tool-requestSuggestions":
                                return basicPart.output &&
                                  "error" in basicPart.output ? (
                                  <div className="rounded border p-2 text-red-500">
                                    Error: {String(basicPart.output.error)}
                                  </div>
                                ) : (
                                  <DocumentToolResult
                                    isReadonly={isReadonly}
                                    result={basicPart.output as any}
                                    type="request-suggestions"
                                  />
                                );
                              case "tool-webFetch":
                                return basicPart.output?.success ? (
                                  <div className="p-3 max-w-full overflow-hidden">
                                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                                        ✓ Success
                                      </span>
                                      <span className="truncate min-w-0">
                                        {String(basicPart.output.url)}
                                      </span>
                                    </div>
                                    <pre className="max-h-48 max-w-full overflow-auto rounded bg-muted/50 p-2 text-xs whitespace-pre-wrap break-words">
                                      {typeof basicPart.output.data === "object"
                                        ? JSON.stringify(
                                            basicPart.output.data,
                                            null,
                                            2,
                                          ).substring(0, 1000)
                                        : String(
                                            basicPart.output.data,
                                          ).substring(0, 1000)}
                                      {(typeof basicPart.output.data ===
                                      "object"
                                        ? JSON.stringify(basicPart.output.data)
                                            .length > 1000
                                        : String(basicPart.output.data).length >
                                          1000) && "\n..."}
                                    </pre>
                                  </div>
                                ) : null;
                              case "tool-useSkill":
                                return basicPart.output &&
                                  "error" in
                                    basicPart.output ? null : basicPart.output &&
                                  "instructions" in basicPart.output ? (
                                  <SkillOutput
                                    skillId={basicPart.output.skillId as string}
                                    skillName={basicPart.output.name as string}
                                    instructions={
                                      basicPart.output.instructions as string
                                    }
                                  />
                                ) : (
                                  <pre className="p-3 text-xs max-w-full overflow-auto whitespace-pre-wrap break-words">
                                    {JSON.stringify(basicPart.output, null, 2)}
                                  </pre>
                                );
                              case "tool-getSkillResource":
                                return (
                                  <pre className="max-h-48 max-w-full overflow-auto p-3 text-xs whitespace-pre-wrap break-words">
                                    {(
                                      basicPart.output?.content as string
                                    ).substring(0, 500)}
                                    {(basicPart.output?.content as string)
                                      .length > 500
                                      ? "..."
                                      : ""}
                                  </pre>
                                );
                              default:
                                return (
                                  <pre className="p-3 text-xs max-w-full overflow-auto whitespace-pre-wrap break-words">
                                    {JSON.stringify(basicPart.output, null, 2)}
                                  </pre>
                                );
                            }
                          })()}
                        />
                      )}
                    </ToolContent>
                  </Tool>
                );
              }

              // Spotify Tools (uses centralized config from lib/tools/spotify/ui-config.ts)
              if (isSpotifyTool(type)) {
                // Type assertion needed because TypeScript can't narrow with type guard in JSX context
                const spotifyPart = part as {
                  toolCallId: string;
                  state:
                    | "input-streaming"
                    | "input-available"
                    | "output-available"
                    | "output-error";
                  input?: { action?: string };
                  output?: Record<string, unknown>;
                };
                const { toolCallId, state } = spotifyPart;
                const action = spotifyPart.input?.action as string | undefined;

                // Get title and description from centralized config
                const { title, description } = getSpotifyToolDisplay(
                  type,
                  action,
                );

                return (
                  <Tool defaultOpen={false} key={toolCallId}>
                    <ToolHeader
                      state={state}
                      type={type}
                      title={title}
                      description={description}
                    />
                    <ToolContent>
                      {state === "input-available" && (
                        <ToolInput input={spotifyPart.input} />
                      )}
                      {state === "output-available" && spotifyPart.output && (
                        <ToolOutput
                          errorText={undefined}
                          output={
                            <SpotifyPlayer
                              data={
                                spotifyPart.output as Parameters<
                                  typeof SpotifyPlayer
                                >[0]["data"]
                              }
                            />
                          }
                        />
                      )}
                    </ToolContent>
                  </Tool>
                );
              }

              return null;
            })}

            {/* Web Search Sources - full panel shown only after completion */}
            {sourcesFromMessage.length > 0 && !isLoading && (
              <WebSearch defaultOpen={false}>
                <WebSearchHeader
                  isSearching={false}
                  sourceCount={sourcesFromMessage.length}
                />
                <WebSearchContent>
                  <WebSearchSources sources={sourcesFromMessage} />
                </WebSearchContent>
              </WebSearch>
            )}

            {!isReadonly && (
              <MessageActions
                chatId={chatId}
                isLoading={isLoading}
                key={`action-${message.id}`}
                message={message}
                setMode={setMode}
                vote={vote}
              />
            )}
          </div>
        </div>
      )}

      {/* User message layout: icon + content side by side */}
      {message.role === "user" && (
        <div className="flex w-full max-w-full items-start gap-3 md:gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 text-amber-700 ring-1 ring-amber-600/30 dark:from-amber-500/30 dark:to-orange-500/30 dark:text-amber-400 dark:ring-amber-500/40">
            <span className="text-base font-semibold">
              <UserIcon />
            </span>
          </div>
          <div
            className={cn("flex flex-col min-w-0 flex-1", {
              "gap-3 md:gap-4": message.parts?.some(
                (p) => p.type === "text" && p.text?.trim(),
              ),
              "w-full max-w-full": true,
            })}
          >
            {attachmentsFromMessage.length > 0 && (
              <div
                className="flex flex-row justify-start gap-2"
                data-testid={"message-attachments"}
              >
                {attachmentsFromMessage.map((attachment) => (
                  <PreviewAttachment
                    attachment={{
                      name: attachment.filename ?? "file",
                      contentType: attachment.mediaType,
                      url: attachment.url,
                    }}
                    key={attachment.url}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === "text") {
                if (mode === "view") {
                  return (
                    <div key={key}>
                      <MessageContent
                        className="w-fit break-words rounded-2xl px-5 py-3 text-left text-white shadow-lg shadow-orange-500/20 dark:shadow-orange-500/15"
                        data-testid="message-content"
                        style={{
                          background:
                            "linear-gradient(135deg, hsl(25 85% 50%) 0%, hsl(30 90% 45%) 50%, hsl(20 80% 40%) 100%)",
                        }}
                      >
                        <Response components={userMessageComponents}>
                          {sanitizeText(part.text)}
                        </Response>
                      </MessageContent>
                    </div>
                  );
                }

                if (mode === "edit") {
                  return (
                    <div
                      className="flex w-full flex-row items-start gap-3"
                      key={key}
                    >
                      <div className="size-8" />
                      <div className="min-w-0 flex-1">
                        <MessageEditor
                          key={message.id}
                          message={message}
                          regenerate={regenerate}
                          setMessages={setMessages}
                          setMode={setMode}
                        />
                      </div>
                    </div>
                  );
                }
              }

              return null;
            })}

            {!isReadonly && (
              <MessageActions
                chatId={chatId}
                isLoading={isLoading}
                key={`action-${message.id}`}
                message={message}
                setMode={setMode}
                vote={vote}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.message.id !== nextProps.message.id) {
      return false;
    }
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) {
      return false;
    }
    if (!equal(prevProps.message.parts, nextProps.message.parts)) {
      return false;
    }
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.threadName !== nextProps.threadName) {
      return false;
    }
    if (prevProps.isTitleGenerating !== nextProps.isTitleGenerating) {
      return false;
    }

    return false;
  },
);

export const ThinkingText = () => {
  const { phrase, isTransitioning } = useThinkingPhrase();

  return (
    <>
      <span
        className={cn(
          "bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text font-medium text-transparent transition-opacity duration-300 dark:from-orange-400 dark:to-amber-400",
          isTransitioning ? "opacity-0" : "opacity-100",
        )}
      >
        {phrase}
      </span>
      <span className="inline-flex text-orange-600 dark:text-orange-400">
        <span className="animate-bounce [animation-delay:0ms]">.</span>
        <span className="animate-bounce [animation-delay:150ms]">.</span>
        <span className="animate-bounce [animation-delay:300ms]">.</span>
      </span>
    </>
  );
};

export const ThinkingMessage = () => {
  return (
    <div
      className="group/message fade-in w-full animate-in duration-300"
      data-role="assistant"
      data-testid="message-assistant-loading"
    >
      <div className="flex items-start justify-start gap-3 md:gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center overflow-visible rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-600 ring-1 ring-orange-500/30 dark:from-orange-500/30 dark:to-amber-500/30 dark:text-orange-400 dark:ring-orange-500/40">
          <div className="animate-visible-pulse">
            <BotIcon />
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-2 p-0">
            <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 px-4 py-2.5 text-base dark:from-orange-500/25 dark:to-amber-500/25">
              <ThinkingText />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
