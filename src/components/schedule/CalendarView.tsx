'use client'

import type {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'

export interface ScheduleEvent {
  id: string
  title: string
  description?: string | null
  startTime: string
  endTime: string
  allDay: boolean
  location?: string | null
  source: 'GOALOS' | 'GOOGLE' | 'MICROSOFT'
  goalId?: string | null
  actionId?: string | null
  color?: string | null
  calendarConnection?: {
    provider: string
    accountEmail: string
  } | null
}

interface CalendarViewProps {
  events: ScheduleEvent[]
  onEventClick: (event: ScheduleEvent) => void
  onSlotSelect: (start: Date, end: Date, allDay: boolean) => void
  onEventDrop: (
    eventId: string,
    start: Date,
    end: Date,
    allDay: boolean
  ) => void
  onEventResize: (eventId: string, start: Date, end: Date) => void
}

function toFullCalendarEvents(events: ScheduleEvent[]): EventInput[] {
  return events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    start: ev.startTime,
    end: ev.endTime,
    allDay: ev.allDay,
    backgroundColor: ev.color || sourceColor(ev.source),
    borderColor: ev.color || sourceColor(ev.source),
    extendedProps: {
      description: ev.description,
      location: ev.location,
      source: ev.source,
      goalId: ev.goalId,
      actionId: ev.actionId,
    },
  }))
}

function sourceColor(source: string): string {
  switch (source) {
    case 'GOOGLE':
      return '#4285f4'
    case 'MICROSOFT':
      return '#00a4ef'
    default:
      return '#3b82f6'
  }
}

export function CalendarView({
  events,
  onEventClick,
  onSlotSelect,
  onEventDrop,
  onEventResize,
}: CalendarViewProps) {
  function handleEventClick(info: EventClickArg) {
    const raw = events.find((e) => e.id === info.event.id)
    if (raw) onEventClick(raw)
  }

  function handleSelect(info: DateSelectArg) {
    onSlotSelect(info.start, info.end, info.allDay)
  }

  function handleEventDrop(info: EventDropArg) {
    const start = info.event.start
    const end = info.event.end
    if (!start) return
    onEventDrop(
      info.event.id,
      start,
      end || new Date(start.getTime() + 60 * 60 * 1000),
      info.event.allDay
    )
  }

  function handleEventResize(info: EventResizeDoneArg) {
    const start = info.event.start
    const end = info.event.end
    if (!start || !end) return
    onEventResize(info.event.id, start, end)
  }

  return (
    <div className="fc-wrapper rounded-xl border border-zinc-200 bg-white p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        events={toFullCalendarEvents(events)}
        eventClick={handleEventClick}
        select={handleSelect}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        nowIndicator={true}
        height="auto"
        expandRows={true}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={true}
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
      />
    </div>
  )
}
