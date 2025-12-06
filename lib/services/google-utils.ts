import { GoogleService } from "./google";

/**
 * Google Calendar Utility Functions - Common Usage Patterns
 *
 * This module provides higher-level utility functions that implement
 * the best practices described in the documentation:
 * - Time Zone Handling: Always specify time zones for timed events
 * - Recurring Events: Use recurrence field for repeating events
 * - Attendees: Include email addresses for proper notifications
 * - Reminders: Configure appropriate reminders for important events
 * - Performance: Use pagination and caching for large result sets
 * - Security: Ensure proper OAuth scopes and token management
 *
 * These functions follow the same pattern as the Spotify integration.
 */

export class GoogleCalendarUtils {
  constructor(private googleService: GoogleService) {}

  /**
   * List all events on primary calendar for today
   * @returns Promise with today's events
   */
  async listTodaysEvents() {
    const today = new Date();
    const todayStart = today.toISOString();
    const todayEnd = new Date(
      today.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();

    return this.googleService.listEvents("primary", {
      timeMin: todayStart,
      timeMax: todayEnd,
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
    });
  }

  /**
   * Search for events by query with pagination support
   * @param query Search query string
   * @param maxResults Maximum number of results to return
   * @param pageToken Pagination token for large result sets
   * @returns Promise with matching events
   */
  async searchEvents(
    query: string,
    maxResults: number = 20,
    pageToken?: string,
  ) {
    const params: any = {
      q: query,
      maxResults: maxResults,
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    return this.googleService.listEvents("primary", params);
  }

  /**
   * Create a meeting with full event details following best practices
   * - Time Zone Handling: Always specify time zones
   * - Attendees: Include email addresses for notifications
   * - Reminders: Configure appropriate reminders
   * @param eventData Complete event data
   * @returns Promise with created event
   */
  async createMeeting(eventData: {
    summary: string;
    description?: string;
    location?: string;
    start: {
      dateTime: string;
      timeZone: string;
    };
    end: {
      dateTime: string;
      timeZone: string;
    };
    attendees?: {
      email: string;
      displayName?: string;
    }[];
    reminders?: {
      useDefault?: boolean;
      overrides?: {
        method: string;
        minutes: number;
      }[];
    };
  }) {
    return this.googleService.createEvent("primary", eventData);
  }

  /**
   * Create a simple event with minimal required fields
   * @param title Event title/summary
   * @param startTime ISO date string for start time
   * @param endTime ISO date string for end time
   * @param timeZone Time zone for the event
   * @returns Promise with created event
   */
  async createSimpleEvent(
    title: string,
    startTime: string,
    endTime: string,
    timeZone: string = "Europe/Berlin",
  ) {
    return this.googleService.createEvent("primary", {
      summary: title,
      start: {
        dateTime: startTime,
        timeZone: timeZone,
      },
      end: {
        dateTime: endTime,
        timeZone: timeZone,
      },
    });
  }

  /**
   * Create a recurring event with proper recurrence rules
   * @param eventData Event data with recurrence rules
   * @returns Promise with created event
   */
  async createRecurringEvent(eventData: {
    summary: string;
    description?: string;
    start: {
      dateTime: string;
      timeZone: string;
    };
    end: {
      dateTime: string;
      timeZone: string;
    };
    recurrence: string[];
    attendees?: {
      email: string;
      displayName?: string;
    }[];
    reminders?: {
      useDefault?: boolean;
      overrides?: {
        method: string;
        minutes: number;
      }[];
    };
  }) {
    return this.googleService.createRecurringEvent("primary", eventData);
  }

  /**
   * Create an event with attendees and reminders
   * @param eventData Event data with attendees and reminders
   * @returns Promise with created event
   */
  async createEventWithAttendeesAndReminders(eventData: {
    summary: string;
    description?: string;
    start: {
      dateTime: string;
      timeZone: string;
    };
    end: {
      dateTime: string;
      timeZone: string;
    };
    attendees: {
      email: string;
      displayName?: string;
    }[];
    reminders?: {
      useDefault?: boolean;
      overrides?: {
        method: string;
        minutes: number;
      }[];
    };
  }) {
    return this.googleService.createEventWithAttendeesAndReminders(
      "primary",
      eventData,
    );
  }

  /**
   * Batch create multiple events with error handling
   * @param events Array of event data
   * @returns Promise with array of created events or errors
   */
  async batchCreateEvents(events: any[]) {
    return this.googleService.batchCreateEvents("primary", events);
  }

  /**
   * Get all calendar IDs with caching support
   * @returns Promise with array of calendar IDs
   */
  async getAllCalendarIds(): Promise<string[]> {
    try {
      const calendars = await this.googleService.listCalendars();
      return calendars.items.map((calendar: any) => calendar.id);
    } catch (error: any) {
      // Handle authentication errors specifically
      if (error.status === 401 || error.status === 403) {
        throw new Error(
          "Google authentication failed. Please reconnect your Google account.",
        );
      }
      throw new Error(`Failed to get calendar IDs: ${error.message}`);
    }
  }

  /**
   * Get primary calendar ID
   * @returns Primary calendar ID ("primary")
   */
  getPrimaryCalendarId(): string {
    return this.googleService.getPrimaryCalendarId();
  }

  /**
   * Check if user has access to a specific calendar
   * @param calendarId Calendar ID to check
   * @returns Promise with boolean indicating access
   */
  async checkCalendarAccess(calendarId: string): Promise<boolean> {
    return this.googleService.checkCalendarAccess(calendarId);
  }

  /**
   * Get calendar details by ID with error handling
   * @param calendarId Calendar ID to get details for
   * @returns Promise with calendar details
   */
  async getCalendarDetails(calendarId: string): Promise<any> {
    try {
      return await this.googleService.getCalendarDetails(calendarId);
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Calendar with ID "${calendarId}" not found`);
      }
      if (error.status === 401 || error.status === 403) {
        throw new Error(
          "Google authentication failed. Please reconnect your Google account.",
        );
      }
      throw new Error(`Failed to get calendar details: ${error.message}`);
    }
  }
}

/**
 * Factory function to create GoogleCalendarUtils instance
 * @param connection OAuth connection for Google
 * @returns GoogleCalendarUtils instance
 */
export function createGoogleCalendarUtils(userId: string) {
  const googleService = new GoogleService(userId);
  return new GoogleCalendarUtils(googleService);
}

/**
 * Calendar ID Management Utility Functions
 * These functions follow the same pattern as the Spotify integration
 */
export class CalendarIdManager {
  constructor(private googleService: GoogleService) {}

  /**
   * Get all calendar IDs for the user
   * @returns Promise with array of calendar IDs
   */
  async getAllCalendarIds(): Promise<string[]> {
    try {
      const calendars = await this.googleService.listCalendars();
      return calendars.items.map((calendar: any) => calendar.id);
    } catch (error: any) {
      // Handle authentication errors specifically
      if (error.status === 401 || error.status === 403) {
        throw new Error(
          "Google authentication failed. Please reconnect your Google account.",
        );
      }
      throw new Error(`Failed to get calendar IDs: ${error.message}`);
    }
  }

  /**
   * Get primary calendar ID
   * @returns Primary calendar ID ("primary")
   */
  getPrimaryCalendarId(): string {
    return "primary";
  }

  /**
   * Get secondary calendar IDs (excluding primary)
   * @returns Promise with array of secondary calendar IDs
   */
  async getSecondaryCalendarIds(): Promise<string[]> {
    const allCalendarIds = await this.getAllCalendarIds();
    return allCalendarIds.filter((id) => id !== "primary");
  }

  /**
   * Check if a calendar ID is the primary calendar
   * @param calendarId Calendar ID to check
   * @returns True if it's the primary calendar
   */
  isPrimaryCalendar(calendarId: string): boolean {
    return calendarId === "primary";
  }

  /**
   * Get calendar details by ID
   * @param calendarId Calendar ID to get details for
   * @returns Promise with calendar details
   */
  async getCalendarDetails(calendarId: string): Promise<any> {
    try {
      return await this.googleService.getCalendar(calendarId);
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Calendar with ID "${calendarId}" not found`);
      }
      if (error.status === 401 || error.status === 403) {
        throw new Error(
          "Google authentication failed. Please reconnect your Google account.",
        );
      }
      throw new Error(`Failed to get calendar details: ${error.message}`);
    }
  }
}

/**
 * Factory function to create CalendarIdManager instance
 * @param connection OAuth connection for Google
 * @returns CalendarIdManager instance
 */
export function createCalendarIdManager(userId: string) {
  const googleService = new GoogleService(userId);
  return new CalendarIdManager(googleService);
}
