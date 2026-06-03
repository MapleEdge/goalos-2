import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { isAIAvailable } from '@/lib/reasoning/ai'
import { computeRelationshipHealth } from '@/lib/reasoning/relationships'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET() {
  const userId = await requireAuthUserId()
  const [stakeholders, goals, relationships] = await Promise.all([
    prisma.stakeholder.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.goal.findMany({
      where: { status: 'ACTIVE', userId },
      select: { id: true, title: true, status: true },
    }),
    prisma.relationship.findMany({
      select: { fromType: true, fromId: true, toType: true, toId: true },
    }),
  ])

  const health = computeRelationshipHealth(
    stakeholders.map((s) => ({
      id: s.id,
      name: s.name,
      organization: s.organization,
      role: s.role,
      relationshipStrength: s.relationshipStrength,
      lastInteraction: s.lastInteraction,
      notes: s.notes,
    })),
    goals,
    relationships
  )

  return NextResponse.json({
    health,
    generatedAt: new Date().toISOString(),
    aiAvailable: isAIAvailable(),
  })
}
