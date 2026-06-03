import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'
import {
  resolveEntitlementFromRequest,
  toPublicEntitlement,
} from '@/lib/server/entitlement'

/**
 * Returns the client-safe entitlement for the request's subscription token:
 * current tier, model labels, and credit usage. Never exposes the API key.
 */
export async function GET(request: Request) {
  await requireAuthUserId()
  const entitlement = await resolveEntitlementFromRequest(request)
  return NextResponse.json(toPublicEntitlement(entitlement))
}
