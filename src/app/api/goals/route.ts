import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const goals = await prisma.goal.findMany({
    include: {
      prerequisites: { include: { evidence: true } },
      actions: true,
      value: { select: { id: true, label: true, rank: true } },
      values: { select: { id: true, label: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(goals)
}

export async function POST(request: Request) {
  const body = await request.json()
  const goal = await prisma.goal.create({
    data: {
      title: body.title,
      description: body.description,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      successCriteria: body.successCriteria,
      status: body.status || 'ACTIVE',
      valueId: body.valueId || null,
      ...(body.valueIds?.length
        ? { values: { connect: body.valueIds.map((id: string) => ({ id })) } }
        : {}),
    },
  })

  await recordEvent('GOAL', goal.id, 'CREATED', {
    title: goal.title,
    status: goal.status,
  })

  return NextResponse.json(goal, { status: 201 })
}
