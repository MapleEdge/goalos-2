import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { getConnector } from '@/lib/calendar'

export async function POST(request: Request) {
  const body = await request.json()
  const { connectionId, timeMin, timeMax } = body

  if (!connectionId) {
    return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 })
  }

  const connection = await prisma.calendarConnection.findUnique({
    where: { id: connectionId },
  })

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const connector = getConnector(connection.provider)

  // Refresh token if expired
  let accessToken = connection.accessToken
  if (connection.tokenExpiry && connection.tokenExpiry < new Date()) {
    if (!connection.refreshToken) {
      return NextResponse.json(
        { error: 'Token expired and no refresh token available' },
        { status: 401 }
      )
    }
    try {
      const refreshed = await connector.refreshAccessToken(
        connection.refreshToken
      )
      accessToken = refreshed.accessToken
      await prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || connection.refreshToken,
          tokenExpiry: refreshed.expiresAt,
        },
      })
    } catch {
      return NextResponse.json(
        { error: 'Failed to refresh token. Please reconnect.' },
        { status: 401 }
      )
    }
  }

  const calendarId = connection.calendarId || 'primary'
  const min = timeMin ? new Date(timeMin) : new Date()
  const max = timeMax
    ? new Date(timeMax)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead

  try {
    const externalEvents = await connector.listEvents(
      accessToken,
      calendarId,
      min,
      max
    )

    const source = connection.provider === 'GOOGLE' ? 'GOOGLE' : 'MICROSOFT'

    // Upsert each external event
    let synced = 0
    for (const ev of externalEvents) {
      if (!ev.id) continue
      const existing = await prisma.scheduleEvent.findFirst({
        where: {
          externalId: ev.id,
          calendarConnectionId: connectionId,
        },
      })

      if (existing) {
        await prisma.scheduleEvent.update({
          where: { id: existing.id },
          data: {
            title: ev.title,
            description: ev.description || null,
            startTime: ev.startTime,
            endTime: ev.endTime,
            allDay: ev.allDay || false,
            location: ev.location || null,
          },
        })
      } else {
        await prisma.scheduleEvent.create({
          data: {
            title: ev.title,
            description: ev.description || null,
            startTime: ev.startTime,
            endTime: ev.endTime,
            allDay: ev.allDay || false,
            location: ev.location || null,
            source,
            externalId: ev.id,
            externalCalendarId: calendarId,
            calendarConnectionId: connectionId,
          },
        })
      }
      synced++
    }

    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    })

    return NextResponse.json({ synced, total: externalEvents.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
