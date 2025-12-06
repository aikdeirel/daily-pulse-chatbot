import { tool } from "ai";
import { z } from "zod";
import { GoogleService } from "@/lib/services/google";

type GoogleEventsToolProps = {
  userId: string;
};

export const googleEvents = ({ userId }: GoogleEventsToolProps) =>
  tool({
    description: `Manage Google Calendar events. Actions:
  - "list_events": List events (requires calendarId; optional: timeMin, timeMax, maxResults, q)
  - "get_event": Get event details (requires calendarId, eventId)
  - "create_event": Create event (requires calendarId, eventData with summary/start/end; include timeZone in start/end)
  - "update_event": Update event (requires calendarId, eventId, eventData)
  - "delete_event": Delete event (requires calendarId, eventId)
  
  Important Notes:
  - The 'q' parameter in list_events is for TEXT SEARCH only (searches in summary, description, location, etc.)
  - For DATE-BASED filtering, use timeMin/timeMax parameters with RFC3339 timestamps
  - Always specify calendarId (use "primary" when in doubt), include timeZone in all timed events, validate eventData (summary/start/end required). Requires Google OAuth connection.`,
    inputSchema: z.object({
      action: z.enum([
        "list_events",
        "get_event",
        "create_event",
        "update_event",
        "delete_event",
      ]),
      calendarId: z
        .string()
        .optional()
        .describe(
          "Calendar ID (required for most actions, defaults to 'primary')",
        ),
      eventId: z
        .string()
        .optional()
        .describe(
          "Event ID (required for get_event, update_event, delete_event)",
        ),
      eventData: z
        .any()
        .optional()
        .describe("Event data (required for create_event, update_event)"),
      query: z
        .string()
        .optional()
        .describe("Search query for text search in list_events"),
      timeMin: z
        .string()
        .optional()
        .describe("Minimum time for list_events (RFC3339 timestamp)"),
      timeMax: z
        .string()
        .optional()
        .describe("Maximum time for list_events (RFC3339 timestamp)"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return"),
    }),
    execute: async ({
      action,
      calendarId,
      eventId,
      eventData,
      query,
      timeMin,
      timeMax,
      maxResults,
    }) => {
      const googleService = new GoogleService(userId);

      try {
        switch (action) {
          case "list_events": {
            if (!calendarId) {
              return {
                error: "missing_calendar_id",
                message: "Calendar ID is required for list_events",
              };
            }
            const events = await googleService.listEvents(calendarId, {
              timeMin,
              timeMax,
              maxResults,
              q: query,
            });
            return { action: "list_events", events };
          }

          case "get_event": {
            if (!calendarId || !eventId) {
              return {
                error: "missing_params",
                message: "Calendar ID and Event ID are required for get_event",
              };
            }
            const event = await googleService.getEvent(calendarId, eventId);
            return { action: "get_event", event };
          }

          case "create_event": {
            if (!calendarId || !eventData) {
              return {
                error: "missing_params",
                message:
                  "Calendar ID and Event Data are required for create_event",
              };
            }
            const createdEvent = await googleService.createEvent(
              calendarId,
              eventData,
            );
            return { action: "create_event", createdEvent };
          }

          case "update_event": {
            if (!calendarId || !eventId || !eventData) {
              return {
                error: "missing_params",
                message:
                  "Calendar ID, Event ID, and Event Data are required for update_event",
              };
            }
            const updatedEvent = await googleService.updateEvent(
              calendarId,
              eventId,
              eventData,
            );
            return { action: "update_event", updatedEvent };
          }

          case "delete_event": {
            if (!calendarId || !eventId) {
              return {
                error: "missing_params",
                message:
                  "Calendar ID and Event ID are required for delete_event",
              };
            }
            const deletedResult = await googleService.deleteEvent(
              calendarId,
              eventId,
            );
            return { action: "delete_event", deletedResult };
          }

          default:
            return {
              error: "unknown_action",
              message: `Unknown action: ${action}`,
            };
        }
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Google Events tool error:", error.message);
        }
        return {
          error: "api_error",
          message: error?.message || "An error occurred with Google Calendar",
        };
      }
    },
  });
