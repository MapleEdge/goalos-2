import { GoogleGenAI } from '@google/genai'

// Shared Gemini client + helpers. The reasoning engine and all AI features work
// without a key — callers fall back to non-AI behavior when this returns null.
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  return new GoogleGenAI({ apiKey })
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash'
}

export function isGeminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY)
}
