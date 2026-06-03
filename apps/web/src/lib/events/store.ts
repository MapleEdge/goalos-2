import logger from '@goalos/shared/lib/logger'
import { prisma } from '@goalos/shared/lib/prisma'
import type { NodeType, Prisma } from '@prisma/client'
import type { TxClient } from '@/lib/db/transaction'
import { getUserEntityIds } from '@/lib/server/auth'

export type EventPayload = Prisma.InputJsonObject

/**
 * Record an event inside an existing transaction.
 * Prefer this over the standalone variant when the caller already holds a `tx`.
 */
export async function recordEventInTransaction(
  tx: TxClient,
  entityType: NodeType,
  entityId: string,
  eventType: string,
  payload: EventPayload
) {
  try {
    // The tx client mirrors PrismaClient's model accessors at runtime.
    const client = tx as unknown as {
      event: {
        create: (args: {
          data: {
            entityType: NodeType
            entityId: string
            eventType: string
            payload: EventPayload
          }
        }) => Promise<unknown>
      }
    }
    return await client.event.create({
      data: { entityType, entityId, eventType, payload },
    })
  } catch (err) {
    logger.error(
      { err, entityType, entityId, eventType },
      'event store: failed to record event in transaction'
    )
    throw err
  }
}

/**
 * @deprecated Use {@link recordEventInTransaction} inside a `withTransaction`
 * block for atomic writes. This standalone helper is kept for backward
 * compatibility.
 */
export async function recordEvent(
  entityType: NodeType,
  entityId: string,
  eventType: string,
  payload: EventPayload
) {
  try {
    return await prisma.event.create({
      data: { entityType, entityId, eventType, payload },
    })
  } catch (err) {
    logger.error(
      { err, entityType, entityId, eventType },
      'event store: failed to record event'
    )
    throw err
  }
}

export async function getEntityEvents(entityType: NodeType, entityId: string) {
  return prisma.event.findMany({
    where: { entityType, entityId },
    orderBy: { occurredAt: 'asc' },
  })
}

export async function getRecentEvents(userId: string, limit = 50) {
  const entityIds = await getUserEntityIds(userId)
  if (entityIds.length === 0) return []

  return prisma.event.findMany({
    where: { entityId: { in: entityIds } },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })
}

export async function getEventTimeline(userId: string, since?: Date) {
  const entityIds = await getUserEntityIds(userId)
  if (entityIds.length === 0) return []

  return prisma.event.findMany({
    where: {
      entityId: { in: entityIds },
      ...(since ? { occurredAt: { gte: since } } : {}),
    },
    orderBy: { occurredAt: 'desc' },
    take: 200,
  })
}
