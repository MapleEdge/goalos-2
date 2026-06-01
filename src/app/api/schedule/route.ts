import { randomUUID } from 'node:crypto'
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

const RECURRENCE_COUNTS: Record<string, number> = {
  daily: 30,
  weekly: 12,
  monthly: 6,
  yearly: 3,
}

function advanceDate(date: Date, recurrence: string): Date {
  const d = new Date(date)
  if (recurrence === 'daily') d.setDate(d.getDate() + 1)
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (recurrence === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return d
}

export async function POST(request: Request) {
  const body = await request.json()
  const recurrence: string | null = body.recurrence || null
  const count =
    recurrence && recurrence !== 'none'
      ? (RECURRENCE_COUNTS[recurrence] ?? 1)
      : 1
  const groupId = count > 1 ? randomUUID() : null

  const baseStart = new Date(body.startTime)
  const baseEnd = new Date(body.endTime)

  const records: Array<{
    title: string
    description: string | null
    startTime: Date
    endTime: Date
    allDay: boolean
    location: string | null
    source: 'GOALOS'
    goalId: string | null
    actionId: string | null
    color: string | null
    recurrence: string | null
    recurrenceGroupId: string | null
  }> = []

  let curStart = baseStart
  let curEnd = baseEnd
  for (let i = 0; i < count; i++) {
    records.push({
      title: body.title,
      description: body.description || null,
      startTime: new Date(curStart),
      endTime: new Date(curEnd),
      allDay: body.allDay || false,
      location: body.location || null,
      source: 'GOALOS',
      goalId: body.goalId || null,
      actionId: body.actionId || null,
      color: body.color || null,
      recurrence,
      recurrenceGroupId: groupId,
    })
    if (i < count - 1) {
      curStart = advanceDate(curStart, recurrence!)
      curEnd = advanceDate(curEnd, recurrence!)
    }
  }

  if (records.length === 1) {
    const event = await prisma.scheduleEvent.create({ data: records[0]! })
    return NextResponse.json(event, { status: 201 })
  }

  await prisma.scheduleEvent.createMany({ data: records })
  const created = await prisma.scheduleEvent.findMany({
    where: { recurrenceGroupId: groupId },
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json(created, { status: 201 })
}
