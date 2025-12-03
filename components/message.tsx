"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import type { AnchorHTMLAttributes } from "react";
import { memo, useState, useMemo } from "react";
import { useThinkingPhrase } from "@/hooks/use-thinking-phrase";
import type { Vote } from "@/lib/db/schema";
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
import { BotIcon, UserIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { SpotifyPlayer } from "./spotify-player";
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
}: {
	chatId: string;
	message: ChatMessage;
	vote: Vote | undefined;
	isLoading: boolean;
	setMessages: UseChatHelpers<ChatMessage>["setMessages"];
	regenerate: UseChatHelpers<ChatMessage>["regenerate"];
	isReadonly: boolean;
	requiresScrollPadding: boolean;
}) => {
	const [mode, setMode] = useState<"view" | "edit">("view");

	// Custom components for user messages to override Streamdown defaults
	// Only override `a` for links - inline code is handled via CSS
	const userMessageComponents = useMemo(() => ({
		// Custom link component with white color for user messages
		a: ({ className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
			<a
				className={cn(
					"wrap-anywhere font-medium underline text-white",
					className
				)}
				{...props}
			>
				{children}
			</a>
		),
	}), []);

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
			<div
				className={cn("flex w-full max-w-full items-start gap-3 md:gap-4", {
					"justify-start": true,
				})}
			>
				{message.role === "assistant" && (
					<div className={cn("flex size-10 shrink-0 items-center justify-center overflow-visible rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-600 ring-1 ring-orange-500/30 dark:from-orange-500/30 dark:to-amber-500/30 dark:text-orange-400 dark:ring-orange-500/40", {
						"animate-pulse": isLoading,
					})}>
						<div className={isLoading ? "animate-pulse" : ""}>
							<BotIcon />
						</div>
					</div>
				)}

				{message.role === "user" && (
					<div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 text-amber-700 ring-1 ring-amber-600/30 dark:from-amber-500/30 dark:to-orange-500/30 dark:text-amber-400 dark:ring-amber-500/40">
						<span className="text-base font-semibold">
							<UserIcon />
						</span>
					</div>
				)}

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
									<div key={key}>
										<MessageContent
											className={cn({
												"w-fit break-words rounded-2xl px-5 py-3 text-left text-white shadow-lg shadow-orange-500/20 dark:shadow-orange-500/15":
													message.role === "user",
												"bg-transparent px-0 py-0 text-left text-base leading-relaxed":
													message.role === "assistant",
											})}
											data-testid="message-content"
											style={
												message.role === "user"
													? {
														background:
															"linear-gradient(135deg, hsl(25 85% 50%) 0%, hsl(30 90% 45%) 50%, hsl(20 80% 40%) 100%)",
													}
													: undefined
											}
										>
											<Response
												components={message.role === "user" ? userMessageComponents : undefined}
											>
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

						if (type === "tool-getWeather") {
							const { toolCallId, state } = part;

							return (
								<Tool defaultOpen={false} key={toolCallId}>
									<ToolHeader state={state} type="tool-getWeather" />
									<ToolContent>
										{state === "input-available" && (
											<ToolInput input={part.input} />
										)}
										{state === "output-available" && (
											<ToolOutput
												errorText={undefined}
												output={<Weather weatherAtLocation={part.output} />}
											/>
										)}
									</ToolContent>
								</Tool>
							);
						}

						if (type === "tool-createDocument") {
							const { toolCallId } = part;

							if (part.output && "error" in part.output) {
								return (
									<div
										className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
										key={toolCallId}
									>
										Error creating document: {String(part.output.error)}
									</div>
								);
							}

							return (
								<DocumentPreview
									isReadonly={isReadonly}
									key={toolCallId}
									result={part.output}
								/>
							);
						}

						if (type === "tool-updateDocument") {
							const { toolCallId } = part;

							if (part.output && "error" in part.output) {
								return (
									<div
										className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
										key={toolCallId}
									>
										Error updating document: {String(part.output.error)}
									</div>
								);
							}

							return (
								<div className="relative" key={toolCallId}>
									<DocumentPreview
										args={{ ...part.output, isUpdate: true }}
										isReadonly={isReadonly}
										result={part.output}
									/>
								</div>
							);
						}

						if (type === "tool-requestSuggestions") {
							const { toolCallId, state } = part;

							return (
								<Tool defaultOpen={false} key={toolCallId}>
									<ToolHeader state={state} type="tool-requestSuggestions" />
									<ToolContent>
										{state === "input-available" && (
											<ToolInput input={part.input} />
										)}
										{state === "output-available" && (
											<ToolOutput
												errorText={undefined}
												output={
													"error" in part.output ? (
														<div className="rounded border p-2 text-red-500">
															Error: {String(part.output.error)}
														</div>
													) : (
														<DocumentToolResult
															isReadonly={isReadonly}
															result={part.output}
															type="request-suggestions"
														/>
													)
												}
											/>
										)}
									</ToolContent>
								</Tool>
							);
						}

						// Web Fetch Tool
						if (type === "tool-webFetch") {
							const { toolCallId, state } = part;
							const url = part.input?.url as string | undefined;

							// Extract domain from URL for display
							let domain = "URL";
							if (url) {
								try {
									domain = new URL(url).hostname;
								} catch {
									domain = url.substring(0, 30);
								}
							}

							return (
								<Tool defaultOpen={false} key={toolCallId}>
									<ToolHeader
										state={state}
										type="tool-webFetch"
										title={`Fetching: ${domain}`}
										description={url || "Loading web content"}
									/>
									<ToolContent>
										{(state === "input-available" ||
											state === "input-streaming") && (
												<ToolInput input={part.input} />
											)}
										{state === "output-available" && (
											<ToolOutput
												errorText={
													part.output && "error" in part.output
														? String(part.output.error)
														: part.output && part.output.success === false
															? String(part.output.error || "Request failed")
															: undefined
												}
												output={
													part.output && part.output.success ? (
														<div className="p-3 max-w-full overflow-hidden">
															<div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
																<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
																	✓ Success
																</span>
																<span className="truncate min-w-0">
																	{part.output.url}
																</span>
															</div>
															<pre className="max-h-48 max-w-full overflow-auto rounded bg-muted/50 p-2 text-xs whitespace-pre-wrap break-words">
																{typeof part.output.data === "object"
																	? JSON.stringify(
																		part.output.data,
																		null,
																		2,
																	).substring(0, 1000)
																	: String(part.output.data).substring(0, 1000)}
																{(typeof part.output.data === "object"
																	? JSON.stringify(part.output.data).length >
																	1000
																	: String(part.output.data).length > 1000) &&
																	"\n..."}
															</pre>
														</div>
													) : null
												}
											/>
										)}
									</ToolContent>
								</Tool>
							);
						}

						// Skill Tools - useSkill
						if (type === "tool-useSkill") {
							const { toolCallId, state } = part;
							const skillId = part.input?.skillId as string | undefined;

							return (
								<Tool defaultOpen={false} key={toolCallId}>
									<ToolHeader
										state={state}
										type="tool-useSkill"
										title={skillId ? `Loading: ${skillId}` : "Loading Skill"}
										description="Activating specialized skill instructions"
									/>
									<ToolContent>
										{state === "input-available" && (
											<ToolInput input={part.input} />
										)}
										{state === "output-available" &&
											(part.output && "error" in part.output ? (
												<ToolOutput
													errorText={String(part.output.error)}
													output={null}
												/>
											) : part.output && "instructions" in part.output ? (
												<SkillOutput
													skillId={part.output.skillId as string}
													skillName={part.output.name as string}
													instructions={part.output.instructions as string}
												/>
											) : (
												<ToolOutput
													errorText={undefined}
													output={
														<pre className="p-3 text-xs max-w-full overflow-auto whitespace-pre-wrap break-words">
															{JSON.stringify(part.output, null, 2)}
														</pre>
													}
												/>
											))}
									</ToolContent>
								</Tool>
							);
						}

						// Skill Tools - getSkillResource
						if (type === "tool-getSkillResource") {
							const { toolCallId, state } = part;
							const resourcePath = part.input?.resourcePath as
								| string
								| undefined;

							return (
								<Tool defaultOpen={false} key={toolCallId}>
									<ToolHeader
										state={state}
										type="tool-getSkillResource"
										title={
											resourcePath
												? `Resource: ${resourcePath}`
												: "Skill Resource"
										}
										description="Loading additional skill documentation"
									/>
									<ToolContent>
										{state === "input-available" && (
											<ToolInput input={part.input} />
										)}
										{state === "output-available" && (
											<ToolOutput
												errorText={
													part.output && "error" in part.output
														? String(part.output.error)
														: undefined
												}
												output={
													part.output && "content" in part.output ? (
														<pre className="max-h-48 max-w-full overflow-auto p-3 text-xs whitespace-pre-wrap break-words">
															{(part.output.content as string).substring(
																0,
																500,
															)}
															{(part.output.content as string).length > 500
																? "..."
																: ""}
														</pre>
													) : null
												}
											/>
										)}
									</ToolContent>
								</Tool>
							);
						}

						// Spotify Tool
						if (type === "tool-spotify") {
							const { toolCallId, state } = part;
							const action = part.input?.action as string | undefined;

							// Determine title based on action
							let title = "Spotify";
							if (action === "search")
								title = `Searching: ${part.input?.query || ""}`;
							else if (action === "now_playing") title = "Now Playing";
							else if (action === "play") title = "Playing";
							else if (action === "pause") title = "Pausing";
							else if (action === "top_tracks") title = "Top Tracks";
							else if (action === "top_artists") title = "Top Artists";
							else if (action === "playlists") title = "Playlists";
							else if (action === "get_devices") title = "Devices";
							else if (action === "next") title = "Next Track";
							else if (action === "previous") title = "Previous Track";
							else if (action === "create_playlist") title = "Creating Playlist";
							else if (action === "add_tracks_to_playlist") title = "Adding to Playlist";
							else if (action === "get_playlist_tracks") title = "Playlist Tracks";

							return (
								<Tool defaultOpen={false} key={toolCallId}>
									<ToolHeader state={state} type="tool-spotify" title={title} />
									<ToolContent>
										{state === "input-available" && (
											<ToolInput input={part.input} />
										)}
										{state === "output-available" && (
											<ToolOutput
												errorText={undefined}
												output={<SpotifyPlayer data={part.output} />}
											/>
										)}
									</ToolContent>
								</Tool>
							);
						}

						return null;
					})}

					{/* Web Search Sources - full panel shown only after completion */}
					{message.role === "assistant" &&
						sourcesFromMessage.length > 0 &&
						!isLoading && (
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

		return false;
	},
);

export const ThinkingMessage = () => {
	const { phrase, isTransitioning } = useThinkingPhrase();

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
								<span className="animate-bounce [animation-delay:150ms]">
									.
								</span>
								<span className="animate-bounce [animation-delay:300ms]">
									.
								</span>
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
