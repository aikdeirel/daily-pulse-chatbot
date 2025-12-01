import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { memo } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { useDataStream } from "./data-stream-provider";
import { Greeting } from "./greeting";
import { PreviewMessage, ThinkingMessage } from "./message";

type MessagesProps = {
  chatId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  selectedModelId: string;
};

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  selectedModelId: _selectedModelId,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    hasSentMessage,
  } = useMessages({
    status,
  });

  useDataStream();

  return (
    <div
      className="relative flex-1 touch-pan-y overflow-y-auto overflow-x-hidden"
      ref={messagesContainerRef}
    >
      <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 overflow-hidden">
        {messages.length === 0 && <Greeting />}

        {messages.map((message, index) => (
          <PreviewMessage
            chatId={chatId}
            isLoading={status === "streaming" && messages.length - 1 === index}
            isReadonly={isReadonly}
            key={message.id}
            message={message}
            regenerate={regenerate}
            requiresScrollPadding={
              hasSentMessage && index === messages.length - 1
            }
            setMessages={setMessages}
            vote={
              votes
                ? votes.find((vote) => vote.messageId === message.id)
                : undefined
            }
          />
        ))}

        {status === "submitted" && <ThinkingMessage />}

        <div
          className="min-h-[24px] min-w-[24px] shrink-0"
          ref={messagesEndRef}
        />
      </div>
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) {
    return true;
  }

  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.selectedModelId !== nextProps.selectedModelId) {
    return false;
  }
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  if (!equal(prevProps.messages, nextProps.messages)) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }

  return false;
});
