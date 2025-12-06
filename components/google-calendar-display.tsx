"use client";

import { AlertCircle, Clock, ExternalLink, User, Users } from "lucide-react";
import { CalendarIcon } from "./icons";

interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
  accessRole?: string;
}

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus?: string;
  }[];
  status?: string;
  htmlLink?: string;
  organizer?: {
    email: string;
    displayName?: string;
  };
}

interface GoogleCalendarToolOutput {
  action?: string;
  error?: string;
  message?: string;
  success?: boolean;
  calendars?: GoogleCalendar[];
  calendar?: GoogleCalendar;
  events?: GoogleEvent[];
  event?: GoogleEvent;
  query?: string;
  createdEvent?: GoogleEvent;
  updatedEvent?: GoogleEvent;
  deletedResult?: any;
  searchResults?: {
    events?: GoogleEvent[];
    query?: string;
  };
}

// Helper function to format date/time
function formatDateTime(dateTimeStr?: string, timeZone?: string): string {
  if (!dateTimeStr) return "N/A";

  try {
    const date = new Date(dateTimeStr);
    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timeZone || "UTC",
    });
  } catch (_error) {
    return "Invalid date";
  }
}

// Helper function to format date only
function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";

  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (_error) {
    return "Invalid date";
  }
}

export function GoogleCalendarDisplay({
  data,
}: {
  data: GoogleCalendarToolOutput;
}) {
  // Not connected state
  if (data.error === "not_connected") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#4285F4]/20">
          <CalendarIcon size={24} />
        </div>
        <div>
          <p className="font-medium">Google Calendar Not Connected</p>
          <p className="text-sm text-muted-foreground">
            Connect your Google account from the user menu in the sidebar.
          </p>
        </div>
      </div>
    );
  }

  // Authentication error state
  if (data.error === "authentication_error") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
        <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/20">
          <AlertCircle className="size-6 text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">
            Google Authentication Required
          </p>
          <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
            Please reconnect your Google account to access calendar data.
          </p>
        </div>
      </div>
    );
  }

  // Permission denied state
  if (
    data.error === "permission_denied" ||
    data.error === "scope_validation_error"
  ) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 dark:bg-red-950/30">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-500/20">
          <AlertCircle className="size-6 text-red-600" />
        </div>
        <div>
          <p className="font-medium text-red-700 dark:text-red-400">
            Permission Denied
          </p>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">
            Missing required scope or permission for Google Calendar access.
          </p>
        </div>
      </div>
    );
  }

  // Calendar list display
  if (data.action === "list_calendars" && data.calendars) {
    return (
      <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <p className="mb-3 font-medium">Your Google Calendars</p>
        <div className="flex flex-col gap-2">
          {data.calendars.map((calendar) => (
            <div
              key={calendar.id}
              className="flex items-center gap-3 rounded-lg bg-white p-3 dark:bg-zinc-700"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-[#4285F4]/10">
                <CalendarIcon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {calendar.summary}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {calendar.primary ? "Primary Calendar" : calendar.accessRole}
                </p>
                {calendar.description && (
                  <p className="truncate text-xs text-muted-foreground/70">
                    {calendar.description}
                  </p>
                )}
              </div>
              {calendar.primary && (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single calendar details
  if (data.action === "get_calendar" && data.calendar) {
    const calendar = data.calendar;
    return (
      <div className="rounded-xl bg-gradient-to-br from-[#4285F4]/20 to-[#34A853]/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#4285F4]/20">
            <CalendarIcon size={24} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">{calendar.summary}</p>
            <p className="text-sm text-white/70">
              {calendar.primary ? "Primary Calendar" : calendar.accessRole}
            </p>
            {calendar.description && (
              <p className="text-xs text-white/50">{calendar.description}</p>
            )}
            {calendar.timeZone && (
              <p className="text-xs text-white/50">
                Timezone: {calendar.timeZone}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Event list display
  if (data.action === "list_events" && data.events) {
    // Handle both array format and Google API response format (with items field)
    const events: GoogleEvent[] = Array.isArray(data.events)
      ? data.events
      : (data.events as any).items || [];

    return (
      <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <div className="mb-3 flex items-center gap-2">
          <CalendarIcon size={20} />
          <p className="font-medium">Upcoming Events</p>
        </div>
        <div className="flex flex-col gap-2">
          {events.slice(0, 5).map((event: GoogleEvent) => (
            <div
              key={event.id}
              className="flex flex-col gap-2 rounded-lg bg-white p-3 dark:bg-zinc-700"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#4285F4]/10">
                  <Clock size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {event.summary}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {event.start?.dateTime ? (
                      <>
                        <span>
                          {formatDateTime(
                            event.start.dateTime,
                            event.start.timeZone,
                          )}
                        </span>
                        <span>-</span>
                        <span>
                          {formatDateTime(
                            event.end.dateTime,
                            event.end.timeZone,
                          )}
                        </span>
                      </>
                    ) : (
                      <span>{formatDate(event.start?.date)}</span>
                    )}
                  </div>
                  {event.location && (
                    <p className="truncate text-xs text-muted-foreground">
                      📍 {event.location}
                    </p>
                  )}
                </div>
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground pl-11">
                  {event.description}
                </p>
              )}
              {event.attendees && event.attendees.length > 0 && (
                <div className="flex items-center gap-1 pl-11">
                  <Users className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {event.attendees.length} attendee
                    {event.attendees.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          ))}
          {events.length > 5 && (
            <p className="text-center text-xs text-muted-foreground">
              ... and {events.length - 5} more events
            </p>
          )}
        </div>
      </div>
    );
  }

  // Single event details
  if (data.action === "get_event" && data.event) {
    const event = data.event;
    return (
      <div className="rounded-xl bg-gradient-to-br from-[#4285F4]/20 to-[#34A853]/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#4285F4]/20">
            <CalendarIcon size={24} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">{event.summary}</p>
            <div className="flex items-center gap-2 text-sm text-white/70">
              {event.start?.dateTime ? (
                <>
                  <Clock size={12} />
                  <span>
                    {formatDateTime(event.start.dateTime, event.start.timeZone)}
                  </span>
                  <span>-</span>
                  <span>
                    {formatDateTime(event.end.dateTime, event.end.timeZone)}
                  </span>
                </>
              ) : (
                <>
                  <CalendarIcon size={12} />
                  <span>{formatDate(event.start?.date)}</span>
                </>
              )}
            </div>
            {event.location && (
              <p className="text-xs text-white/50">📍 {event.location}</p>
            )}
          </div>
        </div>

        {event.description && (
          <div className="mt-3 rounded-lg bg-white/10 p-3 text-sm text-white/80">
            <p>{event.description}</p>
          </div>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {event.attendees.slice(0, 3).map((attendee, index) => (
              <div
                key={`${event.id}-${index}`}
                className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs text-white/70"
              >
                <User className="size-3" />
                <span>
                  {attendee.displayName || attendee.email.split("@")[0]}
                </span>
              </div>
            ))}
            {event.attendees.length > 3 && (
              <span className="text-xs text-white/50">
                +{event.attendees.length - 3} more
              </span>
            )}
          </div>
        )}

        {event.htmlLink && (
          <div className="mt-3">
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full bg-[#4285F4] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#3367D6] transition-colors"
            >
              <ExternalLink className="size-3" />
              View in Google Calendar
            </a>
          </div>
        )}
      </div>
    );
  }

  // Event created
  if (data.action === "create_event" && data.createdEvent) {
    const event = data.createdEvent;
    return (
      <div className="flex items-center gap-3 rounded-xl bg-[#4285F4]/10 p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-[#4285F4]/20">
          <CalendarIcon size={20} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-[#4285F4]">
            Event Created Successfully
          </p>
          <p className="text-sm text-muted-foreground">{event.summary}</p>
          <div className="text-xs text-muted-foreground">
            {event.start?.dateTime ? (
              <>
                <span>
                  {formatDateTime(event.start.dateTime, event.start.timeZone)}
                </span>
                <span> - </span>
                <span>
                  {formatDateTime(event.end.dateTime, event.end.timeZone)}
                </span>
              </>
            ) : (
              <span>{formatDate(event.start?.date)}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Event updated
  if (data.action === "update_event" && data.updatedEvent) {
    const event = data.updatedEvent;
    return (
      <div className="flex items-center gap-3 rounded-xl bg-[#34A853]/10 p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-[#34A853]/20">
          <CalendarIcon size={20} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-[#34A853]">
            Event Updated Successfully
          </p>
          <p className="text-sm text-muted-foreground">{event.summary}</p>
        </div>
      </div>
    );
  }

  // Event deleted
  if (data.action === "delete_event" && data.deletedResult) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-red-600 dark:text-red-400">
        <span>✓ Event deleted successfully</span>
      </div>
    );
  }

  // Success states
  if (data.success) {
    const actionMessages: Record<string, string> = {
      create_event: "✓ Event created",
      update_event: "✓ Event updated",
      delete_event: "✓ Event deleted",
      list_calendars: "✓ Calendars listed",
      list_events: "✓ Events listed",
    };
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[#4285F4]/10 px-3 py-2 text-[#4285F4]">
        <span>{actionMessages[data.action || ""] || "✓ Success"}</span>
      </div>
    );
  }

  // Generic error
  if (data.error) {
    return (
      <div className="rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-950/30 dark:text-red-400">
        {data.message || "An error occurred with Google Calendar"}
      </div>
    );
  }

  // Fallback: JSON display
  return (
    <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
