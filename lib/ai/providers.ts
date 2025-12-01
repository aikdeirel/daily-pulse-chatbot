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

// Model ID to OpenRouter model mapping
const modelIdToOpenRouter: Record<string, string> = {
	"gpt-oss-20b-free": "openai/gpt-oss-20b:free",
	"gpt-5-nano": "openai/gpt-5-nano",
	"gpt-5.1": "openai/gpt-5.1",
	"gpt-5.1-chat": "openai/gpt-5.1-chat",
	"gpt-5.1-codex": "openai/gpt-5.1-codex",
	"gpt-5.1-codex-mini": "openai/gpt-5.1-codex-mini",
	"claude-sonnet-4.5": "anthropic/claude-sonnet-4.5",
	"claude-opus-4.5": "anthropic/claude-opus-4.5",
	"claude-haiku-4.5": "anthropic/claude-haiku-4.5",
	"gpt-5.1-reasoning": "openai/gpt-5.1",
	"claude-opus-4.5-reasoning": "anthropic/claude-opus-4.5",
	"claude-sonnet-4.5-reasoning": "anthropic/claude-sonnet-4.5",
	"title-model": "openai/gpt-5-nano",
	"artifact-model": "anthropic/claude-haiku-4.5",
};

// Reasoning models that need middleware
const reasoningModels = [
	"gpt-5.1-reasoning",
	"claude-opus-4.5-reasoning",
	"claude-sonnet-4.5-reasoning",
];

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
		const { chatModel, reasoningModel, titleModel, artifactModel } =
			require("./models.mock");
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

	const isReasoningModel = reasoningModels.includes(modelId);

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
