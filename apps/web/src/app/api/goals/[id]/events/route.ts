import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const goal = await prisma.goal.findUnique({ where: { id, userId } })
  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }
  const events = await prisma.event.findMany({
    where: { entityId: id },
    orderBy: { occurredAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(events)
}
