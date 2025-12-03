import type { UserType } from "@/app/(auth)/auth";
import type { ChatModel } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: [
      "gpt-5-nano",
      "gpt-5.1",
      "gpt-5.1-chat",
      "gpt-5.1-codex",
      "gpt-5.1-codex-mini",
      "claude-sonnet-4.5",
      "claude-opus-4.5",
      "claude-haiku-4.5",
      "gpt-5.1-reasoning",
      "claude-opus-4.5-reasoning",
      "claude-sonnet-4.5-reasoning",
      "gpt-oss-20b-free",
      "gemma-3-27b-free",
      "glm-4.5-air-free",
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      "gpt-5-nano",
      "gpt-5.1",
      "gpt-5.1-chat",
      "gpt-5.1-codex",
      "gpt-5.1-codex-mini",
      "claude-sonnet-4.5",
      "claude-opus-4.5",
      "claude-haiku-4.5",
      "gpt-5.1-reasoning",
      "claude-opus-4.5-reasoning",
      "claude-sonnet-4.5-reasoning",
      "gpt-oss-20b-free",
      "gemma-3-27b-free",
      "glm-4.5-air-free",
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
