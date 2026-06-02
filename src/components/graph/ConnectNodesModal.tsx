'use client'

import { useState } from 'react'

interface ConnectNodesModalProps {
  fromId: string
  fromLabel: string
  fromType: string
  toId: string
  toLabel: string
  toType: string
  onClose: () => void
  onCreated: () => void
}

export function ConnectNodesModal({
  fromId,
  fromLabel,
  fromType,
  toId,
  toLabel,
  toType,
  onClose,
  onCreated,
}: ConnectNodesModalProps) {
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromType,
          fromId,
          toType,
          toId,
          label: label.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create relationship')
      onCreated()
      onClose()
    } catch {
      setError('Failed to create connection')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">
            Connect Nodes
          </h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="rounded bg-zinc-100 px-2 py-1 font-medium text-zinc-800 truncate max-w-[140px]">
              {fromLabel}
            </span>
            <svg
              className="h-4 w-4 text-zinc-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
            <span className="rounded bg-zinc-100 px-2 py-1 font-medium text-zinc-800 truncate max-w-[140px]">
              {toLabel}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Relationship Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. "accelerates", "mentors", "requires"'
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
