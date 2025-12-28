import { z } from "zod";
import { chatModelIdSchema } from "@/lib/ai/models.config";
import {
  type GoogleToolGroupId,
  googleToolGroupIds,
} from "@/lib/ai/tools/google/groups";
import {
  type SpotifyToolGroupId,
  spotifyToolGroupIds,
} from "@/lib/ai/tools/spotify/groups";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum([
    "image/jpeg",
    "image/png",
    "application/pdf",
    "text/plain",
    "text/markdown",
  ]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user", "assistant"]),
    parts: z.array(partSchema),
  }),
  selectedChatModel: chatModelIdSchema,
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
