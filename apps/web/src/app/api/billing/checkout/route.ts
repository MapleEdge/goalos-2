import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { isPlanId, type PlanId } from '@/lib/plan'
import { appBaseUrl, getStripe, priceIdForPlan } from '@/lib/server/stripe'

/**
 * Starts a Stripe Checkout session for a paid plan. The subscription token is
 * carried in metadata so the webhook can link the resulting Stripe subscription
 * back to this install and provision the customer's API key.
 */
export async function POST(request: Request) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Billing is not configured' },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const plan: unknown = body?.plan
  if (!isPlanId(plan) || plan === 'free') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }
  const priceId = priceIdForPlan(plan as PlanId)
  if (!priceId) {
    return NextResponse.json(
      { error: `No price configured for ${plan}` },
      { status: 503 }
    )
  }

  // Ensure a subscription row + token exist for this install.
  let token: string | null = typeof body?.token === 'string' ? body.token : null
  let sub = token
    ? await prisma.subscription.findUnique({ where: { token } })
    : null
  if (!sub) {
    sub = await prisma.subscription.create({ data: {} })
    token = sub.token
  }

  // Pro includes a 2-month free trial (card collected, $0 until it ends).
  // Max has no trial and is charged immediately.
  const TRIAL_DAYS = 60
  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
    {
      metadata: { token: sub.token, plan },
      ...(plan === 'pro' ? { trial_period_days: TRIAL_DAYS } : {}),
    }

  const base = appBaseUrl()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: sub.token,
    metadata: { token: sub.token, plan },
    subscription_data: subscriptionData,
    ...(sub.stripeCustomerId ? { customer: sub.stripeCustomerId } : {}),
    success_url: `${base}/pricing?status=success`,
    cancel_url: `${base}/pricing?status=cancelled`,
  })

  return NextResponse.json({ url: session.url, token: sub.token })
}
