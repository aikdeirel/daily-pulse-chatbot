export const googleToolGroupIds = ["calendar_management"] as const;

export type GoogleToolGroupId = (typeof googleToolGroupIds)[number];

export type GoogleToolName = "googleCalendars" | "googleEvents";

export type GoogleToolGroup = {
  id: GoogleToolGroupId;
  label: string;
  description: string;
  prompt: string;
  tools: GoogleToolName[];
};

export const GOOGLE_TOOL_GROUP_STORAGE_KEY = "google-tool-groups";

export const googleToolGroups: GoogleToolGroup[] = [
  {
    id: "calendar_management",
    label: "Calendar Management",
    description:
      "List, retrieve, and manage user calendars. Create, read, update, delete, and search calendar events.",
    prompt:
      "Use when the user needs to work with calendars and events (list, get details, manage, create, search, update, delete). For date filtering always supply timeMin/timeMax (RFC3339); only use the q parameter for free-text searches over summary/description/location/attendees.",
    tools: ["googleCalendars", "googleEvents"],
  },
];

export const getGoogleGroupsByIds = (
  ids: GoogleToolGroupId[],
): GoogleToolGroup[] => {
  if (ids.length === 0) {
    return [];
  }

  const selection = new Set(ids);
  return googleToolGroups.filter((group) => selection.has(group.id));
};

export const getGoogleToolNamesForGroups = (
  ids: GoogleToolGroupId[],
): GoogleToolName[] => {
  const groups = getGoogleGroupsByIds(ids);
  const names = new Set<GoogleToolName>();

  for (const group of groups) {
    for (const tool of group.tools) {
      names.add(tool);
    }
  }

  return Array.from(names);
};

export const getGooglePromptForGroups = (ids: GoogleToolGroupId[]): string => {
  const groups = getGoogleGroupsByIds(ids);

  if (groups.length === 0) {
    return "";
  }

  const rows = groups
    .map((group) => `- ${group.label}: ${group.prompt}`)
    .join("\n");

  return `\n## Google Capabilities\n\n${rows}\n`;
};
