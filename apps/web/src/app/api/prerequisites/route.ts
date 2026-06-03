import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET() {
  const userId = await requireAuthUserId()
  const prerequisites = await prisma.prerequisite.findMany({
    where: { goal: { userId } },
    include: { evidence: true, goal: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(prerequisites)
}

export async function POST(request: Request) {
  await requireAuthUserId()
  const body = await request.json()
  const prerequisite = await prisma.prerequisite.create({
    data: {
      title: body.title,
      description: body.description,
      status: body.status || 'NOT_STARTED',
      confidenceScore: body.confidenceScore ?? 0,
      goalId: body.goalId,
    },
  })

  await recordEvent('PREREQUISITE', prerequisite.id, 'CREATED', {
    title: prerequisite.title,
    goalId: prerequisite.goalId,
  })

  return NextResponse.json(prerequisite, { status: 201 })
}
