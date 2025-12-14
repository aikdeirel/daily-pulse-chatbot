import type { UserType } from "@/app/(auth)/auth";
import { getAvailableModelIds, type ChatModelId } from "./models.config";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModelId[];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: getAvailableModelIds("guest"),
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: getAvailableModelIds("regular"),
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
