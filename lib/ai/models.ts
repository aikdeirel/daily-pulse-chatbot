/**
 * Re-exports from the centralized models config.
 * This file exists for backwards compatibility.
 *
 * @see ./models.config.ts for the single source of truth
 */
export {
  type ChatModel,
  type ChatModelId,
  chatModels,
  DEFAULT_CHAT_MODEL,
} from "./models.config";
