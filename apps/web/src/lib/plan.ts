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
    embedModelLabel: 'Compact',
    queryPrefix: '',
    aiEnabled: true,
    aiModelLabel: 'standard model',
    monthlyCredits: 50,
    features: [
      'Full goal, vehicle & resource tracking',
      'State graph & relationship mapping',
      '50 suggestion credits / month',
      'Offline fallback when credits run out',
    ],
    locked: ['Unlimited usage', 'Best-in-class models'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 20,
    tagline: 'Smarter suggestions powered by stronger models.',
    embedModel: 'Xenova/bge-base-en-v1.5',
    embedModelLabel: 'Enhanced',
    queryPrefix: 'Represent this sentence for searching relevant passages: ',
    aiEnabled: true,
    aiModelLabel: 'standard model',
    monthlyCredits: null,
    features: [
      'Everything in Free',
      'Unlimited standard-model usage',
      'Semantic icon suggestions (stronger embeddings)',
      'Smart command intent detection',
    ],
  },
  max: {
    id: 'max',
    name: 'Max',
    price: 200,
    tagline: 'Best-in-class models for the most demanding work.',
    embedModel: 'mixedbread-ai/mxbai-embed-large-v1',
    embedModelLabel: 'Premium',
    queryPrefix: 'Represent this sentence for searching relevant passages: ',
    aiEnabled: true,
    aiModelLabel: 'advanced model',
    monthlyCredits: null,
    features: [
      'Everything in Pro',
      'Unlimited advanced-model usage — highest-quality reasoning',
      'Best-in-class offline embeddings',
      'Priority briefings & suggestions',
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
