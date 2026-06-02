import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAIAvailable } from '@/lib/reasoning/ai'
import { computeRelationshipHealth } from '@/lib/reasoning/relationships'
import { requireSession } from '@/lib/session'

export async function GET() {
  const session = await requireSession()
  const [stakeholders, goals, relationships] = await Promise.all([
    prisma.stakeholder.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.goal.findMany({
      where: { status: 'ACTIVE', userId: session.user.id },
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
