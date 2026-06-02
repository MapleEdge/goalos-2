import 'server-only'
import Stripe from 'stripe'
import type { PlanId } from '@/lib/plan'

let cached: Stripe | null = null

export function getStripe(): Stripe | null {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  cached = new Stripe(key)
  return cached
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** Stripe Price id configured for a paid plan, or null when unset. */
export function priceIdForPlan(plan: PlanId): string | null {
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO ?? null
  if (plan === 'max') return process.env.STRIPE_PRICE_MAX ?? null
  return null
}

/** Resolves a Stripe Price id back to the plan it represents. */
export function planForPriceId(
  priceId: string | null | undefined
): PlanId | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_MAX) return 'max'
  return null
}

/** Public base URL used to build Checkout success/cancel redirects. */
export function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'
  )
}
