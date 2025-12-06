import { tool } from "ai";
import { z } from "zod";
import { GoogleService } from "@/lib/services/google";

type GoogleCalendarsToolProps = {
  userId: string;
};

export const googleCalendars = ({ userId }: GoogleCalendarsToolProps) =>
  tool({
    description: `Manage Google Calendars. Actions:
- "list_calendars": List all available calendars
- "get_calendar": Get specific calendar details (requires calendarId)

Best practices: Use "primary" for user's main calendar when calendar ID is unknown. Requires Google OAuth connection.`,
    inputSchema: z.object({
      action: z.enum(["list_calendars", "get_calendar"]),
      calendarId: z
        .string()
        .optional()
        .describe("Calendar ID (required for get_calendar)"),
    }),
    execute: async ({ action, calendarId }) => {
      const googleService = new GoogleService(userId);

      try {
        switch (action) {
          case "list_calendars": {
            const calendars = await googleService.listCalendars();
            return { action: "list_calendars", calendars };
          }

          case "get_calendar": {
            if (!calendarId) {
              return {
                error: "missing_calendar_id",
                message: "Calendar ID is required for get_calendar",
              };
            }
            const calendar = await googleService.getCalendar(calendarId);
            return { action: "get_calendar", calendar };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Google Calendar tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Google Calendar",
        };
      }
    },
  });
