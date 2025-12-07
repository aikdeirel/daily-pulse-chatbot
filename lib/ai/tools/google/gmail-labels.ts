import { tool } from "ai";
import { z } from "zod";
import { GoogleService } from "@/lib/services/google";

type GmailLabelsToolProps = {
  userId: string;
};

export const gmailLabels = ({ userId }: GmailLabelsToolProps) =>
  tool({
    description: `Manage Gmail labels for organizing emails. Actions:
- "list_labels": List all available labels
- "get_label": Get specific label details (requires labelId)
- "create_label": Create a new label (requires name)
- "update_label": Update label properties (requires labelId, name)
- "delete_label": Delete a label (requires labelId)
- "add_label_to_message": Add label(s) to message (requires messageId, labelIds)
- "remove_label_from_message": Remove label(s) from message (requires messageId, labelIds)
- "batch_add_labels": Add label(s) to multiple messages (requires messageIds, labelIds)
- "batch_remove_labels": Remove label(s) from multiple messages (requires messageIds, labelIds)

Important Notes:
- System labels (INBOX, UNREAD, STARRED, etc.) cannot be modified or deleted
- Label names are case-sensitive
- Custom labels can be created for better organization
- Requires Google OAuth connection with Gmail permissions.`,
    inputSchema: z.object({
      action: z.enum([
        "list_labels",
        "get_label",
        "create_label",
        "update_label",
        "delete_label",
        "add_label_to_message",
        "remove_label_from_message",
        "batch_add_labels",
        "batch_remove_labels",
      ]),
      labelId: z
        .string()
        .optional()
        .describe(
          "Label ID (required for get_label, update_label, delete_label)",
        ),
      messageId: z
        .string()
        .optional()
        .describe(
          "Message ID (required for add_label_to_message, remove_label_from_message)",
        ),
      messageIds: z
        .array(z.string())
        .optional()
        .describe(
          "Array of message IDs (required for batch_add_labels, batch_remove_labels)",
        ),
      labelIds: z
        .array(z.string())
        .optional()
        .describe(
          "Array of label IDs to add or remove (required for label operations on messages)",
        ),
      name: z
        .string()
        .optional()
        .describe(
          "Label name (required for create_label, optional for update_label)",
        ),
      messageListVisibility: z
        .enum(["show", "hide"])
        .optional()
        .describe("Message list visibility for create_label, update_label"),
      labelListVisibility: z
        .enum(["labelShow", "labelHide"])
        .optional()
        .describe("Label list visibility for create_label, update_label"),
    }),
    execute: async ({
      action,
      labelId,
      messageId,
      messageIds,
      labelIds,
      name,
      messageListVisibility,
      labelListVisibility,
    }) => {
      const googleService = new GoogleService(userId);

      try {
        switch (action) {
          case "list_labels": {
            const labels = await googleService.listGmailLabels();
            return { action: "list_labels", labels };
          }

          case "get_label": {
            if (!labelId) {
              return {
                error: "missing_label_id",
                message: "Label ID is required for get_label",
              };
            }
            const label = await googleService.getGmailLabel(labelId);
            return { action: "get_label", label };
          }

          case "create_label": {
            if (!name) {
              return {
                error: "missing_name",
                message: "Label name is required for create_label",
              };
            }
            const labelData: {
              name: string;
              messageListVisibility?: "show" | "hide";
              labelListVisibility?: "labelShow" | "labelHide";
            } = { name };
            if (messageListVisibility) {
              labelData.messageListVisibility = messageListVisibility;
            }
            if (labelListVisibility) {
              labelData.labelListVisibility = labelListVisibility;
            }
            const label = await googleService.createGmailLabel(labelData);
            return { action: "create_label", label };
          }

          case "update_label": {
            if (!labelId) {
              return {
                error: "missing_label_id",
                message: "Label ID is required for update_label",
              };
            }
            if (!name && !messageListVisibility && !labelListVisibility) {
              return {
                error: "missing_update_data",
                message:
                  "At least one field (name, messageListVisibility, or labelListVisibility) is required for update_label",
              };
            }
            const labelData: {
              name?: string;
              messageListVisibility?: "show" | "hide";
              labelListVisibility?: "labelShow" | "labelHide";
            } = {};
            if (name) labelData.name = name;
            if (messageListVisibility) {
              labelData.messageListVisibility = messageListVisibility;
            }
            if (labelListVisibility) {
              labelData.labelListVisibility = labelListVisibility;
            }
            const label = await googleService.updateGmailLabel(
              labelId,
              labelData,
            );
            return { action: "update_label", label };
          }

          case "delete_label": {
            if (!labelId) {
              return {
                error: "missing_label_id",
                message: "Label ID is required for delete_label",
              };
            }
            await googleService.deleteGmailLabel(labelId);
            return { action: "delete_label", success: true, labelId };
          }

          case "add_label_to_message": {
            if (!messageId || !labelIds || labelIds.length === 0) {
              return {
                error: "missing_params",
                message:
                  "Message ID and label IDs are required for add_label_to_message",
              };
            }
            const result = await googleService.modifyGmailMessage(
              messageId,
              labelIds,
              undefined,
            );
            return { action: "add_label_to_message", result };
          }

          case "remove_label_from_message": {
            if (!messageId || !labelIds || labelIds.length === 0) {
              return {
                error: "missing_params",
                message:
                  "Message ID and label IDs are required for remove_label_from_message",
              };
            }
            const result = await googleService.modifyGmailMessage(
              messageId,
              undefined,
              labelIds,
            );
            return { action: "remove_label_from_message", result };
          }

          case "batch_add_labels": {
            if (
              !messageIds ||
              messageIds.length === 0 ||
              !labelIds ||
              labelIds.length === 0
            ) {
              return {
                error: "missing_params",
                message:
                  "Message IDs and label IDs are required for batch_add_labels",
              };
            }
            await googleService.batchModifyGmailMessages(
              messageIds,
              labelIds,
              undefined,
            );
            return {
              action: "batch_add_labels",
              success: true,
              messageCount: messageIds.length,
            };
          }

          case "batch_remove_labels": {
            if (
              !messageIds ||
              messageIds.length === 0 ||
              !labelIds ||
              labelIds.length === 0
            ) {
              return {
                error: "missing_params",
                message:
                  "Message IDs and label IDs are required for batch_remove_labels",
              };
            }
            await googleService.batchModifyGmailMessages(
              messageIds,
              undefined,
              labelIds,
            );
            return {
              action: "batch_remove_labels",
              success: true,
              messageCount: messageIds.length,
            };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Gmail Labels tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Gmail Labels",
        };
      }
    },
  });
