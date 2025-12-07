/**
 * Centralized Google Tools UI Configuration
 *
 * This module provides a single source of truth for all Google tool display
 * configurations, including:
 * - Tool types and their identifiers
 * - Default labels, colors, and descriptions
 * - Action-specific titles and descriptions
 *
 * Used by both components/elements/tool.tsx and components/message.tsx
 */

// Google tool type names (matching the tool definitions)
export const GOOGLE_TOOL_TYPES = [
  "tool-googleCalendars",
  "tool-googleEvents",
  "tool-gmailMessages",
  "tool-gmailLabels",
] as const;

export type GoogleToolType = (typeof GOOGLE_TOOL_TYPES)[number];

// Action configuration with title and description
type ActionConfig = {
  title: string;
  description: string;
};

// Complete tool UI configuration
type GoogleToolUIConfig = {
  label: string;
  color: string;
  defaultTitle: string;
  defaultDescription: string;
  actions: Record<string, ActionConfig>;
};

// Google brand color
const GOOGLE_COLOR = "text-[#4285F4] dark:text-[#4285F4]";

/**
 * Centralized configuration for all Google tools.
 * Each tool has:
 * - label: The tool's display name
 * - color: Tailwind CSS classes for the tool's brand color
 * - defaultTitle: Default title when no action is specified
 * - defaultDescription: Default description when no action is specified
 * - actions: Map of action names to their specific title/description
 */
export const googleToolUIConfig: Record<GoogleToolType, GoogleToolUIConfig> = {
  "tool-googleCalendars": {
    label: "Google Calendar",
    color: GOOGLE_COLOR,
    defaultTitle: "Google Calendar",
    defaultDescription: "Managing calendars",
    actions: {
      list_calendars: {
        title: "Listing calendars",
        description: "Fetching calendar list",
      },
      get_calendar: {
        title: "Getting calendar details",
        description: "Fetching calendar details",
      },
    },
  },
  "tool-googleEvents": {
    label: "Google Events",
    color: GOOGLE_COLOR,
    defaultTitle: "Google Events",
    defaultDescription: "Managing events",
    actions: {
      list_events: { title: "Listing events", description: "Fetching events" },
      create_event: {
        title: "Creating event",
        description: "Creating calendar event",
      },
      update_event: {
        title: "Updating event",
        description: "Updating event details",
      },
      delete_event: { title: "Deleting event", description: "Removing event" },
    },
  },
  "tool-gmailMessages": {
    label: "Gmail",
    color: GOOGLE_COLOR,
    defaultTitle: "Gmail",
    defaultDescription: "Managing messages",
    actions: {
      list_messages: {
        title: "Listing messages",
        description: "Fetching email messages",
      },
      get_message: {
        title: "Getting message",
        description: "Fetching message details",
      },
      mark_read: {
        title: "Marking as read",
        description: "Marking message as read",
      },
      mark_unread: {
        title: "Marking as unread",
        description: "Marking message as unread",
      },
      trash_message: {
        title: "Moving to trash",
        description: "Trashing message",
      },
      untrash_message: {
        title: "Restoring message",
        description: "Untrashing message",
      },
    },
  },
  "tool-gmailLabels": {
    label: "Gmail Labels",
    color: GOOGLE_COLOR,
    defaultTitle: "Gmail Labels",
    defaultDescription: "Managing labels",
    actions: {
      list_labels: {
        title: "Listing labels",
        description: "Fetching email labels",
      },
      get_label: {
        title: "Getting label",
        description: "Fetching label details",
      },
      create_label: {
        title: "Creating label",
        description: "Creating new label",
      },
      update_label: {
        title: "Updating label",
        description: "Updating label details",
      },
      delete_label: {
        title: "Deleting label",
        description: "Removing label",
      },
      add_label_to_message: {
        title: "Adding label",
        description: "Adding label to message",
      },
      remove_label_from_message: {
        title: "Removing label",
        description: "Removing label from message",
      },
      batch_add_labels: {
        title: "Adding labels",
        description: "Adding labels to messages",
      },
      batch_remove_labels: {
        title: "Removing labels",
        description: "Removing labels from messages",
      },
    },
  },
};

/**
 * Result type for getGoogleToolDisplay function
 */
export type GoogleToolDisplayInfo = {
  title: string;
  description: string;
  label: string;
  color: string;
};

/**
 * Get the display information for a Google tool based on its type and action.
 *
 * @param toolType - The tool type (e.g., "tool-googleCalendars")
 * @param action - Optional action name (e.g., "list_calendars")
 * @returns Display information including title, description, label, and color
 */
export function getGoogleToolDisplay(
  toolType: string,
  action?: string,
): GoogleToolDisplayInfo {
  const config = googleToolUIConfig[toolType as GoogleToolType];

  if (!config) {
    return {
      title: "Google",
      description: "Processing",
      label: "Google",
      color: GOOGLE_COLOR,
    };
  }

  const actionConfig = action ? config.actions[action] : null;

  return {
    title: actionConfig?.title || config.defaultTitle,
    description: actionConfig?.description || config.defaultDescription,
    label: config.label,
    color: config.color,
  };
}

/**
 * Check if a tool type is a Google tool
 *
 * @param toolType - The tool type to check
 * @returns True if the tool is a Google tool
 */
export function isGoogleTool(toolType: string): toolType is GoogleToolType {
  return GOOGLE_TOOL_TYPES.includes(toolType as GoogleToolType);
}

/**
 * Get the base configuration for a Google tool (used by tool.tsx for toolConfigData)
 *
 * @param toolType - The tool type
 * @returns Object with label, color, and description
 */
export function getGoogleToolBaseConfig(toolType: string): {
  label: string;
  color: string;
  description: string;
} {
  const config = googleToolUIConfig[toolType as GoogleToolType];

  if (!config) {
    return {
      label: "Google",
      color: GOOGLE_COLOR,
      description: "Processing",
    };
  }

  return {
    label: config.label,
    color: config.color,
    description: config.defaultDescription,
  };
}
