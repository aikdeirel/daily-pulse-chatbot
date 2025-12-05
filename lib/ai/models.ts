export const DEFAULT_CHAT_MODEL: string = "mistral-medium-3.1";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    description: "Fast and efficient Claude model (Default)",
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "Balanced performance and speed from Anthropic",
  },
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    description: "Most capable Claude model for complex tasks",
  },
  {
    id: "claude-sonnet-4.5-reasoning",
    name: "Claude Sonnet 4.5 Reasoning",
    description: "Balanced Claude model with reasoning enabled",
  },
  {
    id: "claude-opus-4.5-reasoning",
    name: "Claude Opus 4.5 Reasoning",
    description: "Most capable Claude with reasoning enabled",
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    description: "Fast and cost-effective compact model",
  },
  {
    id: "gpt-5.1-chat",
    name: "GPT-5.1 Chat",
    description: "GPT-5.1 optimized for conversational interactions",
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    description: "Latest GPT-5.1 general purpose model",
  },
  {
    id: "gpt-5.1-codex-mini",
    name: "GPT-5.1 Codex Mini",
    description: "Lightweight coding model for quick tasks",
  },
  {
    id: "gpt-5.1-codex",
    name: "GPT-5.1 Codex",
    description: "Advanced coding model for complex programming tasks",
  },
  {
    id: "gpt-5.1-reasoning",
    name: "GPT-5.1 Reasoning",
    description: "GPT-5.1 with chain-of-thought reasoning enabled",
  },
  {
    id: "gpt-oss-20b-free",
    name: "GPT OSS 20B",
    description: "Free: Open-source 20B parameter model",
  },
  {
    id: "gemma-3-27b-free",
    name: "Gemma 3 27B",
    description: "Free: Google's 27B parameter instruction-tuned model",
  },
  {
    id: "glm-4.5-air-free",
    name: "GLM-4.5 Air",
    description: "Free: Z-AI's GLM-4.5 Air model",
  },
  {
    id: "mistral-small-3.1-24b-instruct-free",
    name: "Mistral Small 3.1 24B Instruct",
    description: "Free: Mistral's 24B parameter instruction-tuned model",
  },
  {
    id: "mistral-medium-3.1",
    name: "Mistral Medium 3.1",
    description: "Mistral's medium-sized model for balanced performance",
  },
];
