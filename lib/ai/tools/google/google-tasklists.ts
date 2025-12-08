import { tool } from "ai";
import { z } from "zod";
import { GoogleService } from "@/lib/services/google";

type GoogleTaskListsToolProps = {
  userId: string;
};

export const googleTaskLists = ({ userId }: GoogleTaskListsToolProps) =>
  tool({
    description: `Manage Google Task Lists. Actions:
- "list_tasklists": List all task lists
- "get_tasklist": Get specific task list details (requires tasklistId)
- "create_tasklist": Create new task list (requires title)
- "update_tasklist": Update task list (requires tasklistId, title)
- "delete_tasklist": Delete task list (requires tasklistId)

Best practices: Task lists organize tasks into separate groups. Use descriptive titles. Requires Google OAuth connection.`,
    inputSchema: z.object({
      action: z.enum([
        "list_tasklists",
        "get_tasklist",
        "create_tasklist",
        "update_tasklist",
        "delete_tasklist",
      ]),
      tasklistId: z
        .string()
        .optional()
        .describe(
          "Task list ID (required for get_tasklist, update_tasklist, delete_tasklist)",
        ),
      title: z
        .string()
        .optional()
        .describe(
          "Task list title (required for create_tasklist, update_tasklist)",
        ),
    }),
    execute: async ({ action, tasklistId, title }) => {
      const googleService = new GoogleService(userId);

      try {
        switch (action) {
          case "list_tasklists": {
            const tasklists = await googleService.listTaskLists();
            return { action: "list_tasklists", tasklists };
          }

          case "get_tasklist": {
            if (!tasklistId) {
              return {
                error: "missing_tasklist_id",
                message: "Task list ID is required for get_tasklist",
              };
            }
            const tasklist = await googleService.getTaskList(tasklistId);
            return { action: "get_tasklist", tasklist };
          }

          case "create_tasklist": {
            if (!title) {
              return {
                error: "missing_title",
                message: "Title is required for create_tasklist",
              };
            }
            const tasklist = await googleService.createTaskList({ title });
            return { action: "create_tasklist", tasklist };
          }

          case "update_tasklist": {
            if (!tasklistId || !title) {
              return {
                error: "missing_params",
                message:
                  "Task list ID and title are required for update_tasklist",
              };
            }
            const tasklist = await googleService.updateTaskList(tasklistId, {
              title,
            });
            return { action: "update_tasklist", tasklist };
          }

          case "delete_tasklist": {
            if (!tasklistId) {
              return {
                error: "missing_tasklist_id",
                message: "Task list ID is required for delete_tasklist",
              };
            }
            await googleService.deleteTaskList(tasklistId);
            return { action: "delete_tasklist", success: true };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Google Task Lists tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Google Tasks",
        };
      }
    },
  });
