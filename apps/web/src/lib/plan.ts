/**
 * Subscription tiers. Each tier unlocks progressively better models: a stronger
 * on-device embedding model (icon suggestions + offline command understanding)
 * and, for paid tiers, a higher-quality Gemini model for AI features.
 *
 * The active plan is stored client-side and sent to the API via the
 * `x-goalos-plan` header so the server can pick the matching Gemini model.
 */
export type PlanId = 'free' | 'pro' | 'max'

export interface PlanConfig {
  id: PlanId
  name: string
  /** Monthly price in USD. */
  price: number
  tagline: string
  /** Transformers.js model id for on-device embeddings. */
  embedModel: string
  embedModelLabel: string
  /** Retrieval instruction prefix the embedding model expects ('' for none). */
  queryPrefix: string
  /** Whether cloud AI (Gemini) features are available on this tier. */
  aiEnabled: boolean
  /** Human-facing name of the cloud model, or null when AI is off. */
  aiModelLabel: string | null
  /** Monthly AI request allotment; null means unlimited. */
  monthlyCredits: number | null
  features: string[]
  /** Features shown greyed-out as an upsell (only on lower tiers). */
  locked?: string[]
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    tagline: 'Everything you need to map and track your goals.',
    embedModel: 'Xenova/all-MiniLM-L6-v2',
    embedModelLabel: 'MiniLM (compact)',
    queryPrefix: '',
    aiEnabled: true,
    aiModelLabel: 'Gemini 2.5 Flash',
    monthlyCredits: 50,
    features: [
      'Full goal, vehicle & resource tracking',
      'State graph & relationship mapping',
      '50 Gemini 2.5 Flash AI credits / month',
      'Offline fallback when credits run out',
    ],
    locked: ['Unlimited AI usage', 'Best-in-class models'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 20,
    tagline: 'Smarter suggestions powered by stronger models.',
    embedModel: 'Xenova/bge-base-en-v1.5',
    embedModelLabel: 'BGE-Base',
    queryPrefix: 'Represent this sentence for searching relevant passages: ',
    aiEnabled: true,
    aiModelLabel: 'Gemini 2.5 Flash',
    monthlyCredits: null,
    features: [
      'Everything in Free',
      'Unlimited Gemini 2.5 Flash AI',
      'Semantic icon suggestions (stronger embeddings)',
      'AI command intent detection',
    ],
  },
  max: {
    id: 'max',
    name: 'Max',
    price: 200,
    tagline: 'Best-in-class models for the most demanding work.',
    embedModel: 'mixedbread-ai/mxbai-embed-large-v1',
    embedModelLabel: 'mxbai-embed-large',
    queryPrefix: 'Represent this sentence for searching relevant passages: ',
    aiEnabled: true,
    aiModelLabel: 'Gemini 2.5 Pro',
    monthlyCredits: null,
    features: [
      'Everything in Pro',
      'Unlimited Gemini 2.5 Pro — highest-quality reasoning',
      'Best-in-class offline embeddings (mxbai-large)',
      'Priority AI briefings & suggestions',
    ],
  },
}

export const PLAN_ORDER: PlanId[] = ['free', 'pro', 'max']

export const DEFAULT_PLAN: PlanId = 'free'

export function isPlanId(value: unknown): value is PlanId {
  return value === 'free' || value === 'pro' || value === 'max'
}

export function getPlan(id: string | null | undefined): PlanConfig {
  return isPlanId(id) ? PLANS[id] : PLANS[DEFAULT_PLAN]
}
