import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const events = await prisma.event.findMany({
    where: { entityId: id },
    orderBy: { occurredAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(events)
}
