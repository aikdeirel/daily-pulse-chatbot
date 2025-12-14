import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import {
  modelIdToOpenRouter,
  modelsConfig,
  reasoningModelIds,
  specialModels,
} from "./models.config";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Web search plugin configuration
 * - max_results: 3 (reduced from default 5 for cost savings)
 *
 * Note: search_context_size is only available for native search providers
 * (OpenAI, Anthropic, etc.) and is passed via the API request body,
 * not through the SDK. For Exa-powered search, max_results controls costs.
 */
const WEB_SEARCH_PLUGIN = {
  id: "web" as const,
  max_results: 3,
};

/**
 * Get a language model with optional web search enabled
 */
export function getLanguageModel(modelId: string, webSearchEnabled = false) {
  if (isTestEnvironment) {
    const {
      chatModel,
      reasoningModel,
      titleModel,
      artifactModel,
    } = require("./models.mock");
    const mockModels: Record<string, any> = {
      "chat-model": chatModel,
      "chat-model-reasoning": reasoningModel,
      "title-model": titleModel,
      "artifact-model": artifactModel,
    };
    return mockModels[modelId] || chatModel;
  }

  const openRouterModelId = modelIdToOpenRouter[modelId];
  if (!openRouterModelId) {
    throw new Error(`Unknown model ID: ${modelId}`);
  }

  const isReasoningModel = reasoningModelIds.includes(modelId);

  // Create base model with optional web search
  const baseModel = openrouter(
    openRouterModelId,
    webSearchEnabled ? { plugins: [WEB_SEARCH_PLUGIN] } : undefined,
  );

  // Wrap with reasoning middleware if needed
  if (isReasoningModel) {
    return wrapLanguageModel({
      model: baseModel,
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    });
  }

  return baseModel;
}

/**
 * Build the language models object dynamically from config
 */
function buildLanguageModels() {
  const models: Record<string, any> = {};

  for (const config of modelsConfig) {
    if (config.isReasoning) {
      models[config.id] = wrapLanguageModel({
        model: openrouter(config.openRouterId),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });
    } else {
      models[config.id] = openrouter(config.openRouterId);
    }
  }

  // Add special purpose models
  for (const [id, openRouterId] of Object.entries(specialModels)) {
    models[id] = openrouter(openRouterId);
  }

  return models;
}

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
      languageModels: buildLanguageModels(),
    });
