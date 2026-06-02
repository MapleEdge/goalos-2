import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const connections = await prisma.calendarConnection.findMany({
    select: {
      id: true,
      provider: true,
      accountEmail: true,
      syncEnabled: true,
      lastSyncAt: true,
      calendarId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(connections)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // Delete synced events from this connection
  await prisma.scheduleEvent.deleteMany({
    where: { calendarConnectionId: id },
  })

  await prisma.calendarConnection.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
