import { getOAuthConnection, saveOAuthConnection } from "@/lib/db/queries";
import { APILogger } from "@/lib/utils/api-logger";

export interface GoogleEvent {
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
  reminders?: {
    useDefault?: boolean;
    overrides?: {
      method: string;
      minutes: number;
    }[];
  };
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  organizer?: {
    email: string;
    displayName?: string;
  };
  recurrence?: string[];
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
  accessRole?: string;
}

export class GoogleService {
  constructor(private userId: string) {}

  // Token management with auto-refresh
  private async getAccessToken(): Promise<string> {
    const connection = await getOAuthConnection(this.userId, "google");

    if (!connection) {
      throw new Error("Google not connected");
    }

    // Check if token needs refresh (5-minute buffer)
    // Handle case where expiresAt might be null
    if (
      connection.expiresAt &&
      new Date() < new Date(connection.expiresAt.getTime() - 5 * 60 * 1000)
    ) {
      return connection.accessToken;
    }

    // Check if we have a refresh token
    if (!connection.refreshToken) {
      throw new Error("No refresh token available");
    }

    // Refresh token
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", connection.refreshToken);
    if (process.env.GOOGLE_CLIENT_ID) {
      params.append("client_id", process.env.GOOGLE_CLIENT_ID);
    }
    if (process.env.GOOGLE_CLIENT_SECRET) {
      params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET);
    }

    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!refreshResponse.ok) {
      throw new Error("Failed to refresh Google access token");
    }

    const tokens = await refreshResponse.json();

    // Update database with new tokens
    await saveOAuthConnection({
      userId: this.userId,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || connection.refreshToken,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: connection.scopes || undefined,
    });

    return tokens.access_token;
  }

  // Base API request method
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const startTime = Date.now();

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3${endpoint}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: data ? JSON.stringify(data) : undefined,
        },
      );

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.json();
        const errorMessage =
          error.error?.message || "Google API request failed";
        const statusError = new Error(errorMessage);
        (statusError as any).status = response.status;
        (statusError as any).errorType = error.error?.code || "api_error";

        // Log API errors
        APILogger.logError("Google", method, endpoint, statusError, data);

        throw statusError;
      }

      const responseData = await response.json();

      // Log successful API requests
      APILogger.logRequest(
        "Google",
        method,
        endpoint,
        data,
        responseData,
        response.status,
        durationMs,
      );

      return responseData;
    } catch (error) {
      // Log any unexpected errors
      if (error instanceof Error) {
        APILogger.logError("Google", method, endpoint, error, data);
      }
      throw error;
    }
  }

  // Calendar methods
  async listCalendars() {
    return this.request<any>("GET", "/users/me/calendarList");
  }

  async getCalendar(calendarId: string) {
    return this.request<any>("GET", `/calendars/${calendarId}`);
  }

  // Event methods
  async listEvents(
    calendarId: string,
    params: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      q?: string; // TEXT SEARCH ONLY - searches in summary, description, location, etc. NOT for date queries
      singleEvents?: boolean;
      orderBy?: string;
    } = {},
  ) {
    const query = new URLSearchParams();
    if (params.timeMin) query.append("timeMin", params.timeMin);
    if (params.timeMax) query.append("timeMax", params.timeMax);
    if (params.maxResults)
      query.append("maxResults", params.maxResults.toString());
    if (params.q) query.append("q", params.q);
    if (params.singleEvents !== undefined)
      query.append("singleEvents", params.singleEvents.toString());
    if (params.orderBy) query.append("orderBy", params.orderBy);

    return this.request<any>(
      "GET",
      `/calendars/${calendarId}/events?${query.toString()}`,
    );
  }

  async getEvent(calendarId: string, eventId: string) {
    return this.request<any>(
      "GET",
      `/calendars/${calendarId}/events/${eventId}`,
    );
  }

  async createEvent(calendarId: string, eventData: any) {
    // Validate required fields for event creation
    if (!eventData.summary) {
      throw new Error("Event summary is required");
    }

    if (!eventData.start || !eventData.end) {
      throw new Error("Event start and end times are required");
    }

    // Ensure time zones are specified for timed events
    if (eventData.start.dateTime && !eventData.start.timeZone) {
      eventData.start.timeZone = "Europe/Berlin"; // Default timezone
    }

    if (eventData.end.dateTime && !eventData.end.timeZone) {
      eventData.end.timeZone = "Europe/Berlin"; // Default timezone
    }

    return this.request<any>(
      "POST",
      `/calendars/${calendarId}/events`,
      eventData,
    );
  }

  async updateEvent(calendarId: string, eventId: string, eventData: any) {
    // Validate required fields for event update
    if (!eventData.summary) {
      throw new Error("Event summary is required");
    }

    if (!eventData.start || !eventData.end) {
      throw new Error("Event start and end times are required");
    }

    // Ensure time zones are specified for timed events
    if (eventData.start.dateTime && !eventData.start.timeZone) {
      eventData.start.timeZone = "Europe/Berlin"; // Default timezone
    }

    if (eventData.end.dateTime && !eventData.end.timeZone) {
      eventData.end.timeZone = "Europe/Berlin"; // Default timezone
    }

    return this.request<any>(
      "PUT",
      `/calendars/${calendarId}/events/${eventId}`,
      eventData,
    );
  }

  async deleteEvent(calendarId: string, eventId: string) {
    return this.request<any>(
      "DELETE",
      `/calendars/${calendarId}/events/${eventId}`,
    );
  }

  /**
   * Handle API errors and return appropriate error responses
   * @param error Error object
   * @returns Formatted error response
   */
  handleApiError(error: any): {
    success: false;
    error: string;
    message: string;
    status?: number;
    details?: any;
  } {
    // Handle authentication errors (401 Unauthorized, 403 Forbidden)
    if (error.status === 401 || error.status === 403) {
      return {
        success: false,
        error: "authentication_error",
        message:
          "Google authentication failed. Please reconnect your Google account.",
        status: error.status,
      };
    }

    // Handle not found errors (404)
    if (error.status === 404) {
      return {
        success: false,
        error: "not_found",
        message: "The requested calendar or event was not found.",
        status: error.status,
      };
    }

    // Handle bad request errors (400)
    if (error.status === 400) {
      return {
        success: false,
        error: "bad_request",
        message: "Invalid request parameters.",
        status: error.status,
      };
    }

    // Handle rate limit errors (429)
    if (error.status === 429) {
      return {
        success: false,
        error: "rate_limit",
        message: "Google API rate limit exceeded. Please try again later.",
        status: error.status,
      };
    }

    // Handle permission denied errors (403 with specific error type)
    if (
      error.errorType === "permission_denied" ||
      error.message?.includes("permission")
    ) {
      return {
        success: false,
        error: "permission_denied",
        message:
          "Missing required scope or permission. Please disconnect and reconnect with proper scopes.",
        status: error.status || 403,
      };
    }

    // Handle invalid calendar ID errors
    if (
      error.errorType === "invalid_calendar_id" ||
      error.message?.includes("calendar")
    ) {
      return {
        success: false,
        error: "invalid_calendar",
        message: "Invalid calendar ID. Please verify the calendar ID exists.",
        status: error.status || 400,
      };
    }

    // Handle invalid event data errors
    if (
      error.errorType === "invalid_event" ||
      error.message?.includes("event")
    ) {
      return {
        success: false,
        error: "invalid_event",
        message:
          "Invalid event data format. Please check the event data and try again.",
        status: error.status || 400,
      };
    }

    // Handle user not connected errors
    if (
      error.message?.includes("not connected") ||
      error.message?.includes("No refresh token")
    ) {
      return {
        success: false,
        error: "not_connected",
        message:
          "User not connected to Google Calendar. Please connect your Google account.",
        status: error.status || 401,
      };
    }

    // Handle scope validation errors
    if (
      error.message?.includes("scope") ||
      error.message?.includes("insufficient permissions")
    ) {
      return {
        success: false,
        error: "scope_validation_error",
        message:
          "Insufficient permissions. Please disconnect and reconnect with proper scopes.",
        status: error.status || 403,
      };
    }

    // Handle token management errors
    if (
      error.message?.includes("token") ||
      error.message?.includes("expired")
    ) {
      return {
        success: false,
        error: "token_management_error",
        message:
          "Token expired or invalid. Please reconnect your Google account.",
        status: error.status || 401,
      };
    }

    // Handle user privacy errors
    if (
      error.message?.includes("privacy") ||
      error.message?.includes("access denied")
    ) {
      return {
        success: false,
        error: "privacy_error",
        message:
          "Access denied due to privacy restrictions. Please verify you have access to this calendar.",
        status: error.status || 403,
      };
    }

    // Default error handling
    return {
      success: false,
      error: "api_error",
      message: error.message || "Google API request failed",
      status: error.status,
      details: error.error || error.details,
    };
  }

  /**
   * Enhanced error handling for API requests with Google Calendar error format
   */
  handleGoogleCalendarError(error: any): {
    error: {
      code: number;
      message: string;
      status: string;
      details: {
        "@type": string;
        reason: string;
        domain: string;
        metadata: {
          service: string;
        };
      }[];
    };
  } {
    const statusCode = error.status || 500;
    const errorMessage = error.message || "Google Calendar API request failed";
    const errorStatus = this.getErrorStatus(statusCode);

    return {
      error: {
        code: statusCode,
        message: errorMessage,
        status: errorStatus,
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
            reason: this.getErrorReason(error),
            domain: "googleapis.com",
            metadata: {
              service: "calendar.googleapis.com",
            },
          },
        ],
      },
    };
  }

  /**
   * Get error status based on HTTP status code
   */
  private getErrorStatus(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return "INVALID_ARGUMENT";
      case 401:
        return "UNAUTHENTICATED";
      case 403:
        return "PERMISSION_DENIED";
      case 404:
        return "NOT_FOUND";
      case 429:
        return "RESOURCE_EXHAUSTED";
      case 500:
        return "INTERNAL";
      default:
        return "UNKNOWN";
    }
  }

  /**
   * Get error reason based on error type
   */
  private getErrorReason(error: any): string {
    if (
      error.errorType === "invalid_calendar_id" ||
      error.message?.includes("calendar")
    ) {
      return "INVALID_CALENDAR_ID";
    }
    if (
      error.errorType === "invalid_event" ||
      error.message?.includes("event")
    ) {
      return "INVALID_EVENT_DATA";
    }
    if (
      error.errorType === "permission_denied" ||
      error.message?.includes("permission")
    ) {
      return "MISSING_SCOPE";
    }
    if (error.status === 401 || error.status === 403) {
      return "AUTHENTICATION_FAILED";
    }
    if (error.status === 429) {
      return "RATE_LIMIT_EXCEEDED";
    }
    if (
      error.message?.includes("scope") ||
      error.message?.includes("insufficient permissions")
    ) {
      return "SCOPE_VALIDATION_ERROR";
    }
    if (
      error.message?.includes("token") ||
      error.message?.includes("expired")
    ) {
      return "TOKEN_MANAGEMENT_ERROR";
    }
    if (
      error.message?.includes("privacy") ||
      error.message?.includes("access denied")
    ) {
      return "PRIVACY_ERROR";
    }
    return "API_ERROR";
  }

  /**
   * Get calendar details by ID
   * @param calendarId Calendar ID
   * @returns Promise with calendar details
   */
  async getCalendarDetails(calendarId: string): Promise<GoogleCalendar> {
    return this.request<GoogleCalendar>("GET", `/calendars/${calendarId}`);
  }

  /**
   * List all calendars with pagination support
   * @param params Pagination parameters
   * @returns Promise with calendar list
   */
  async listCalendarsWithPagination(
    params: { maxResults?: number; pageToken?: string } = {},
  ) {
    const query = new URLSearchParams();
    if (params.maxResults)
      query.append("maxResults", params.maxResults.toString());
    if (params.pageToken) query.append("pageToken", params.pageToken);

    return this.request<any>(
      "GET",
      `/users/me/calendarList?${query.toString()}`,
    );
  }

  /**
   * Create a recurring event with proper recurrence rules
   * @param calendarId Calendar ID
   * @param eventData Event data with recurrence
   * @returns Promise with created event
   */
  async createRecurringEvent(calendarId: string, eventData: any) {
    // Validate recurrence rules
    if (eventData.recurrence && !Array.isArray(eventData.recurrence)) {
      throw new Error("Recurrence rules must be an array");
    }

    // Ensure time zones are specified for recurring events
    if (eventData.start.dateTime && !eventData.start.timeZone) {
      eventData.start.timeZone = "Europe/Berlin";
    }

    if (eventData.end.dateTime && !eventData.end.timeZone) {
      eventData.end.timeZone = "Europe/Berlin";
    }

    return this.request<any>(
      "POST",
      `/calendars/${calendarId}/events`,
      eventData,
    );
  }

  /**
   * Create an event with attendees and reminders
   * @param calendarId Calendar ID
   * @param eventData Event data with attendees and reminders
   * @returns Promise with created event
   */
  async createEventWithAttendeesAndReminders(
    calendarId: string,
    eventData: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      attendees?: { email: string; displayName?: string }[];
      reminders?: {
        useDefault?: boolean;
        overrides?: { method: string; minutes: number }[];
      };
    },
  ) {
    // Validate attendees
    if (eventData.attendees) {
      for (const attendee of eventData.attendees) {
        if (!attendee.email) {
          throw new Error("Attendee email is required");
        }
      }
    }

    // Validate reminders
    if (eventData.reminders?.overrides) {
      for (const reminder of eventData.reminders.overrides) {
        if (!reminder.method || !reminder.minutes) {
          throw new Error("Reminder method and minutes are required");
        }
      }
    }

    return this.request<any>(
      "POST",
      `/calendars/${calendarId}/events`,
      eventData,
    );
  }

  /**
   * Batch create multiple events
   * @param calendarId Calendar ID
   * @param events Array of event data
   * @returns Promise with array of created events
   */
  async batchCreateEvents(calendarId: string, events: any[]) {
    if (!events || events.length === 0) {
      throw new Error("At least one event is required for batch operation");
    }

    // Validate all events
    for (const event of events) {
      if (!event.summary) {
        throw new Error("Event summary is required for all events");
      }
      if (!event.start || !event.end) {
        throw new Error(
          "Event start and end times are required for all events",
        );
      }
    }

    // Note: Google Calendar API doesn't support true batch operations,
    // but we can implement sequential creation with error handling
    const results = [];
    for (const event of events) {
      try {
        const createdEvent = await this.createEvent(calendarId, event);
        results.push(createdEvent);
      } catch (error) {
        // Continue with other events even if one fails
        console.error(`Failed to create event: ${event.summary}`, error);
        results.push({
          error: "creation_failed",
          event: event.summary,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Get user's primary calendar ID
   * @returns Primary calendar ID
   */
  getPrimaryCalendarId(): string {
    return "primary";
  }

  /**
   * Check if user has access to a specific calendar
   * @param calendarId Calendar ID to check
   * @returns Promise with boolean indicating access
   */
  async checkCalendarAccess(calendarId: string): Promise<boolean> {
    try {
      await this.getCalendarDetails(calendarId);
      return true;
    } catch (error: any) {
      if (error.status === 404 || error.status === 403) {
        return false;
      }
      throw error;
    }
  }
}
