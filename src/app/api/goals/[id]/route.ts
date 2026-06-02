import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession()
  const { id } = await params
  const goal = await prisma.goal.findUnique({
    where: { id, userId: session.user.id },
    include: {
      prerequisites: { include: { evidence: true } },
      actions: true,
      values: { select: { id: true, label: true } },
      relationshipsFrom: true,
      relationshipsTo: true,
    },
  })

  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }
  return NextResponse.json(goal)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession()
  const { id } = await params
  const body = await request.json()

  const existing = await prisma.goal.findUnique({ where: { id, userId: session.user.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  const goal = await prisma.goal.update({
    where: { id, userId: session.user.id },
    data: {
      title: body.title,
      description: body.description,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      successCriteria: body.successCriteria,
      status: body.status,
      ...(body.status === 'COMPLETED' && existing.status !== 'COMPLETED'
        ? { completedAt: new Date() }
        : {}),
      ...(body.status &&
      body.status !== 'COMPLETED' &&
      existing.status === 'COMPLETED'
        ? { completedAt: null }
        : {}),
      ...(body.valueIds !== undefined
        ? { values: { set: body.valueIds.map((vid: string) => ({ id: vid })) } }
        : {}),
    },
    include: {
      values: { select: { id: true, label: true } },
    },
  })

  const changes: Record<string, unknown> = {}
  if (body.status && body.status !== existing.status) {
    changes.statusChanged = { from: existing.status, to: body.status }
  }
  if (body.title && body.title !== existing.title) {
    changes.titleChanged = { from: existing.title, to: body.title }
  }

  await recordEvent('GOAL', goal.id, 'UPDATED', {
    ...changes,
    updatedFields: Object.keys(body),
  })

  return NextResponse.json(goal)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession()
  const { id } = await params
  await recordEvent('GOAL', id, 'DELETED', {})
  await prisma.goal.delete({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
