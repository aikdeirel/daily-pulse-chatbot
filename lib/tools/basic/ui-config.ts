// lib/tools/basic/ui-config.ts
export const BASIC_TOOL_TYPES = [
  "tool-getWeather",
  "tool-createDocument",
  "tool-updateDocument",
  "tool-requestSuggestions",
  "tool-useSkill",
  "tool-getSkillResource",
  "tool-webFetch",
  "tool-setTimer",
] as const;

export type BasicToolType = (typeof BASIC_TOOL_TYPES)[number];

// Action configuration with title and description
type ActionConfig = {
  title: string;
  description: string;
};

// Complete tool UI configuration
type BasicToolUIConfig = {
  label: string;
  color: string;
  defaultDescription: string;
  icon: string;
  defaultOpen?: boolean;
  actions: Record<string, ActionConfig>;
};

export const basicToolUIConfig: Record<BasicToolType, BasicToolUIConfig> = {
  "tool-getWeather": {
    label: "Weather",
    color: "text-amber-600 dark:text-amber-400",
    defaultDescription: "Fetching weather data",
    icon: "CloudIcon",
    defaultOpen: true,
    actions: {},
  },
  "tool-createDocument": {
    label: "Create Document",
    color: "text-emerald-600 dark:text-emerald-400",
    defaultDescription: "Creating a new document",
    icon: "FileTextIcon",
    actions: {},
  },
  "tool-updateDocument": {
    label: "Update Document",
    color: "text-blue-600 dark:text-blue-400",
    defaultDescription: "Updating document",
    icon: "FileEditIcon",
    actions: {},
  },
  "tool-requestSuggestions": {
    label: "Request Suggestions",
    color: "text-purple-600 dark:text-purple-400",
    defaultDescription: "Requesting suggestions",
    icon: "LightbulbIcon",
    actions: {},
  },
  "tool-useSkill": {
    label: "Use Skill",
    color: "text-orange-600 dark:text-orange-400",
    defaultDescription: "Using skill",
    icon: "ZapIcon",
    actions: {},
  },
  "tool-getSkillResource": {
    label: "Get Skill Resource",
    color: "text-teal-600 dark:text-teal-400",
    defaultDescription: "Fetching skill resource",
    icon: "DatabaseIcon",
    actions: {},
  },
  "tool-webFetch": {
    label: "Web Fetch",
    color: "text-indigo-600 dark:text-indigo-400",
    defaultDescription: "Fetching web content",
    icon: "GlobeIcon",
    actions: {},
  },
  "tool-setTimer": {
    label: "Timer",
    color: "text-red-600 dark:text-red-400",
    defaultDescription: "Setting countdown timer",
    icon: "TimerIcon",
    defaultOpen: true,
    actions: {},
  },
};

/**
 * Result type for getBasicToolDisplay function
 */
export type BasicToolDisplayInfo = {
  title: string;
  description: string;
  label: string;
  color: string;
  icon: string;
};

/**
 * Get the display information for a basic tool based on its type and action.
 *
 * @param toolType - The tool type (e.g., "tool-getWeather")
 * @param action - Optional action name
 * @returns Display information including title, description, label, color, and icon
 */
export function getBasicToolDisplay(
  toolType: string,
  action?: string,
): BasicToolDisplayInfo {
  const config = basicToolUIConfig[toolType as BasicToolType];

  if (!config) {
    return {
      title: "Basic Tool",
      description: "Processing",
      label: "Basic Tool",
      color: "text-gray-600 dark:text-gray-400",
      icon: "ToolIcon",
    };
  }

  const actionConfig = action ? config.actions[action] : null;

  return {
    title: actionConfig?.title || config.label,
    description: actionConfig?.description || config.defaultDescription,
    label: config.label,
    color: config.color,
    icon: config.icon,
  };
}

/**
 * Check if a tool type is a basic tool
 *
 * @param toolType - The tool type to check
 * @returns True if the tool is a basic tool
 */
export function isBasicTool(toolType: string): toolType is BasicToolType {
  return BASIC_TOOL_TYPES.includes(toolType as BasicToolType);
}

/**
 * Get just the title for a basic tool
 *
 * @param toolType - The tool type
 * @param action - Optional action name
 * @returns The title string
 */
export function getBasicToolTitle(toolType: string, action?: string): string {
  return getBasicToolDisplay(toolType, action).title;
}

/**
 * Get just the description for a basic tool
 *
 * @param toolType - The tool type
 * @param action - Optional action name
 * @returns The description string
 */
export function getBasicToolDescription(
  toolType: string,
  action?: string,
): string {
  return getBasicToolDisplay(toolType, action).description;
}

/**
 * Get the base configuration for a basic tool (used by tool.tsx for toolConfigData)
 *
 * @param toolType - The tool type
 * @returns Object with label, color, description, and icon
 */
export function getBasicToolBaseConfig(toolType: string): {
  label: string;
  color: string;
  description: string;
  icon: string;
} {
  const config = basicToolUIConfig[toolType as BasicToolType];

  if (!config) {
    return {
      label: "Basic Tool",
      color: "text-gray-600 dark:text-gray-400",
      description: "Processing",
      icon: "ToolIcon",
    };
  }

  return {
    label: config.label,
    color: config.color,
    description: config.defaultDescription,
    icon: config.icon,
  };
}

/**
 * Get the defaultOpen value for a basic tool
 *
 * @param toolType - The tool type
 * @returns The defaultOpen value (defaults to false if not specified)
 */
export function getBasicToolDefaultOpen(toolType: string): boolean {
  const config = basicToolUIConfig[toolType as BasicToolType];
  return config?.defaultOpen ?? false;
}
