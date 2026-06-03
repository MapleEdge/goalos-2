import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'
import { appBaseUrl, getStripe } from '@/lib/server/stripe'

/**
 * Opens the Stripe customer billing portal so a subscriber can manage or cancel
 * their plan. Requires a token already linked to a Stripe customer (i.e. paid).
 */
export async function POST(request: Request) {
  await requireAuthUserId()
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Billing is not configured' },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const token: unknown = body?.token
  if (typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const sub = await prisma.subscription.findUnique({ where: { token } })
  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account for this subscription' },
      { status: 404 }
    )
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appBaseUrl()}/settings`,
  })

  return NextResponse.json({ url: session.url })
}
