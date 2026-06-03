'use client'

import { cosineSim, embed, isEmbedderReady } from './embedder'

/**
 * Intents the offline model can classify by similarity. `create_goal` is the
 * default fall-through (free-form goal text), so it isn't matched here.
 */
export type SemanticIntent =
  | 'review_all'
  | 'progress'
  | 'work_on'
  | 'navigate'
  | 'schedule_query'
  | 'schedule_event'
  | 'help'

/** Minimum cosine similarity before we trust a semantic match over the regex. */
export const INTENT_CONFIDENCE = 0.6

const INTENT_EXEMPLARS: Record<SemanticIntent, string[]> = {
  review_all: [
    'review all my goals',
    'show me all my goals',
    'list my goals',
    'give me an overview of my goals',
    'summarize my progress',
  ],
  progress: [
    'how is my goal going',
    'what is the status of my project',
    'how am I doing on learning spanish',
    'progress on my fitness goal',
    'check progress on my goal',
  ],
  work_on: [
    'what should I work on next',
    'what should I do now',
    'what is my next action',
    'what should I focus on',
    'prioritize my tasks',
  ],
  navigate: [
    'go to the schedule',
    'open the graph',
    'navigate to the timeline',
    'take me to the dashboard',
    'show the calendar page',
  ],
  schedule_query: [
    'what is on my calendar',
    'my upcoming events',
    'what is on my schedule today',
    'events this week',
    'what meetings do I have',
  ],
  schedule_event: [
    'schedule a meeting',
    'set up a call with John tomorrow at 3pm',
    'book an appointment next monday',
    'add an event to my calendar',
    'create a new calendar event',
  ],
  help: [
    'help',
    'what can you do',
    'what can I say',
    'list the commands',
    'how does this work',
  ],
}

interface IntentVector {
  intent: SemanticIntent
  vec: number[]
}

let intentVectors: IntentVector[] | null = null
let intentPromise: Promise<void> | null = null

async function ensureIntentVectors(): Promise<void> {
  if (intentVectors || !isEmbedderReady()) return
  if (!intentPromise) {
    intentPromise = (async () => {
      const flat: { intent: SemanticIntent; text: string }[] = []
      for (const key of Object.keys(INTENT_EXEMPLARS) as SemanticIntent[]) {
        for (const text of INTENT_EXEMPLARS[key])
          flat.push({ intent: key, text })
      }
      const vecs = await embed(
        flat.map((f) => f.text),
        false
      )
      if (vecs) {
        intentVectors = flat.map((f, i) => ({
          intent: f.intent,
          vec: vecs[i] ?? [],
        }))
      }
    })()
  }
  await intentPromise
}

/**
 * Classifies free text into an intent using the offline model. Returns the
 * best match and its score, or null if the model isn't ready / can't embed.
 * Callers should only act on the result when `score >= INTENT_CONFIDENCE`.
 */
export async function classifyIntentSemantic(
  input: string
): Promise<{ intent: SemanticIntent; score: number } | null> {
  if (!isEmbedderReady()) return null
  await ensureIntentVectors()
  if (!intentVectors) return null

  const query = await embed([input], true)
  const qvec = query?.[0]
  if (!qvec) return null

  let best: { intent: SemanticIntent; score: number } | null = null
  for (const iv of intentVectors) {
    const score = cosineSim(qvec, iv.vec)
    if (!best || score > best.score) best = { intent: iv.intent, score }
  }
  return best
}
