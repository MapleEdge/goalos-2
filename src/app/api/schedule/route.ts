import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  const where: Record<string, unknown> = {}
  if (start || end) {
    where.startTime = {}
    if (start) (where.startTime as Record<string, Date>).gte = new Date(start)
    if (end) (where.startTime as Record<string, Date>).lte = new Date(end)
  }

  const events = await prisma.scheduleEvent.findMany({
    where,
    orderBy: { startTime: 'asc' },
    include: {
      calendarConnection: {
        select: { provider: true, accountEmail: true },
      },
    },
  })

  return NextResponse.json(events)
}

export async function POST(request: Request) {
  const body = await request.json()

  const event = await prisma.scheduleEvent.create({
    data: {
      title: body.title,
      description: body.description || null,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      allDay: body.allDay || false,
      location: body.location || null,
      source: 'GOALOS',
      goalId: body.goalId || null,
      actionId: body.actionId || null,
      color: body.color || null,
    },
  })

  return NextResponse.json(event, { status: 201 })
}
