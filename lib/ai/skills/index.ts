import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";

export interface SkillMetadata {
  name: string;
  description: string;
  allowedTools?: string[];
}

export interface Skill {
  id: string;
  metadata: SkillMetadata;
  content: string;
  directory: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
}

const SKILLS_DIRECTORIES = [
  // Project skills (checked into git)
  path.join(process.cwd(), ".claude", "skills"),
];

/**
 * Discover all available skills from the filesystem
 * Returns only metadata (Level 1) - minimal token usage
 */
export async function discoverSkills(): Promise<SkillSummary[]> {
  const skills: SkillSummary[] = [];

  for (const skillsDir of SKILLS_DIRECTORIES) {
    if (!fs.existsSync(skillsDir)) {
      continue;
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = path.join(skillsDir, entry.name, "SKILL.md");

      if (!fs.existsSync(skillPath)) continue;

      try {
        const fileContent = fs.readFileSync(skillPath, "utf-8");
        const { data } = matter(fileContent);

        if (data.name && data.description) {
          skills.push({
            id: entry.name,
            name: data.name,
            description: data.description,
          });
        }
      } catch (error) {
        console.warn(`Failed to parse skill at ${skillPath}:`, error);
      }
    }
  }

  return skills;
}

/**
 * Load full skill content (Level 2) - only when needed
 */
export async function loadSkill(skillId: string): Promise<Skill | null> {
  for (const skillsDir of SKILLS_DIRECTORIES) {
    const skillPath = path.join(skillsDir, skillId, "SKILL.md");

    if (!fs.existsSync(skillPath)) continue;

    try {
      const fileContent = fs.readFileSync(skillPath, "utf-8");
      const { data, content } = matter(fileContent);

      if (!data.name || !data.description) {
        console.warn(`Skill ${skillId} missing required metadata`);
        return null;
      }

      return {
        id: skillId,
        metadata: {
          name: data.name,
          description: data.description,
          allowedTools: data["allowed-tools"]?.split(",").map((t: string) => t.trim()),
        },
        content: content.trim(),
        directory: path.join(skillsDir, skillId),
      };
    } catch (error) {
      console.warn(`Failed to load skill ${skillId}:`, error);
    }
  }

  return null;
}

/**
 * Load additional resource from a skill (Level 3)
 */
export async function loadSkillResource(
  skillId: string,
  resourcePath: string
): Promise<string | null> {
  for (const skillsDir of SKILLS_DIRECTORIES) {
    const fullPath = path.join(skillsDir, skillId, resourcePath);

    // Security: Prevent path traversal
    const normalizedPath = path.normalize(fullPath);
    const skillBaseDir = path.join(skillsDir, skillId);
    
    if (!normalizedPath.startsWith(skillBaseDir)) {
      console.warn(`Path traversal attempt blocked: ${resourcePath}`);
      return null;
    }

    if (!fs.existsSync(fullPath)) continue;

    try {
      return fs.readFileSync(fullPath, "utf-8");
    } catch (error) {
      console.warn(`Failed to load resource ${resourcePath} from skill ${skillId}:`, error);
    }
  }

  return null;
}

/**
 * Generate compact skill metadata for system prompt
 * ~100 tokens per skill
 */
export function generateSkillsSystemPrompt(skills: SkillSummary[]): string {
  if (skills.length === 0) {
    return "";
  }

  const skillList = skills
    .map((s) => `- [${s.id}] ${s.name}: ${s.description}`)
    .join("\n");

  return `
## Available Skills

You have access to specialized skills that can help with specific tasks. 
To use a skill, call the \`useSkill\` tool with the skill ID.
Only use a skill when the user's request matches the skill's description.

${skillList}
`;
}
