import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const existing = await prisma.scheduleEvent.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const newRecurrence: string | null = body.recurrence || null
  const hadRecurrence = existing.recurrence && existing.recurrence !== 'none'
  const wantsRecurrence = newRecurrence && newRecurrence !== 'none'

  const updated = await prisma.scheduleEvent.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && {
        description: body.description || null,
      }),
      ...(body.startTime !== undefined && {
        startTime: new Date(body.startTime),
      }),
      ...(body.endTime !== undefined && { endTime: new Date(body.endTime) }),
      ...(body.allDay !== undefined && { allDay: body.allDay }),
      ...(body.location !== undefined && {
        location: body.location || null,
      }),
      ...(body.color !== undefined && { color: body.color || null }),
      ...(body.recurrence !== undefined && { recurrence: newRecurrence }),
    },
  })

  if (wantsRecurrence && !hadRecurrence) {
    const count = RECURRENCE_COUNTS[newRecurrence] ?? 1
    const groupId = randomUUID()
    const startTime = body.startTime
      ? new Date(body.startTime)
      : existing.startTime
    const endTime = body.endTime ? new Date(body.endTime) : existing.endTime

    await prisma.scheduleEvent.update({
      where: { id },
      data: { recurrenceGroupId: groupId },
    })

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

    let curStart = advanceDate(startTime, newRecurrence)
    let curEnd = advanceDate(endTime, newRecurrence)
    for (let i = 1; i < count; i++) {
      records.push({
        title: updated.title,
        description: updated.description,
        startTime: new Date(curStart),
        endTime: new Date(curEnd),
        allDay: updated.allDay,
        location: updated.location,
        source: 'GOALOS',
        goalId: updated.goalId,
        actionId: updated.actionId,
        color: updated.color,
        recurrence: newRecurrence,
        recurrenceGroupId: groupId,
      })
      curStart = advanceDate(curStart, newRecurrence)
      curEnd = advanceDate(curEnd, newRecurrence)
    }

    if (records.length > 0) {
      await prisma.scheduleEvent.createMany({ data: records })
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const existing = await prisma.scheduleEvent.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  await prisma.scheduleEvent.delete({ where: { id } })

  return NextResponse.json({ deleted: true })
}
