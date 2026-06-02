'use client'

import { ArrowRight } from 'lucide-react'
import { useState } from 'react'

type InteractionType = 'MEETING' | 'EMAIL' | 'CALL' | 'MESSAGE' | 'NOTE'

const TYPES: { key: InteractionType; label: string; defaultDelta: number }[] = [
  { key: 'MEETING', label: 'Meeting', defaultDelta: 8 },
  { key: 'CALL', label: 'Call', defaultDelta: 6 },
  { key: 'EMAIL', label: 'Email', defaultDelta: 4 },
  { key: 'MESSAGE', label: 'Message', defaultDelta: 3 },
  { key: 'NOTE', label: 'Note', defaultDelta: 0 },
]

export function LogInteractionModal({
  stakeholderId,
  stakeholderName,
  currentStrength,
  suggestedNote,
  onClose,
  onDone,
}: {
  stakeholderId: string
  stakeholderName: string
  currentStrength: number
  suggestedNote?: string
  onClose: () => void
  onDone: () => void
}) {
  const [type, setType] = useState<InteractionType>('MEETING')
  const [note, setNote] = useState('')
  const [delta, setDelta] = useState(8)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  const projected = Math.max(0, Math.min(100, currentStrength + delta))

  function selectType(t: InteractionType, defaultDelta: number) {
    setType(t)
    setDelta(defaultDelta)
  }

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/stakeholders/${stakeholderId}/interactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            note: note.trim() || null,
            strengthDelta: delta,
            occurredAt: new Date(date).toISOString(),
          }),
        }
      )
      if (!res.ok) {
        const _data = await res.json().catch(() => ({}))
      }
    } catch (_err) {}
    setLoading(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-800">
            Log interaction — {stakeholderName}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-zinc-500">
          Type
        </label>
        <div className="mb-4 grid grid-cols-5 gap-1 rounded-lg bg-zinc-100 p-1">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => selectType(t.key, t.defaultDelta)}
              className={`rounded-md px-1 py-1.5 text-xs font-medium transition-colors ${
                type === t.key
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-xs font-medium text-zinc-500">
          What happened?
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={suggestedNote || 'Quick summary of the interaction…'}
          rows={3}
          className="mb-4 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />

        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Strength {delta >= 0 ? `+${delta}` : delta}
            </label>
            <input
              type="range"
              min={-20}
              max={20}
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="w-full accent-pink-500"
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <span>Relationship strength</span>
          <span className="flex items-center gap-1 font-medium text-zinc-900">
            {currentStrength}%
            <ArrowRight className="size-3" />
            {projected}%
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Log interaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
