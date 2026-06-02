import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import {
  resolveEntitlement,
  toPublicEntitlement,
} from '@/lib/server/entitlement'

/**
 * Issues (or returns) the opaque subscription token the client stores and sends
 * with every AI request. Called once on first launch. New installs start on the
 * Free tier; the token is later linked to a paid tier by the Stripe webhook.
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

  const created = await prisma.subscription.create({ data: {} })
  const entitlement = await resolveEntitlement(created.token)
  return NextResponse.json({
    token: created.token,
    ...toPublicEntitlement(entitlement),
  })
}
