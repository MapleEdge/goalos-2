import type { NodeType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type EventPayload = Prisma.InputJsonObject

export async function recordEvent(
  entityType: NodeType,
  entityId: string,
  eventType: string,
  payload: EventPayload
) {
  return prisma.event.create({
    data: {
      entityType,
      entityId,
      eventType,
      payload,
    },
  })
}

export async function getEntityEvents(entityType: NodeType, entityId: string) {
  return prisma.event.findMany({
    where: { entityType, entityId },
    orderBy: { occurredAt: 'asc' },
  })
}

export async function getRecentEvents(limit = 50) {
  return prisma.event.findMany({
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })
}

export async function getEventTimeline(since?: Date) {
  return prisma.event.findMany({
    where: since ? { occurredAt: { gte: since } } : undefined,
    orderBy: { occurredAt: 'desc' },
    take: 200,
  })
}
