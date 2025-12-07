// lib/tools/index.ts

import { getBasicToolDisplay } from "./basic/ui-config";
import { getGoogleToolDisplay, isGoogleTool } from "./google/ui-config";
import { getSpotifyToolDisplay, isSpotifyTool } from "./spotify/ui-config";

export * from "./basic/ui-config";
export * from "./google/ui-config";
export * from "./spotify/ui-config";

// Unified lookup function
export function getToolDisplay(toolType: string, action?: string) {
  if (isSpotifyTool(toolType)) return getSpotifyToolDisplay(toolType, action);
  if (isGoogleTool(toolType)) return getGoogleToolDisplay(toolType, action);
  return getBasicToolDisplay(toolType);
}
