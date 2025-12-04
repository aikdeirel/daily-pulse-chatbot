import { tool } from "ai";
import { z } from "zod";
import {
  loadSkill,
  loadSkillResource,
  type SkillSummary,
} from "@/lib/ai/skills";

type UseSkillProps = {
  availableSkills: SkillSummary[];
};

/**
 * Tool that allows Claude to load a skill's full content on demand.
 * This implements the progressive disclosure pattern:
 * - Level 1 (metadata) is always in system prompt
 * - Level 2 (full instructions) loaded via this tool
 * - Level 3 (resources) loaded via getSkillResource tool
 */
export const useSkill = ({ availableSkills }: UseSkillProps) =>
  tool({
    description: `Load the full instructions for a skill. Use this when you need specialized guidance for a task. Available skills: ${availableSkills.map((s) => s.id).join(", ")}`,
    inputSchema: z.object({
      skillId: z
        .string()
        .describe("The ID of the skill to load (e.g., 'pdf-processing')"),
    }),
    execute: async ({ skillId }) => {
      const skill = await loadSkill(skillId);

      if (!skill) {
        return {
          error: `Skill "${skillId}" not found. Available skills: ${availableSkills.map((s) => s.id).join(", ")}`,
        };
      }

      return {
        skillId: skill.id,
        name: skill.metadata.name,
        instructions: skill.content,
        message:
          "Skill loaded successfully. Follow the instructions above to complete the user's request.",
      };
    },
  });

/**
 * Tool to load additional resources from a skill directory
 * This is Level 3 of progressive disclosure
 */
export const getSkillResource = ({ availableSkills }: UseSkillProps) =>
  tool({
    description:
      "Load an additional resource file from a skill (e.g., reference documentation, templates). Only use this if the skill instructions reference additional files.",
    inputSchema: z.object({
      skillId: z.string().describe("The ID of the skill"),
      resourcePath: z
        .string()
        .describe(
          "The relative path to the resource file within the skill directory (e.g., 'REFERENCE.md', 'templates/example.txt')",
        ),
    }),
    execute: async ({ skillId, resourcePath }) => {
      // Validate skill exists
      if (!availableSkills.find((s) => s.id === skillId)) {
        return {
          error: `Skill "${skillId}" not found.`,
        };
      }

      const content = await loadSkillResource(skillId, resourcePath);

      if (!content) {
        return {
          error: `Resource "${resourcePath}" not found in skill "${skillId}".`,
        };
      }

      return {
        skillId,
        resourcePath,
        content,
      };
    },
  });
