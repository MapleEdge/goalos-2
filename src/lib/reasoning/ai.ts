import {
  getGeminiClient,
  getGeminiModel,
  isGeminiAvailable,
} from '@/lib/gemini'
import type { ReasoningOutput } from './types'

export async function enhanceWithAI(
  graphState: ReasoningOutput,
  userPrompt?: string
): Promise<string | null> {
  const client = getGeminiClient()
  if (!client) return null

  const systemPrompt = `You are a strategic advisor analyzing a user's goal graph. 
You have access to the current state of their goals, prerequisites, evidence, stakeholders, and actions.
Provide concise, actionable insights. Focus on:
1. The single highest-leverage next action and why
2. Any blind spots or missing prerequisites
3. Which relationships to prioritize
4. How to reduce the biggest uncertainty

Be specific, reference actual items from the data, and be honest about gaps.`

  const dataContext = JSON.stringify(graphState, null, 2)

  const completion = await client.models.generateContent({
    model: getGeminiModel(),
    contents: `Here is the current state of my goal graph:\n\n${dataContext}\n\n${
      userPrompt || 'What should I focus on next and why?'
    }`,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 1500,
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  return completion.text || null
}

export function isAIAvailable(): boolean {
  return isGeminiAvailable()
}
