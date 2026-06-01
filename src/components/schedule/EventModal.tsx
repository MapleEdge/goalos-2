'use client'

import { useState } from 'react'
import type { ScheduleEvent } from './CalendarView'

interface EventModalProps {
  mode: 'create' | 'edit'
  start: Date
  end: Date
  allDay?: boolean
  event?: ScheduleEvent
  onSave: (data: {
    title: string
    description?: string
    startTime: string
    endTime: string
    allDay?: boolean
    location?: string
    color?: string
    recurrence?: string
  }) => void
  onDelete?: () => void
  onClose: () => void
}

const COLORS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Teal', value: '#14b8a6' },
]

export function EventModal({
  mode,
  start,
  end,
  allDay: initialAllDay,
  event,
  onSave,
  onDelete,
  onClose,
}: EventModalProps) {
  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [location, setLocation] = useState(event?.location || '')
  const [startTime, setStartTime] = useState(toLocalDatetime(start))
  const [endTime, setEndTime] = useState(toLocalDatetime(end))
  const [allDay, setAllDay] = useState(initialAllDay ?? event?.allDay ?? false)
  const [color, setColor] = useState(event?.color || '')
  const [recurrence, setRecurrence] = useState(event?.recurrence || 'none')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      allDay,
      location: location.trim() || undefined,
      color: color || undefined,
      recurrence: recurrence !== 'none' ? recurrence : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-zinc-900">
            {mode === 'edit' ? 'Edit Event' : 'New Event'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Source badge for edit mode */}
        {mode === 'edit' && event && (
          <div className="mb-3 flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: event.color || '#3b82f6' }}
            >
              {event.source}
            </span>
            {event.goalId && (
              <span className="text-xs text-zinc-500">Linked to goal</span>
            )}
            {event.actionId && (
              <span className="text-xs text-zinc-500">Linked to action</span>
            )}
          </div>
        )}

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add a location..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* All day toggle */}
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-zinc-300"
            />
            All day
          </label>

          {/* Date/time pickers */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">
                Start
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? startTime.split('T')[0] : startTime}
                onChange={(e) =>
                  setStartTime(
                    allDay ? `${e.target.value}T00:00` : e.target.value
                  )
                }
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">
                End
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? endTime.split('T')[0] : endTime}
                onChange={(e) =>
                  setEndTime(
                    allDay ? `${e.target.value}T23:59` : e.target.value
                  )
                }
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Repeat */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              Repeat
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              Color
            </label>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(color === c.value ? '' : c.value)}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${
                    color === c.value
                      ? 'border-zinc-900 scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between">
          <div>
            {mode === 'edit' &&
              onDelete &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">
                    Delete this event?
                  </span>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {mode === 'edit' ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function toLocalDatetime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
