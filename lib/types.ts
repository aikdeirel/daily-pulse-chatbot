import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { googleCalendars, googleEvents } from "./ai/tools/google";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type {
  spotifyAlbums,
  spotifyArtists,
  spotifyPlayback,
  spotifyPlaylists,
  spotifyQueue,
  spotifySearch,
  spotifyTracks,
  spotifyUser,
} from "./ai/tools/spotify";
import type { updateDocument } from "./ai/tools/update-document";
import type { getSkillResource, useSkill } from "./ai/tools/use-skill";
import type { webFetch } from "./ai/tools/web-fetch";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type useSkillTool = InferUITool<ReturnType<typeof useSkill>>;
type getSkillResourceTool = InferUITool<ReturnType<typeof getSkillResource>>;
type webFetchTool = InferUITool<typeof webFetch>;
type spotifySearchTool = InferUITool<ReturnType<typeof spotifySearch>>;
type spotifyAlbumsTool = InferUITool<ReturnType<typeof spotifyAlbums>>;
type spotifyArtistsTool = InferUITool<ReturnType<typeof spotifyArtists>>;
type spotifyPlaybackTool = InferUITool<ReturnType<typeof spotifyPlayback>>;
type spotifyQueueTool = InferUITool<ReturnType<typeof spotifyQueue>>;
type spotifyPlaylistsTool = InferUITool<ReturnType<typeof spotifyPlaylists>>;
type spotifyTracksTool = InferUITool<ReturnType<typeof spotifyTracks>>;
type spotifyUserTool = InferUITool<ReturnType<typeof spotifyUser>>;
type googleCalendarsTool = InferUITool<ReturnType<typeof googleCalendars>>;
type googleEventsTool = InferUITool<ReturnType<typeof googleEvents>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  useSkill: useSkillTool;
  getSkillResource: getSkillResourceTool;
  webFetch: webFetchTool;
  spotifySearch: spotifySearchTool;
  spotifyAlbums: spotifyAlbumsTool;
  spotifyArtists: spotifyArtistsTool;
  spotifyPlayback: spotifyPlaybackTool;
  spotifyQueue: spotifyQueueTool;
  spotifyPlaylists: spotifyPlaylistsTool;
  spotifyTracks: spotifyTracksTool;
  spotifyUser: spotifyUserTool;
  googleCalendars: googleCalendarsTool;
  googleEvents: googleEventsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
