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

export interface Entitlement {
  subscriptionId: string | null
  /** Effective tier after applying subscription status. */
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
  /** Whether a metered AI request is allowed right now. */
  hasCredits: boolean
}

function anonymousFreeEntitlement(): Entitlement {
  const limit = PLANS.free.monthlyCredits
  return {
    subscriptionId: null,
    tier: 'free',
    model: getGeminiModelForPlan('free'),
    apiKey: null,
    creditLimit: limit,
    used: 0,
    remaining: limit,
    hasCredits: limit === null || limit > 0,
  }
}

/**
 * Resolves the authoritative entitlement for a request. The tier comes from the
 * subscription row keyed by the opaque token — never from client-claimed state.
 * Falls back to an anonymous Free entitlement when the token is missing/unknown.
 */
export async function resolveEntitlement(
  token?: string | null
): Promise<Entitlement> {
  if (!token) return anonymousFreeEntitlement()

  const sub = await prisma.subscription.findUnique({
    where: { token },
    include: { usage: { where: { period: currentPeriod() } } },
  })
  if (!sub) return anonymousFreeEntitlement()

  // A non-active subscription (past due / canceled) drops to Free.
  const effectiveTier =
    sub.status === SubscriptionStatus.ACTIVE ? tierToPlanId(sub.tier) : 'free'

  const limit = PLANS[effectiveTier].monthlyCredits
  const used = sub.usage[0]?.used ?? 0

  let apiKey: string | null = null
  if (effectiveTier !== 'free' && sub.geminiKeyCipher) {
    try {
      apiKey = decryptSecret(sub.geminiKeyCipher)
    } catch {
      apiKey = null // fall back to shared key if decryption fails
    }
  }

  return {
    subscriptionId: sub.id,
    tier: effectiveTier,
    model: getGeminiModelForPlan(effectiveTier),
    apiKey,
    creditLimit: limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    hasCredits: limit === null || used < limit,
  }
}

/** Reads the entitlement for the token on a request. */
export function resolveEntitlementFromRequest(
  request: Request
): Promise<Entitlement> {
  return resolveEntitlement(request.headers.get(TOKEN_HEADER))
}

export interface PublicEntitlement {
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
}

/** Client-safe projection of an entitlement — never includes the API key. */
export function toPublicEntitlement(e: Entitlement): PublicEntitlement {
  const plan = PLANS[e.tier]
  return {
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
