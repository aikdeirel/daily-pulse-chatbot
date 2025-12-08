import { tool } from "ai";
import { z } from "zod";
import { GoogleService } from "@/lib/services/google";

type GoogleTasksToolProps = {
  userId: string;
};

export const googleTasks = ({ userId }: GoogleTasksToolProps) =>
  tool({
    description: `Manage Google Tasks. Actions:
- "list_tasks": List tasks in a task list (requires tasklistId; optional: showCompleted, maxResults, dueMin, dueMax)
- "get_task": Get task details (requires tasklistId, taskId)
- "create_task": Create task (requires tasklistId, title; optional: notes, due, parent for subtasks)
- "update_task": Update task (requires tasklistId, taskId; optional: title, notes, due, status)
- "delete_task": Delete task (requires tasklistId, taskId)
- "move_task": Move task position (requires tasklistId, taskId; optional: parent, previous)
- "clear_completed": Clear all completed tasks (requires tasklistId)

Important Notes:
- Use RFC3339 format for dates (e.g., "2024-12-31T23:59:59Z")
- Status can be "needsAction" or "completed"
- For subtasks, provide parent task ID when creating
- Requires Google OAuth connection`,
    inputSchema: z.object({
      action: z.enum([
        "list_tasks",
        "get_task",
        "create_task",
        "update_task",
        "delete_task",
        "move_task",
        "clear_completed",
      ]),
      tasklistId: z
        .string()
        .optional()
        .describe("Task list ID (required for most actions)"),
      taskId: z
        .string()
        .optional()
        .describe(
          "Task ID (required for get_task, update_task, delete_task, move_task)",
        ),
      title: z
        .string()
        .optional()
        .describe(
          "Task title (required for create_task, optional for update_task)",
        ),
      notes: z.string().optional().describe("Task notes/description"),
      due: z.string().optional().describe("Due date in RFC3339 format"),
      status: z
        .enum(["needsAction", "completed"])
        .optional()
        .describe("Task status"),
      parent: z
        .string()
        .optional()
        .describe("Parent task ID for creating subtasks or moving tasks"),
      previous: z
        .string()
        .optional()
        .describe("Previous sibling task ID for ordering when moving tasks"),
      showCompleted: z
        .boolean()
        .optional()
        .describe("Include completed tasks in list"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of tasks to return"),
      dueMin: z
        .string()
        .optional()
        .describe("Minimum due date for filtering (RFC3339)"),
      dueMax: z
        .string()
        .optional()
        .describe("Maximum due date for filtering (RFC3339)"),
    }),
    execute: async ({
      action,
      tasklistId,
      taskId,
      title,
      notes,
      due,
      status,
      parent,
      previous,
      showCompleted,
      maxResults,
      dueMin,
      dueMax,
    }) => {
      const googleService = new GoogleService(userId);

      try {
        switch (action) {
          case "list_tasks": {
            if (!tasklistId) {
              return {
                error: "missing_tasklist_id",
                message: "Task list ID is required for list_tasks",
              };
            }
            const tasks = await googleService.listTasks(tasklistId, {
              showCompleted,
              maxResults,
              dueMin,
              dueMax,
            });
            return { action: "list_tasks", tasks };
          }

          case "get_task": {
            if (!tasklistId || !taskId) {
              return {
                error: "missing_params",
                message: "Task list ID and task ID are required for get_task",
              };
            }
            const task = await googleService.getTask(tasklistId, taskId);
            return { action: "get_task", task };
          }

          case "create_task": {
            if (!tasklistId || !title) {
              return {
                error: "missing_params",
                message: "Task list ID and title are required for create_task",
              };
            }
            const taskData: any = { title };
            if (notes) taskData.notes = notes;
            if (due) taskData.due = due;
            if (parent) taskData.parent = parent;

            const task = await googleService.createTask(tasklistId, taskData);
            return { action: "create_task", task };
          }

          case "update_task": {
            if (!tasklistId || !taskId) {
              return {
                error: "missing_params",
                message:
                  "Task list ID and task ID are required for update_task",
              };
            }
            const taskData: any = {};
            if (title) taskData.title = title;
            if (notes !== undefined) taskData.notes = notes;
            if (due !== undefined) taskData.due = due;
            if (status) taskData.status = status;

            const task = await googleService.updateTask(
              tasklistId,
              taskId,
              taskData,
            );
            return { action: "update_task", task };
          }

          case "delete_task": {
            if (!tasklistId || !taskId) {
              return {
                error: "missing_params",
                message:
                  "Task list ID and task ID are required for delete_task",
              };
            }
            await googleService.deleteTask(tasklistId, taskId);
            return { action: "delete_task", success: true };
          }

          case "move_task": {
            if (!tasklistId || !taskId) {
              return {
                error: "missing_params",
                message: "Task list ID and task ID are required for move_task",
              };
            }
            const task = await googleService.moveTask(tasklistId, taskId, {
              parent,
              previous,
            });
            return { action: "move_task", task };
          }

          case "clear_completed": {
            if (!tasklistId) {
              return {
                error: "missing_tasklist_id",
                message: "Task list ID is required for clear_completed",
              };
            }
            await googleService.clearCompletedTasks(tasklistId);
            return { action: "clear_completed", success: true };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Google Tasks tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Google Tasks",
        };
      }
    },
  });
