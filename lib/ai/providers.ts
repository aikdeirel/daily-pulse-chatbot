import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // OpenAI models
        "gpt-oss-20b-free": openrouter("openai/gpt-oss-20b:free"),
        "gpt-5-nano": openrouter("openai/gpt-5-nano"),
        "gpt-5.1": openrouter("openai/gpt-5.1"),
        "gpt-5.1-chat": openrouter("openai/gpt-5.1-chat"),
        "gpt-5.1-codex": openrouter("openai/gpt-5.1-codex"),
        "gpt-5.1-codex-mini": openrouter("openai/gpt-5.1-codex-mini"),
        
        // Anthropic Claude models
        "claude-sonnet-4.5": openrouter("anthropic/claude-sonnet-4.5"),
        "claude-opus-4.5": openrouter("anthropic/claude-opus-4.5"),
        "claude-haiku-4.5": openrouter("anthropic/claude-haiku-4.5"),
        
        // Reasoning-enabled variants
        "gpt-5.1-reasoning": wrapLanguageModel({
          model: openrouter("openai/gpt-5.1"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "claude-opus-4.5-reasoning": wrapLanguageModel({
          model: openrouter("anthropic/claude-opus-4.5"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "claude-sonnet-4.5-reasoning": wrapLanguageModel({
          model: openrouter("anthropic/claude-sonnet-4.5"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        
        // Special purpose models
        "title-model": openrouter("openai/gpt-5-nano"),
        "artifact-model": openrouter("anthropic/claude-haiku-4.5"),
      },
    });
