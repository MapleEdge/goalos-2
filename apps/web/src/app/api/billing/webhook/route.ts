import logger from '@goalos/shared/lib/logger'
import { prisma } from '@goalos/shared/lib/prisma'
import { PlanTier, SubscriptionStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import type { PlanId } from '@/lib/plan'
import { encryptSecret } from '@/lib/server/crypto'
import { planIdToTier } from '@/lib/server/entitlement'
import { provisionGeminiKey, revokeGeminiKey } from '@/lib/server/googleKeys'
import { getStripe, planForPriceId } from '@/lib/server/stripe'

// Stripe needs the raw request body to verify the signature.
export const dynamic = 'force-dynamic'

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return SubscriptionStatus.TRIALING
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'past_due':
    case 'unpaid':
      return SubscriptionStatus.PAST_DUE
    case 'incomplete':
    case 'incomplete_expired':
      return SubscriptionStatus.INCOMPLETE
    default:
      return SubscriptionStatus.CANCELED
  }
}

/** Trialing and active subscriptions grant full paid-tier access. */
function isEntitledStatus(s: SubscriptionStatus): boolean {
  return s === SubscriptionStatus.TRIALING || s === SubscriptionStatus.ACTIVE
}

/** Provisions and stores a per-customer Gemini key once, for paid tiers. */
async function ensureCustomerKey(subscriptionId: string, tier: PlanId) {
  if (tier === 'free') return
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  })
  if (!sub || sub.geminiKeyCipher) return // already provisioned

  const provisioned = await provisionGeminiKey(
    `goalos-${sub.token.slice(0, 8)}`
  )
  if (!provisioned) return // provisioning not configured — falls back to shared key

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      geminiKeyCipher: encryptSecret(provisioned.keyString),
      geminiKeyResource: provisioned.resourceName,
    },
  })
}

async function applySubscription(stripeSub: Stripe.Subscription) {
  const token = stripeSub.metadata?.token
  const priceId = stripeSub.items.data[0]?.price.id
  const plan = planForPriceId(priceId) ?? 'pro'
  const tier = planIdToTier(plan)
  const status = mapStatus(stripeSub.status)
  const periodEnd = stripeSub.items.data[0]?.current_period_end

  const sub = token
    ? await prisma.subscription.findUnique({ where: { token } })
    : await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: stripeSub.id },
      })
  if (!sub) {
    logger.warn(
      { token, sub: stripeSub.id },
      'webhook: no subscription matched'
    )
    return
  }

  const entitled = isEntitledStatus(status)
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      tier: entitled ? tier : PlanTier.FREE,
      status,
      stripeSubscriptionId: stripeSub.id,
      stripeCustomerId:
        typeof stripeSub.customer === 'string'
          ? stripeSub.customer
          : stripeSub.customer.id,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    },
  })

  // Provision the customer's key as soon as they're entitled (trial included).
  if (entitled) {
    await ensureCustomerKey(sub.id, plan)
  }
}

async function cancelSubscription(stripeSub: Stripe.Subscription) {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSub.id },
  })
  if (!sub) return

  if (sub.geminiKeyResource) {
    await revokeGeminiKey(sub.geminiKeyResource)
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      tier: PlanTier.FREE,
      status: SubscriptionStatus.CANCELED,
      geminiKeyCipher: null,
      geminiKeyResource: null,
    },
  })
}

export async function POST(request: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: 'Billing is not configured' },
      { status: 503 }
    )
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    logger.warn({ err }, 'webhook: signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.subscription) {
          const stripeSub = await stripe.subscriptions.retrieve(
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          )
          // Carry the install token from the checkout session onto the sub.
          if (session.metadata?.token && !stripeSub.metadata?.token) {
            stripeSub.metadata = {
              ...stripeSub.metadata,
              token: session.metadata.token,
            }
          }
          await applySubscription(stripeSub)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await applySubscription(event.data.object)
        break
      case 'customer.subscription.deleted':
        await cancelSubscription(event.data.object)
        break
      default:
        break
    }
  } catch (err) {
    logger.error({ err, type: event.type }, 'webhook: handler failed')
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
