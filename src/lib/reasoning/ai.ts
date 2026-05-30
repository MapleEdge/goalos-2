import OpenAI from "openai";
import type { ReasoningOutput } from "./types";

interface AIConfig {
  provider: "openai" | "ollama";
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

function getConfig(): AIConfig | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }
  if (process.env.OLLAMA_BASE_URL) {
    return {
      provider: "ollama",
      baseURL: process.env.OLLAMA_BASE_URL + "/v1",
      model: process.env.OLLAMA_MODEL || "llama3",
    };
  }
  return null;
}

function buildClient(config: AIConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey || "ollama",
    baseURL: config.baseURL,
  });
}

export async function enhanceWithAI(
  graphState: ReasoningOutput,
  userPrompt?: string
): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

  const client = buildClient(config);

  const systemPrompt = `You are a strategic advisor analyzing a user's goal graph. 
You have access to the current state of their goals, prerequisites, evidence, stakeholders, and actions.
Provide concise, actionable insights. Focus on:
1. The single highest-leverage next action and why
2. Any blind spots or missing prerequisites
3. Which relationships to prioritize
4. How to reduce the biggest uncertainty

Be specific, reference actual items from the data, and be honest about gaps.`;

  const dataContext = JSON.stringify(graphState, null, 2);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Here is the current state of my goal graph:\n\n${dataContext}\n\n${
        userPrompt || "What should I focus on next and why?"
      }`,
    },
  ];

  const completion = await client.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 1500,
  });

  return completion.choices[0]?.message?.content || null;
}

export function isAIAvailable(): boolean {
  return getConfig() !== null;
}
