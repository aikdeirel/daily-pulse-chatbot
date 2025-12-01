export const DEFAULT_CHAT_MODEL: string = "openrouter-chat";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  // {\n  //   id: "chat-model",
  //   name: "Grok Vision",
  //   description: "Advanced multimodal model with vision and text capabilities",
  // },
  // {
  //   id: "chat-model-reasoning",
  //   name: "Grok Reasoning",
  //   description:
  //     "Uses advanced chain-of-thought reasoning for complex problems",
  // },
  {
    id: "openrouter-chat",
    name: "GPT-4o Mini",
    description: "OpenAI GPT-4o mini via OpenRouter - Fast and cost-effective",
  },
];
