import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const action = await prisma.action.findFirst({
    where: { id, goal: { userId } },
    include: { goal: true },
  })
  if (!action) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(action)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const existing = await prisma.action.findFirst({
    where: { id, goal: { userId } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const body = await request.json()
  const action = await prisma.action.update({
    where: { id },
    data: {
      title: body.title,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    },
  })

  await recordEvent('ACTION', id, 'UPDATED', {
    updatedFields: Object.keys(body),
  })

  return NextResponse.json(action)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const existing = await prisma.action.findFirst({
    where: { id, goal: { userId } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await recordEvent('ACTION', id, 'DELETED', {})
  await prisma.action.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
