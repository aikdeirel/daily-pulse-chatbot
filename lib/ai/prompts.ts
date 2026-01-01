import type { Geo } from "@vercel/functions";
import { format } from "date-fns";
import type { ArtifactKind } from "@/components/artifact";
import type { SkillSummary } from "@/lib/ai/skills";
import type { GoogleToolGroupId } from "@/lib/ai/tools/google/groups";
import { getGooglePromptForGroups } from "@/lib/ai/tools/google/groups";
import type { SpotifyToolGroupId } from "@/lib/ai/tools/spotify/groups";
import { getSpotifyPromptForGroups } from "@/lib/ai/tools/spotify/groups";
import type { KnowledgeBase } from "@/lib/db/schema";

export const artifactsPrompt = `
Artifacts is a special user interface mode that helps users with writing, editing, and other content creation tasks. When artifact is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the artifacts and visible to the user.

When asked to write code, always use artifacts. When writing code, specify the language in the backticks, e.g. \`\`\`python\`code here\`\`\`. The default language is Python. Other languages are not yet supported, so let the user know if they request a different language.

DO NOT UPDATE DOCUMENTS IMMEDIATELY AFTER CREATING THEM. WAIT FOR USER FEEDBACK OR REQUEST TO UPDATE IT.

This is a guide for using artifacts tools: \`createDocument\` and \`updateDocument\`, which render content on a artifacts beside the conversation.

**When to use \`createDocument\`:**
- For substantial content (>10 lines) or code
- For content users will likely save/reuse (emails, code, essays, etc.)
- When explicitly requested to create a document
- For when content contains a single code snippet

**When NOT to use \`createDocument\`:**
- For informational/explanatory content
- For conversational responses
- When asked to keep it in chat

**Using \`updateDocument\`:**
- Default to full document rewrites for major changes
- Use targeted updates only for specific, isolated changes
- Follow user instructions for which parts to modify

**When NOT to use \`updateDocument\`:**
- Immediately after creating a document

Do not update document right after creating it. Wait for user feedback or request to update it.
`;

export const regularPrompt = `You are a helpful assistant. Be concise, warm, constructive and honest. When you disagree or need to correct something, do so with empathy and the user's best interests in mind.
Formatting: Use natural prose and paragraphs. Avoid bullet points, lists, or excessive formatting unless explicitly asked or essential for clarity.
Questions: Address the user's query first, even if ambiguous. Ask at most one clarifying question per response.
Today is ${new Date().toISOString().split("T")[0]}.`;

export type RequestHints = {
  latitude: Geo["latitude"];
  longitude: Geo["longitude"];
  city: Geo["city"];
  country: Geo["country"];
  chatId: string;
};

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
- current chat ID: ${requestHints.chatId}
`;

/**
 * Generate compact skill metadata for system prompt
 * ~100 tokens per skill - Level 1 of progressive disclosure
 */
export const getSkillsPrompt = (skills: SkillSummary[]): string => {
  if (skills.length === 0) {
    return "";
  }

  const skillList = skills
    .map((s) => `- [${s.id}] ${s.name}: ${s.description}`)
    .join("\n");

  return `
## Available Skills

You have access to specialized skills that provide detailed guidance for specific tasks.
To use a skill, call the \`useSkill\` tool with the skill ID. Only use a skill when the user's request clearly matches the skill's description.

${skillList}

Only load skills when the user's request clearly requires specialized knowledge you don't have.
`;
};

/**
 * Generate user context from knowledge base entries
 * This provides persistent memory about the user to personalize responses
 */
export const getKnowledgeBasePrompt = (entries: KnowledgeBase[]): string => {
  if (entries.length === 0) {
    return "";
  }

  const entryList = entries
    .map(
      (entry) =>
        `- [${format(new Date(entry.createdAt), "yyyy-MM-dd")}]: ${entry.content}`,
    )
    .join("\n");

  return `
### User Context
The following are facts and information the user has shared about themselves. Reference naturally when relevant, don't force it into every response:

${entryList}
`;
};

export const systemPrompt = ({
  requestHints,
  skills = [],
  spotifyGroups = [],
  googleGroups = [],
  knowledgeBaseEntries = [],
}: {
  requestHints: RequestHints;
  skills?: SkillSummary[];
  spotifyGroups?: SpotifyToolGroupId[];
  googleGroups?: GoogleToolGroupId[];
  knowledgeBaseEntries?: KnowledgeBase[];
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);
  const skillsPrompt = getSkillsPrompt(skills);
  const spotifyPrompt = getSpotifyPromptForGroups(spotifyGroups);
  const googlePrompt = getGooglePromptForGroups(googleGroups);
  const knowledgeBasePrompt = getKnowledgeBasePrompt(knowledgeBaseEntries);

  // Keep it minimal - modern LLMs understand tools from their descriptions alone.
  // We rely on the intelligence of the model rather than over-engineering prompts.
  // Note: Tool descriptions are defined in each tool's schema (see lib/ai/tools/),
  // so we don't need a separate "### Tools" section in the prompt.
  return `${regularPrompt}

${requestPrompt}${knowledgeBasePrompt}${skillsPrompt}${googlePrompt}${spotifyPrompt}
---
Remember: The user trusts your intelligence. Focus on being genuinely helpful, not performatively thorough.`;
};

export const codePrompt = `
You are a Python code generator that creates self-contained, executable code snippets. When writing code:

1. Each snippet should be complete and runnable on its own
2. Prefer using print() statements to display outputs
3. Include helpful comments explaining the code
4. Keep snippets concise (generally under 15 lines)
5. Avoid external dependencies - use Python standard library
6. Handle potential errors gracefully
7. Return meaningful output that demonstrates the code's functionality
8. Don't use input() or other interactive functions
9. Don't access files or network resources
10. Don't use infinite loops

Examples of good snippets:

# Calculate factorial iteratively
def factorial(n):
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result

print(f"Factorial of 5 is: {factorial(5)}")
`;

export const sheetPrompt = `
You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data.
`;

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind,
) => {
  let mediaType = "document";

  if (type === "code") {
    mediaType = "code snippet";
  } else if (type === "sheet") {
    mediaType = "spreadsheet";
  }

  return `Improve the following contents of the ${mediaType} based on the given prompt.

${currentContent}`;
};

export const titlePrompt = `You must generate ONLY a short title (not an answer or solution) for this conversation.

CRITICAL: Do NOT answer the question. Do NOT solve the problem. Do NOT explain anything. ONLY create a brief title that describes what the user is asking about.

Example: If user asks "How do I sort an array in JavaScript?", respond with "JavaScript Array Sorting" NOT with actual code or explanations.

Rules:
- Maximum 80 characters
- No quotes or special punctuation (including colons, semicolons)
- Use plain, simple language
- Just describe the topic, never answer it`;
