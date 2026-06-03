import { NextResponse } from 'next/server'
import { getEventTimeline, getRecentEvents } from '@/lib/events/store'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET(request: Request) {
  const userId = await requireAuthUserId()
  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')
  const limit = searchParams.get('limit')

  if (since) {
    const events = await getEventTimeline(userId, new Date(since))
    return NextResponse.json(events)
  }

  const events = await getRecentEvents(userId, limit ? parseInt(limit, 10) : 50)
  return NextResponse.json(events)
}
