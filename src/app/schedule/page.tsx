'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarSettings } from '@/components/schedule/CalendarSettings'
import type { ScheduleEvent } from '@/components/schedule/CalendarView'
import { CalendarView } from '@/components/schedule/CalendarView'
import { EventModal } from '@/components/schedule/EventModal'

interface CalendarConnection {
  id: string
  provider: 'GOOGLE' | 'MICROSOFT'
  accountEmail: string
  syncEnabled: boolean
  lastSyncAt: string | null
}

export default function SchedulePage() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [modalStart, setModalStart] = useState(() => new Date())
  const [modalEnd, setModalEnd] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1)
    return d
  })
  const [modalAllDay, setModalAllDay] = useState(false)
  const [modalEvent, setModalEvent] = useState<ScheduleEvent | undefined>()

  const fetchEvents = useCallback(async () => {
    const res = await fetch('/api/schedule')
    const data = await res.json()
    setEvents(data)
  }, [])

  const fetchConnections = useCallback(async () => {
    const res = await fetch('/api/calendar/connections')
    const data = await res.json()
    setConnections(data)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      await Promise.all([fetchEvents(), fetchConnections()])
      if (!cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fetchEvents, fetchConnections])

  async function importGoalOSActions() {
    await fetch('/api/schedule/actions', { method: 'POST' })
    await fetchEvents()
  }

  function handleSlotSelect(start: Date, end: Date, allDay: boolean) {
    setModalMode('create')
    setModalStart(start)
    setModalEnd(end)
    setModalAllDay(allDay)
    setModalEvent(undefined)
    setModalOpen(true)
  }

  function handleEventClick(event: ScheduleEvent) {
    setModalMode('edit')
    setModalStart(new Date(event.startTime))
    setModalEnd(new Date(event.endTime))
    setModalAllDay(event.allDay)
    setModalEvent(event)
    setModalOpen(true)
  }

  async function handleEventDrop(
    eventId: string,
    start: Date,
    end: Date,
    allDay: boolean
  ) {
    await fetch(`/api/schedule/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        allDay,
      }),
    })
    await fetchEvents()
  }

  async function handleEventResize(eventId: string, start: Date, end: Date) {
    await fetch(`/api/schedule/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }),
    })
    await fetchEvents()
  }

  async function handleCreateEvent(eventData: {
    title: string
    description?: string
    startTime: string
    endTime: string
    allDay?: boolean
    location?: string
    color?: string
  }) {
    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    })
    setModalOpen(false)
    await fetchEvents()
  }

  async function handleUpdateEvent(eventData: {
    title: string
    description?: string
    startTime: string
    endTime: string
    allDay?: boolean
    location?: string
    color?: string
  }) {
    if (!modalEvent) return
    await fetch(`/api/schedule/${modalEvent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    })
    setModalOpen(false)
    await fetchEvents()
  }

  async function handleDeleteEvent() {
    if (!modalEvent) return
    await fetch(`/api/schedule/${modalEvent.id}`, {
      method: 'DELETE',
    })
    setModalOpen(false)
    await fetchEvents()
  }

  function closeModal() {
    setModalOpen(false)
    setModalEvent(undefined)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Schedule</h1>
          <p className="text-sm text-zinc-500">
            {connections.length > 0
              ? `${connections.length} calendar${connections.length > 1 ? 's' : ''} connected`
              : 'Connect a calendar to sync events'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={importGoalOSActions}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Import Actions
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="inline-block mr-1"
            >
              <path d="M6.5 1.5h3l.5 2.3 2-.8 2.1 2.1-.8 2 2.3.5v3l-2.3.5.8 2-2.1 2.1-2-.8-.5 2.3h-3l-.5-2.3-2 .8-2.1-2.1.8-2L.4 10.6v-3l2.3-.5-.8-2L4 3l2 .8.5-2.3z" />
              <circle cx="8" cy="8" r="2.5" />
            </svg>
            Calendars
          </button>
          <button
            onClick={() => {
              setModalMode('create')
              setModalStart(new Date())
              setModalEnd(new Date(Date.now() + 60 * 60 * 1000))
              setModalAllDay(false)
              setModalEvent(undefined)
              setModalOpen(true)
            }}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + New Event
          </button>
        </div>
      </div>

      {/* Calendar Settings Panel */}
      {showSettings && (
        <CalendarSettings
          connections={connections}
          onRefresh={() => {
            fetchConnections()
            fetchEvents()
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Calendar */}
      <CalendarView
        events={events}
        onEventClick={handleEventClick}
        onSlotSelect={handleSlotSelect}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
      />

      {/* Event Modal */}
      {modalOpen && (
        <EventModal
          mode={modalMode}
          start={modalStart}
          end={modalEnd}
          allDay={modalAllDay}
          event={modalEvent}
          onSave={modalMode === 'edit' ? handleUpdateEvent : handleCreateEvent}
          onDelete={modalMode === 'edit' ? handleDeleteEvent : undefined}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
