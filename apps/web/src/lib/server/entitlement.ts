import 'server-only'
import { getGeminiModelForPlan } from '@goalos/shared/lib/gemini'
import { prisma } from '@goalos/shared/lib/prisma'
import { PlanTier, SubscriptionStatus } from '@prisma/client'
import { PLANS, type PlanId } from '@/lib/plan'
import { decryptSecret } from '@/lib/server/crypto'

/** Header the client sends with the opaque subscription token. */
export const TOKEN_HEADER = 'x-goalos-token'

export function tierToPlanId(tier: PlanTier): PlanId {
  switch (tier) {
    case PlanTier.PRO:
      return 'pro'
    case PlanTier.MAX:
      return 'max'
    default:
      return 'free'
  }
}

export function planIdToTier(id: PlanId): PlanTier {
  switch (id) {
    case 'pro':
      return PlanTier.PRO
    case 'max':
      return PlanTier.MAX
    default:
      return PlanTier.FREE
  }
}

/** Year-month bucket the allotment counts against (resets monthly). */
export function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Client-facing subscription state derived from the stored status. */
export type EntStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'

function toEntStatus(s: SubscriptionStatus): EntStatus {
  switch (s) {
    case SubscriptionStatus.TRIALING:
      return 'trialing'
    case SubscriptionStatus.ACTIVE:
      return 'active'
    case SubscriptionStatus.PAST_DUE:
      return 'past_due'
    case SubscriptionStatus.CANCELED:
      return 'canceled'
    case SubscriptionStatus.INCOMPLETE:
      return 'incomplete'
    default:
      return 'none'
  }
}

export interface Entitlement {
  subscriptionId: string | null
  /** Derived subscription state. */
  status: EntStatus
  /** Whether any AI is unlocked (trial/paid full, or metered Free fallback). */
  entitled: boolean
  /** Effective tier driving model + embedder selection. */
  tier: PlanId
  /** Gemini model this tier may use. */
  model: string
  /** Per-customer key (decrypted) or null to use the shared owner key. */
  apiKey: string | null
  /** Monthly allotment; null = unlimited. */
  creditLimit: number | null
  used: number
  /** Remaining requests; null = unlimited. */
  remaining: number | null
  /** Whether an AI request is allowed right now. */
  hasCredits: boolean
  /** Trial end (ISO) while TRIALING, else null. */
  trialEndsAt: string | null
}

/** Locked state: no subscription yet (must start a trial) or unusable status. */
function lockedEntitlement(
  subscriptionId: string | null,
  status: EntStatus
): Entitlement {
  return {
    subscriptionId,
    status,
    entitled: false,
    tier: 'free', // baseline embedder for offline features while locked
    model: getGeminiModelForPlan('free'),
    apiKey: null,
    creditLimit: 0,
    used: 0,
    remaining: 0,
    hasCredits: false,
    trialEndsAt: null,
  }
}

/**
 * Resolves the authoritative entitlement for a request. The tier and status come
 * from the subscription row keyed by the opaque token — never from client-claimed
 * state. New/unknown tokens are locked (must start a trial); trialing and active
 * subscriptions get full paid access; canceled/past-due fall back to metered Free.
 */
export async function resolveEntitlement(
  token?: string | null
): Promise<Entitlement> {
  if (!token) return lockedEntitlement(null, 'none')

  const sub = await prisma.subscription.findUnique({
    where: { token },
    include: { usage: { where: { period: currentPeriod() } } },
  })
  if (!sub) return lockedEntitlement(null, 'none')

  const status = toEntStatus(sub.status)
  const used = sub.usage[0]?.used ?? 0

  // Trialing and active subscriptions get full paid-tier access + their key.
  if (
    sub.status === SubscriptionStatus.TRIALING ||
    sub.status === SubscriptionStatus.ACTIVE
  ) {
    const tier = tierToPlanId(sub.tier)
    const limit = PLANS[tier].monthlyCredits
    let apiKey: string | null = null
    if (sub.geminiKeyCipher) {
      try {
        apiKey = decryptSecret(sub.geminiKeyCipher)
      } catch {
        apiKey = null // fall back to shared key if decryption fails
      }
    }
    return {
      subscriptionId: sub.id,
      status,
      entitled: true,
      tier,
      model: getGeminiModelForPlan(tier),
      apiKey,
      creditLimit: limit,
      used,
      remaining: limit === null ? null : Math.max(0, limit - used),
      hasCredits: limit === null || used < limit,
      trialEndsAt:
        sub.status === SubscriptionStatus.TRIALING && sub.currentPeriodEnd
          ? sub.currentPeriodEnd.toISOString()
          : null,
    }
  }

  // Canceled or past-due: metered Free fallback on the shared owner key.
  if (
    sub.status === SubscriptionStatus.CANCELED ||
    sub.status === SubscriptionStatus.PAST_DUE
  ) {
    const limit = PLANS.free.monthlyCredits
    return {
      subscriptionId: sub.id,
      status,
      entitled: true,
      tier: 'free',
      model: getGeminiModelForPlan('free'),
      apiKey: null,
      creditLimit: limit,
      used,
      remaining: limit === null ? null : Math.max(0, limit - used),
      hasCredits: limit === null || used < limit,
      trialEndsAt: null,
    }
  }

  // NONE / INCOMPLETE: locked until a trial is started.
  return lockedEntitlement(sub.id, status)
}

/** Reads the entitlement for the token on a request. */
export function resolveEntitlementFromRequest(
  request: Request
): Promise<Entitlement> {
  return resolveEntitlement(request.headers.get(TOKEN_HEADER))
}

export interface PublicEntitlement {
  status: EntStatus
  entitled: boolean
  tier: PlanId
  planName: string
  aiModelLabel: string | null
  embedModel: string
  embedModelLabel: string
  queryPrefix: string
  creditLimit: number | null
  used: number
  remaining: number | null
  hasCredits: boolean
  trialEndsAt: string | null
}

/** Client-safe projection of an entitlement — never includes the API key. */
export function toPublicEntitlement(e: Entitlement): PublicEntitlement {
  const plan = PLANS[e.tier]
  return {
    status: e.status,
    entitled: e.entitled,
    tier: e.tier,
    planName: plan.name,
    aiModelLabel: plan.aiModelLabel,
    embedModel: plan.embedModel,
    embedModelLabel: plan.embedModelLabel,
    queryPrefix: plan.queryPrefix,
    creditLimit: e.creditLimit,
    used: e.used,
    remaining: e.remaining,
    hasCredits: e.hasCredits,
    trialEndsAt: e.trialEndsAt,
  }
}

/**
 * Records one AI request against a metered allotment. No-op for unlimited tiers
 * or anonymous requests. Atomic upsert keyed by (subscription, period).
 */
export async function consumeCredit(entitlement: Entitlement): Promise<void> {
  if (entitlement.creditLimit === null || !entitlement.subscriptionId) return
  const period = currentPeriod()
  await prisma.aiUsage.upsert({
    where: {
      subscriptionId_period: {
        subscriptionId: entitlement.subscriptionId,
        period,
      },
    },
    create: { subscriptionId: entitlement.subscriptionId, period, used: 1 },
    update: { used: { increment: 1 } },
  })
}
