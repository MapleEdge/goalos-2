import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSession()
  const { id } = await params
  const events = await prisma.event.findMany({
    where: { entityId: id },
    orderBy: { occurredAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(events)
}
