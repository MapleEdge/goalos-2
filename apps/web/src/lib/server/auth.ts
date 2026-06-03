import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * Get the authenticated user's ID from the session.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * Require an authenticated user. Returns the user ID or throws a Response
 * that the caller can return directly.
 */
export async function requireAuthUserId(): Promise<string> {
  const userId = await getAuthUserId()
  if (!userId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return userId
}

/**
 * Return all entity IDs owned by the given user.
 * Used to scope resource-flows, events, etc. that reference entities
 * via entityType/entityId rather than a direct userId FK.
 */
export async function getUserEntityIds(userId: string): Promise<string[]> {
  const [goals, vehicles, stakeholders] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, select: { id: true } }),
    prisma.vehicle.findMany({ where: { userId }, select: { id: true } }),
    prisma.stakeholder.findMany({ where: { userId }, select: { id: true } }),
  ])

  const goalIds = goals.map((g) => g.id)
  const vehicleIds = vehicles.map((v) => v.id)
  const stakeholderIds = stakeholders.map((s) => s.id)

  const [actions, prerequisites, evidence] = await Promise.all([
    goalIds.length
      ? prisma.action.findMany({
          where: { goalId: { in: goalIds } },
          select: { id: true },
        })
      : [],
    goalIds.length
      ? prisma.prerequisite.findMany({
          where: { goalId: { in: goalIds } },
          select: { id: true },
        })
      : [],
    goalIds.length
      ? prisma.evidence.findMany({
          where: { prerequisite: { goalId: { in: goalIds } } },
          select: { id: true },
        })
      : [],
  ])

  return [
    ...goalIds,
    ...vehicleIds,
    ...stakeholderIds,
    ...actions.map((a) => a.id),
    ...prerequisites.map((p) => p.id),
    ...evidence.map((e) => e.id),
  ]
}

/**
 * Wrapper for API route handlers that enforces authentication.
 * Catches the NextResponse thrown by requireAuthUserId().
 */
export function withAuth<T>(
  handler: (userId: string, ...args: T[]) => Promise<NextResponse>
) {
  return async (...args: T[]): Promise<NextResponse> => {
    try {
      const userId = await requireAuthUserId()
      return await handler(userId, ...args)
    } catch (err) {
      if (err instanceof NextResponse) return err
      throw err
    }
  }
}
