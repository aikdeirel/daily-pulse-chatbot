import { z } from "zod";
import {
  type GoogleToolGroupId,
  googleToolGroupIds,
} from "@/lib/ai/tools/google/groups";
import {
  type SpotifyToolGroupId,
  spotifyToolGroupIds,
} from "@/lib/ai/tools/spotify/groups";
import { ALLOWED_FILE_TYPES_ARRAY } from "@/lib/file-types";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(ALLOWED_FILE_TYPES_ARRAY as [string, ...string[]]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema),
  }),
  selectedChatModel: z.enum([
    "claude-haiku-4.5",
    "claude-sonnet-4.5",
    "claude-opus-4.5",
    "claude-sonnet-4.5-reasoning",
    "claude-opus-4.5-reasoning",
    "gpt-oss-20b-free",
    "gpt-5-nano",
    "gpt-5.1-chat",
    "gpt-5.1",
    "gpt-5.1-codex-mini",
    "gpt-5.1-codex",
    "gpt-5.1-reasoning",
    "gemma-3-27b-free",
    "glm-4.5-air-free",
    "mistral-small-3.1-24b-instruct-free",
    "mistral-medium-3.1",
  ]),
  selectedVisibilityType: z.enum(["public", "private"]),
  webSearchEnabled: z.boolean().optional().default(false),
  spotifyToolGroups: z
    .array(z.enum(spotifyToolGroupIds))
    .optional()
    .default([] as SpotifyToolGroupId[]),
  googleToolGroups: z
    .array(z.enum(googleToolGroupIds))
    .optional()
    .default([] as GoogleToolGroupId[]),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
