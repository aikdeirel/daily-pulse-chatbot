"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { Trigger } from "@radix-ui/react-select";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
	type ChangeEvent,
	type Dispatch,
	memo,
	type SetStateAction,
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { SelectItem } from "@/components/ui/select";
import { chatModels } from "@/lib/ai/models";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { Context } from "./elements/context";
import {
	PromptInput,
	PromptInputModelSelect,
	PromptInputModelSelectContent,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputToolbar,
	PromptInputTools,
} from "./elements/prompt-input";
import {
	ArrowUpIcon,
	ChevronDownIcon,
	CpuIcon,
	GlobeIcon,
	PaperclipIcon,
	StopIcon,
} from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { SuggestedActions } from "./suggested-actions";
import { Button } from "./ui/button";
import type { VisibilityType } from "./visibility-selector";

function PureMultimodalInput({
	chatId,
	input,
	setInput,
	status,
	stop,
	attachments,
	setAttachments,
	messages,
	setMessages,
	sendMessage,
	className,
	selectedVisibilityType,
	selectedModelId,
	onModelChange,
	usage,
	webSearchEnabled,
	onWebSearchToggle,
}: {
	chatId: string;
	input: string;
	setInput: Dispatch<SetStateAction<string>>;
	status: UseChatHelpers<ChatMessage>["status"];
	stop: () => void;
	attachments: Attachment[];
	setAttachments: Dispatch<SetStateAction<Attachment[]>>;
	messages: UIMessage[];
	setMessages: UseChatHelpers<ChatMessage>["setMessages"];
	sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
	className?: string;
	selectedVisibilityType: VisibilityType;
	selectedModelId: string;
	onModelChange?: (modelId: string) => void;
	usage?: AppUsage;
	webSearchEnabled: boolean;
	onWebSearchToggle: (enabled: boolean) => void;
}) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const { width } = useWindowSize();

	const [localStorageInput, setLocalStorageInput] = useLocalStorage(
		"input",
		"",
	);

	useEffect(() => {
		if (textareaRef.current) {
			const domValue = textareaRef.current.value;
			// Prefer DOM value over localStorage to handle hydration
			const finalValue = domValue || localStorageInput || "";
			setInput(finalValue);
		}
		// Only run once after hydration
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [localStorageInput, setInput]);

	useEffect(() => {
		setLocalStorageInput(input);
	}, [input, setLocalStorageInput]);

	const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(event.target.value);
	};

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadQueue, setUploadQueue] = useState<string[]>([]);

	const submitForm = useCallback(() => {
		window.history.pushState({}, "", `/chat/${chatId}`);

		sendMessage({
			role: "user",
			parts: [
				...attachments.map((attachment) => ({
					type: "file" as const,
					url: attachment.url,
					name: attachment.name,
					mediaType: attachment.contentType,
				})),
				{
					type: "text",
					text: input,
				},
			],
		});

		setAttachments([]);
		setLocalStorageInput("");
		setInput("");

		if (width && width > 768) {
			textareaRef.current?.focus();
		}
	}, [
		input,
		setInput,
		attachments,
		sendMessage,
		setAttachments,
		setLocalStorageInput,
		width,
		chatId,
	]);

	const uploadFile = useCallback(async (file: File) => {
		const formData = new FormData();
		formData.append("file", file);

		try {
			const response = await fetch("/api/files/upload", {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				const data = await response.json();
				const { url, pathname, contentType } = data;

				return {
					url,
					name: pathname,
					contentType,
				};
			}
			const { error } = await response.json();
			toast.error(error);
		} catch (_error) {
			toast.error("Failed to upload file, please try again!");
		}
	}, []);

	const contextProps = useMemo(
		() => ({
			usage,
		}),
		[usage],
	);

	const handleFileChange = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(event.target.files || []);

			setUploadQueue(files.map((file) => file.name));

			try {
				const uploadPromises = files.map((file) => uploadFile(file));
				const uploadedAttachments = await Promise.all(uploadPromises);
				const successfullyUploadedAttachments = uploadedAttachments.filter(
					(attachment) => attachment !== undefined,
				);

				setAttachments((currentAttachments) => [
					...currentAttachments,
					...successfullyUploadedAttachments,
				]);
			} catch (error) {
				console.error("Error uploading files!", error);
			} finally {
				setUploadQueue([]);
			}
		},
		[setAttachments, uploadFile],
	);

	const handlePaste = useCallback(
		async (event: ClipboardEvent) => {
			const items = event.clipboardData?.items;
			if (!items) {
				return;
			}

			const imageItems = Array.from(items).filter((item) =>
				item.type.startsWith("image/"),
			);

			if (imageItems.length === 0) {
				return;
			}

			// Prevent default paste behavior for images
			event.preventDefault();

			setUploadQueue((prev) => [...prev, "Pasted image"]);

			try {
				const uploadPromises = imageItems
					.map((item) => item.getAsFile())
					.filter((file): file is File => file !== null)
					.map((file) => uploadFile(file));

				const uploadedAttachments = await Promise.all(uploadPromises);
				const successfullyUploadedAttachments = uploadedAttachments.filter(
					(attachment) =>
						attachment !== undefined &&
						attachment.url !== undefined &&
						attachment.contentType !== undefined,
				);

				setAttachments((curr) => [
					...curr,
					...(successfullyUploadedAttachments as Attachment[]),
				]);
			} catch (error) {
				console.error("Error uploading pasted images:", error);
				toast.error("Failed to upload pasted image(s)");
			} finally {
				setUploadQueue([]);
			}
		},
		[setAttachments, uploadFile],
	);

	// Add paste event listener to textarea
	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}

		textarea.addEventListener("paste", handlePaste);
		return () => textarea.removeEventListener("paste", handlePaste);
	}, [handlePaste]);

	return (
		<div className={cn("relative flex w-full flex-col gap-4", className)}>
			{messages.length === 0 &&
				attachments.length === 0 &&
				uploadQueue.length === 0 && (
					<SuggestedActions
						chatId={chatId}
						selectedVisibilityType={selectedVisibilityType}
						sendMessage={sendMessage}
					/>
				)}

			<input
				className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
				multiple
				onChange={handleFileChange}
				ref={fileInputRef}
				tabIndex={-1}
				type="file"
			/>

			<PromptInput
				className="rounded-2xl border-2 border-border/60 bg-background/90 p-4 shadow-xl shadow-orange-500/5 ring-1 ring-black/5 backdrop-blur-sm transition-all duration-300 focus-within:border-orange-500/50 focus-within:ring-orange-500/20 focus-within:shadow-orange-500/10 hover:border-border dark:border-border/50 dark:bg-background/70 dark:ring-white/5 dark:focus-within:border-orange-400/50 dark:focus-within:ring-orange-400/20"
				onSubmit={(event) => {
					event.preventDefault();
					if (status !== "ready") {
						toast.error("Please wait for the model to finish its response!");
					} else {
						submitForm();
					}
				}}
			>
				{(attachments.length > 0 || uploadQueue.length > 0) && (
					<div
						className="flex flex-row items-end gap-2 overflow-x-scroll"
						data-testid="attachments-preview"
					>
						{attachments.map((attachment) => (
							<PreviewAttachment
								attachment={attachment}
								key={attachment.url}
								onRemove={() => {
									setAttachments((currentAttachments) =>
										currentAttachments.filter((a) => a.url !== attachment.url),
									);
									if (fileInputRef.current) {
										fileInputRef.current.value = "";
									}
								}}
							/>
						))}

						{uploadQueue.map((filename) => (
							<PreviewAttachment
								attachment={{
									url: "",
									name: filename,
									contentType: "",
								}}
								isUploading={true}
								key={filename}
							/>
						))}
					</div>
				)}
				<div className="flex flex-row items-start gap-1 sm:gap-2">
					<PromptInputTextarea
						autoFocus
						className="grow resize-none border-0! border-none! bg-transparent py-1 text-base outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
						data-testid="multimodal-input"
						disableAutoResize={false}
						maxHeight={200}
						minHeight={0}
						onChange={handleInput}
						placeholder="Type your message..."
						ref={textareaRef}
						rows={1}
						value={input}
					/>{" "}
					<Context {...contextProps} />
				</div>
				<PromptInputToolbar className="!border-top-0 border-t-0! p-0 shadow-none dark:border-0 dark:border-transparent!">
					<PromptInputTools className="gap-0 sm:gap-0.5">
						<AttachmentsButton
							fileInputRef={fileInputRef}
							selectedModelId={selectedModelId}
							status={status}
						/>
						<WebSearchToggle
							enabled={webSearchEnabled}
							onToggle={onWebSearchToggle}
							status={status}
						/>
						<ModelSelectorCompact
							onModelChange={onModelChange}
							selectedModelId={selectedModelId}
						/>
					</PromptInputTools>

					{status === "submitted" ? (
						<StopButton setMessages={setMessages} stop={stop} />
					) : (
						<PromptInputSubmit
							className="size-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:from-orange-400 hover:to-amber-400 hover:shadow-xl hover:shadow-orange-500/40 disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none dark:from-orange-500 dark:to-amber-500 dark:shadow-orange-500/25"
							data-testid="send-button"
							disabled={!input.trim() || uploadQueue.length > 0}
							status={status}
						>
							<ArrowUpIcon size={18} />
						</PromptInputSubmit>
					)}
				</PromptInputToolbar>
			</PromptInput>
		</div>
	);
}

export const MultimodalInput = memo(
	PureMultimodalInput,
	(prevProps, nextProps) => {
		if (prevProps.input !== nextProps.input) {
			return false;
		}
		if (prevProps.status !== nextProps.status) {
			return false;
		}
		if (!equal(prevProps.attachments, nextProps.attachments)) {
			return false;
		}
		if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
			return false;
		}
		if (prevProps.selectedModelId !== nextProps.selectedModelId) {
			return false;
		}
		if (prevProps.webSearchEnabled !== nextProps.webSearchEnabled) {
			return false;
		}

		return true;
	},
);

function PureAttachmentsButton({
	fileInputRef,
	status,
	selectedModelId,
}: {
	fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
	status: UseChatHelpers<ChatMessage>["status"];
	selectedModelId: string;
}) {
	const isReasoningModel = selectedModelId === "chat-model-reasoning";

	return (
		<Button
			className="aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
			data-testid="attachments-button"
			disabled={status !== "ready" || isReasoningModel}
			onClick={(event) => {
				event.preventDefault();
				fileInputRef.current?.click();
			}}
			variant="ghost"
		>
			<PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
		</Button>
	);
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureModelSelectorCompact({
	selectedModelId,
	onModelChange,
}: {
	selectedModelId: string;
	onModelChange?: (modelId: string) => void;
}) {
	const [optimisticModelId, setOptimisticModelId] = useState(selectedModelId);

	useEffect(() => {
		setOptimisticModelId(selectedModelId);
	}, [selectedModelId]);

	const selectedModel = chatModels.find(
		(model) => model.id === optimisticModelId,
	);

	return (
		<PromptInputModelSelect
			onValueChange={(modelName) => {
				const model = chatModels.find((m) => m.name === modelName);
				if (model) {
					setOptimisticModelId(model.id);
					onModelChange?.(model.id);
					startTransition(() => {
						saveChatModelAsCookie(model.id);
					});
				}
			}}
			value={selectedModel?.name}
		>
			<Trigger asChild>
				<Button className="h-8 px-2" variant="ghost">
					<CpuIcon size={16} />
					<span className="truncate font-medium text-xs">
						{selectedModel?.name}
					</span>
					<ChevronDownIcon size={16} />
				</Button>
			</Trigger>
			<PromptInputModelSelectContent className="min-w-[260px] p-0">
				<div className="flex flex-col gap-px">
					{chatModels.map((model) => (
						<SelectItem key={model.id} value={model.name}>
							<div className="truncate font-medium text-xs">{model.name}</div>
							<div className="mt-px truncate text-[10px] text-muted-foreground group-focus:text-white group-data-[state=checked]:text-accent-foreground leading-tight">
								{model.description}
							</div>
						</SelectItem>
					))}
				</div>
			</PromptInputModelSelectContent>
		</PromptInputModelSelect>
	);
}

const ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureStopButton({
	stop,
	setMessages,
}: {
	stop: () => void;
	setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
	return (
		<Button
			className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
			data-testid="stop-button"
			onClick={(event) => {
				event.preventDefault();
				stop();
				setMessages((messages) => messages);
			}}
		>
			<StopIcon size={14} />
		</Button>
	);
}

const StopButton = memo(PureStopButton);

function PureWebSearchToggle({
	enabled,
	onToggle,
	status,
}: {
	enabled: boolean;
	onToggle: (enabled: boolean) => void;
	status: UseChatHelpers<ChatMessage>["status"];
}) {
	return (
		<Button
			className={cn(
				"aspect-square h-8 rounded-lg p-1 transition-colors",
				enabled
					? "bg-sky-500/15 text-sky-600 hover:bg-sky-500/25 dark:text-sky-400"
					: "hover:bg-accent",
			)}
			data-testid="web-search-toggle"
			disabled={status !== "ready"}
			onClick={(event) => {
				event.preventDefault();
				onToggle(!enabled);
			}}
			title={enabled ? "Web search enabled" : "Enable web search"}
			variant="ghost"
		>
			<GlobeIcon size={14} />
		</Button>
	);
}

const WebSearchToggle = memo(PureWebSearchToggle);
