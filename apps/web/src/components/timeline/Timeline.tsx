'use client'

import { useEffect, useMemo, useState } from 'react'

interface TimelineEvent {
  id: string
  entityType: string
  entityId: string
  eventType: string
  payload: Record<string, unknown>
  occurredAt: string
}

const typeIcons: Record<string, string> = {
  GOAL: 'G',
  STAKEHOLDER: 'S',
  PREREQUISITE: 'P',
  EVIDENCE: 'E',
  ACTION: 'A',
}

const typeColors: Record<string, string> = {
  GOAL: 'bg-emerald-500',
  STAKEHOLDER: 'bg-pink-500',
  PREREQUISITE: 'bg-amber-500',
  EVIDENCE: 'bg-blue-500',
  ACTION: 'bg-violet-500',
}

const eventTypeLabels: Record<string, string> = {
  CREATED: 'Created',
  UPDATED: 'Updated',
  DELETED: 'Deleted',
  STATUS_CHANGED: 'Status changed',
  RELATIONSHIP_ADDED: 'Relationship added',
}

function formatPayload(payload: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue
    if (key === 'updatedFields' && Array.isArray(value)) {
      parts.push(`Fields: ${value.join(', ')}`)
    } else if (
      typeof value === 'object' &&
      value !== null &&
      'from' in value &&
      'to' in value
    ) {
      const change = value as { from: string; to: string }
      parts.push(`${key}: ${change.from} → ${change.to}`)
    } else if (typeof value === 'string' || typeof value === 'number') {
      parts.push(`${key}: ${value}`)
    }
  }
  return parts.join(' · ')
}

interface DateGroupedEvent {
  event: TimelineEvent
  date: string
  time: string
  showDate: boolean
}

export function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch('/api/events?limit=100')
      const data = await res.json()
      if (!cancelled) {
        setEvents(data)
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const groupedEvents = useMemo((): DateGroupedEvent[] => {
    const result: DateGroupedEvent[] = []
    for (let i = 0; i < events.length; i++) {
      const event = events[i]!
      const date = new Date(event.occurredAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      const time = new Date(event.occurredAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const prev = events[i - 1]
      const prevDate = prev
        ? new Date(prev.occurredAt).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : ''
      result.push({ event, date, time, showDate: date !== prevDate })
    }
    return result
  }, [events])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h2 className="text-lg font-semibold text-zinc-700 mb-2">
          No events yet
        </h2>
        <p className="text-sm text-zinc-500">
          Events will appear here as you create and update goals, stakeholders,
          evidence, and actions.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Timeline</h1>

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-200" />

        {groupedEvents.map(({ event, date, time, showDate }) => (
          <div key={event.id}>
            {showDate && (
              <div className="relative mb-4 mt-6 first:mt-0">
                <div className="ml-12 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  {date}
                </div>
              </div>
            )}
            <div className="relative flex items-start gap-3 pb-4">
              <div
                className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${
                  typeColors[event.entityType] || 'bg-zinc-400'
                }`}
              >
                {typeIcons[event.entityType] || '?'}
              </div>
              <div className="min-w-0 flex-1 rounded-lg border border-zinc-100 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-900">
                    {event.entityType.charAt(0) +
                      event.entityType.slice(1).toLowerCase()}
                  </span>
                  <span className="text-xs text-zinc-400">·</span>
                  <span className="text-xs text-zinc-600">
                    {eventTypeLabels[event.eventType] || event.eventType}
                  </span>
                  <span className="ml-auto text-xs text-zinc-400 tabular-nums">
                    {time}
                  </span>
                </div>
                {Object.keys(event.payload).length > 0 && (
                  <p className="text-xs text-zinc-500 truncate">
                    {formatPayload(event.payload)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
