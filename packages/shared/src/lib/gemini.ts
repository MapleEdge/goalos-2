import { type GenerateContentResponse, GoogleGenAI } from '@google/genai'
import logger from './logger'
import {
  createCircuitBreakerPolicy,
  createRetryPolicy,
  isBrokenCircuitError,
  isCircuitOpen,
  wrap,
} from './resilience'

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

// ── Resilience policies (singleton per process) ─────────────────

const geminiRetry = createRetryPolicy({
  maxAttempts: 3,
  initialDelay: 100,
  multiplier: 2,
  maxDelay: 5_000,
})

const geminiCircuitBreaker = createCircuitBreakerPolicy({
  threshold: 5,
  halfOpenAfter: 30_000,
})

const geminiPolicy = wrap(geminiCircuitBreaker, geminiRetry)

// ── Resilient wrapper for Gemini API calls ──────────────────────

export interface GeminiCallOptions {
  model: string
  contents: string
  config?: Record<string, unknown>
}

/**
 * Execute a Gemini `generateContent` call with retry + circuit-breaker.
 * Returns `null` when the circuit is open or the client is unavailable.
 */
export async function callGemini(
  opts: GeminiCallOptions
): Promise<GenerateContentResponse | null> {
  const client = getGeminiClient()
  if (!client) return null

  if (isCircuitOpen(geminiCircuitBreaker)) {
    logger.warn('gemini: circuit breaker is open — skipping call')
    return null
  }

  try {
    return await geminiPolicy.execute(() =>
      client.models.generateContent({
        model: opts.model,
        contents: opts.contents,
        config: opts.config,
      })
    )
  } catch (err) {
    if (isBrokenCircuitError(err)) {
      logger.warn('gemini: circuit breaker tripped — returning null')
      return null
    }
    logger.error({ err }, 'gemini: call failed after retries')
    return null
  }
}

export { geminiCircuitBreaker, geminiRetry }
