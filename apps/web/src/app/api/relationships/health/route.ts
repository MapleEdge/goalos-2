import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { isAIAvailable } from '@/lib/reasoning/ai'
import { computeRelationshipHealth } from '@/lib/reasoning/relationships'

export async function GET() {
  const [stakeholders, goals, relationships] = await Promise.all([
    prisma.stakeholder.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.goal.findMany({
      where: { status: 'ACTIVE' },
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
