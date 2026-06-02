import { prisma } from '@goalos/shared/lib/prisma'
import { PlanTier, SubscriptionStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import {
  resolveEntitlement,
  toPublicEntitlement,
} from '@/lib/server/entitlement'
import { isStripeConfigured } from '@/lib/server/stripe'

const DEV_TRIAL_DAYS = 60

/**
 * Local dev convenience: when Stripe isn't configured there's no way to start a
 * real trial, so new installs are granted a Pro trial automatically and the app
 * stays fully testable. In production (Stripe configured) new subs stay locked
 * (status NONE) until the user completes Checkout.
 */
function newSubscriptionData() {
  if (isStripeConfigured()) return {}
  return {
    tier: PlanTier.PRO,
    status: SubscriptionStatus.TRIALING,
    currentPeriodEnd: new Date(Date.now() + DEV_TRIAL_DAYS * 86_400_000),
  }
}

/**
 * Issues (or returns) the opaque subscription token the client stores and sends
 * with every AI request. Called once on first launch. New installs start locked
 * (status NONE, no AI) and must begin a Stripe trial to unlock; the token is
 * linked to a trialing/paid tier by the Stripe webhook, and drops to the metered
 * Free fallback on cancellation.
 */
export async function POST(request: Request) {
  let token: string | null = null
  try {
    const body = await request.json()
    if (typeof body?.token === 'string') token = body.token
  } catch {
    // no body — fall through to create a fresh subscription
  }

  if (token) {
    const existing = await prisma.subscription.findUnique({ where: { token } })
    if (existing) {
      const entitlement = await resolveEntitlement(token)
      return NextResponse.json({
        token: existing.token,
        ...toPublicEntitlement(entitlement),
      })
    }
  }

  const created = await prisma.subscription.create({
    data: newSubscriptionData(),
  })
  const entitlement = await resolveEntitlement(created.token)
  return NextResponse.json({
    token: created.token,
    ...toPublicEntitlement(entitlement),
  })
}
