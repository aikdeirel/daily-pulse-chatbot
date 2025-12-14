import { z } from "zod";

/**
 * Centralized LLM Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all model definitions.
 * When adding a new model, you only need to update this file.
 */

export type ModelConfig = {
  /** Internal model ID used throughout the app */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** Description shown in the model selector */
  description: string;
  /** The actual model ID sent to OpenRouter */
  openRouterId: string;
  /** Whether this model supports tools/function calling */
  supportsTools: boolean;
  /** Whether this model uses reasoning middleware (extended thinking) */
  isReasoning: boolean;
  /** Whether this is a free model */
  isFree: boolean;
  /** User types that can access this model */
  availableFor: ("guest" | "regular")[];
};

/**
 * All available chat models.
 * Add new models here - everything else is derived automatically.
 */
export const modelsConfig: ModelConfig[] = [
    // Mistral models
    {
      id: "mistral-medium-3.1",
      name: "Mistral Medium 3.1",
      description: "Medium-sized model for balanced performance (default)",
      openRouterId: "mistralai/mistral-medium-3.1",
      supportsTools: true,
      isReasoning: false,
      isFree: false,
      availableFor: ["guest", "regular"],
    },
  {
    id: "mistral-small-3.1-24b-instruct-free",
    name: "Mistral Small 3.1 24B Instruct",
    description: "Free: 24B parameter instruction-tuned model",
    openRouterId: "mistralai/mistral-small-3.1-24b-instruct:free",
    supportsTools: true,
    isReasoning: false,
    isFree: true,
    availableFor: ["guest", "regular"],
  },

  // Anthropic Claude models
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    description: "Fast and efficient model for short and concise responses",
    openRouterId: "anthropic/claude-haiku-4.5",
    supportsTools: true,
    isReasoning: false,
    isFree: false,
    availableFor: ["guest", "regular"],
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "Balanced performance and speed for complex tasks",
    openRouterId: "anthropic/claude-sonnet-4.5",
    supportsTools: true,
    isReasoning: false,
    isFree: false,
    availableFor: ["guest", "regular"],
  },
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    description: "Most capable model for complex tasks",
    openRouterId: "anthropic/claude-opus-4.5",
    supportsTools: true,
    isReasoning: false,
    isFree: false,
    availableFor: ["guest", "regular"],
  },
  {
    id: "claude-sonnet-4.5-reasoning",
    name: "Claude Sonnet 4.5 Reasoning",
    description: "Balanced model with reasoning enabled",
    openRouterId: "anthropic/claude-sonnet-4.5",
    supportsTools: true,
    isReasoning: true,
    isFree: false,
    availableFor: ["guest", "regular"],
  },
  {
    id: "claude-opus-4.5-reasoning",
    name: "Claude Opus 4.5 Reasoning",
    description: "Most capable model with reasoning enabled",
    openRouterId: "anthropic/claude-opus-4.5",
    supportsTools: true,
    isReasoning: true,
    isFree: false,
    availableFor: ["guest", "regular"],
  },

  // OpenAI GPT models
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    description: "Fast and cost-effective small model",
    openRouterId: "openai/gpt-5-nano",
    supportsTools: true,
    isReasoning: false,
    isFree: false,
    availableFor: ["guest", "regular"],
  },
  {
    id: "gpt-5.1-chat",
    name: "GPT-5.1 Chat",
    description: "Optimized for conversational interactions",
    openRouterId: "openai/gpt-5.1-chat",
    supportsTools: true,
    isReasoning: false,
    isFree: false,
    availableFor: ["guest", "regular"],
  },
];

/**
 * Special purpose models (not user-selectable)
 */
export const specialModels = {
  "title-model": "openai/gpt-5-nano",
  "artifact-model": "anthropic/claude-haiku-4.5",
} as const;

// ============================================================================
// DERIVED VALUES - Auto-generated from config above
// ============================================================================

/** All model IDs as a tuple for Zod schemas */
export const chatModelIds = modelsConfig.map((m) => m.id) as [
  string,
  ...string[],
];

/** Zod schema for validating model selection */
export const chatModelIdSchema = z.enum(chatModelIds);

/** Type for model IDs */
export type ChatModelId = (typeof chatModelIds)[number];

/** Default model ID */
export const DEFAULT_CHAT_MODEL: ChatModelId = "mistral-medium-3.1";

/** ChatModel type for UI display */
export type ChatModel = {
  id: ChatModelId;
  name: string;
  description: string;
};

/** Array of chat models for UI display */
export const chatModels: ChatModel[] = modelsConfig.map((m) => ({
  id: m.id as ChatModelId,
  name: m.name,
  description: m.description,
}));

/** Map of model ID to OpenRouter model ID */
export const modelIdToOpenRouter: Record<string, string> = {
  ...Object.fromEntries(modelsConfig.map((m) => [m.id, m.openRouterId])),
  ...specialModels,
};

/** Array of reasoning model IDs */
export const reasoningModelIds: string[] = modelsConfig
  .filter((m) => m.isReasoning)
  .map((m) => m.id);

/** Array of model IDs that don't support tools */
export const modelsWithoutToolSupport: string[] = modelsConfig
  .filter((m) => !m.supportsTools)
  .map((m) => m.id);

/** Get available model IDs for a user type */
export function getAvailableModelIds(
  userType: "guest" | "regular",
): ChatModelId[] {
  return modelsConfig
    .filter((m) => m.availableFor.includes(userType))
    .map((m) => m.id as ChatModelId);
}

/** Get model config by ID */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelsConfig.find((m) => m.id === modelId);
}
