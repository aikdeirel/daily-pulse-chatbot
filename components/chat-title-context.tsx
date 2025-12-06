"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

function isTitleGenerating(initialTitle?: string): boolean {
  return !initialTitle || initialTitle === "New Chat";
}

interface ChatTitleState {
  [chatId: string]: {
    title: string;
    isGenerating: boolean;
  };
}

interface ChatTitleContextType {
  // Get the current title state for a chat
  getTitleState: (
    chatId: string,
  ) => { title: string; isGenerating: boolean } | undefined;
  // Set title as generating (when new chat is created)
  setTitleGenerating: (chatId: string) => void;
  // Set the generated title
  setTitle: (chatId: string, title: string) => void;
}

const ChatTitleContext = createContext<ChatTitleContextType | null>(null);

export function ChatTitleProvider({ children }: { children: ReactNode }) {
  const [titleStates, setTitleStates] = useState<ChatTitleState>({});

  const getTitleState = useCallback(
    (chatId: string) => {
      return titleStates[chatId];
    },
    [titleStates],
  );

  const setTitleGenerating = useCallback((chatId: string) => {
    setTitleStates((prev) => ({
      ...prev,
      [chatId]: { title: "New Chat", isGenerating: true },
    }));
  }, []);

  const setTitle = useCallback((chatId: string, title: string) => {
    setTitleStates((prev) => ({
      ...prev,
      [chatId]: { title, isGenerating: false },
    }));
  }, []);

  const contextValue = useMemo(
    () => ({
      getTitleState,
      setTitleGenerating,
      setTitle,
    }),
    [getTitleState, setTitleGenerating, setTitle],
  );

  return (
    <ChatTitleContext.Provider value={contextValue}>
      {children}
    </ChatTitleContext.Provider>
  );
}

export function useChatTitle() {
  const context = useContext(ChatTitleContext);
  if (!context) {
    throw new Error("useChatTitle must be used within a ChatTitleProvider");
  }
  return context;
}

// Hook to use title for a specific chat
export function useTitleForChat(chatId: string, initialTitle?: string) {
  const context = useContext(ChatTitleContext);

  // Get the title state - either from context or compute from initial values
  const titleState = context?.getTitleState(chatId);

  // If we have a state in context, use it
  if (titleState) {
    return titleState;
  }

  // If initial title is "New Chat" or undefined, it's generating
  const isGenerating = isTitleGenerating(initialTitle);

  return {
    title: initialTitle,
    isGenerating,
  };
}
