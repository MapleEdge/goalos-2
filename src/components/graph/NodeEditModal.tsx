'use client'

import { useCallback, useEffect, useState } from 'react'

type NodeType = 'GOAL' | 'PREREQUISITE' | 'ACTION' | 'EVIDENCE' | 'STAKEHOLDER'

interface NodeEditModalProps {
  nodeId: string
  nodeType: NodeType
  onClose: () => void
  onSaved: () => void
}

const API_PATH: Record<NodeType, string> = {
  GOAL: '/api/goals',
  PREREQUISITE: '/api/prerequisites',
  ACTION: '/api/actions',
  EVIDENCE: '/api/evidence',
  STAKEHOLDER: '/api/stakeholders',
}

const STATUS_OPTIONS: Record<NodeType, string[]> = {
  GOAL: ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'],
  PREREQUISITE: ['PENDING', 'VALIDATED', 'FAILED'],
  ACTION: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
  EVIDENCE: [],
  STAKEHOLDER: [],
}

const PRIORITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'date'
  options?: string[]
}

function getFields(nodeType: NodeType): FieldConfig[] {
  switch (nodeType) {
    case 'GOAL':
      return [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS_OPTIONS.GOAL,
        },
        { key: 'targetDate', label: 'Target Date', type: 'date' },
        { key: 'successCriteria', label: 'Success Criteria', type: 'textarea' },
      ]
    case 'PREREQUISITE':
      return [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS_OPTIONS.PREREQUISITE,
        },
        { key: 'confidenceScore', label: 'Confidence (%)', type: 'number' },
      ]
    case 'ACTION':
      return [
        { key: 'title', label: 'Title', type: 'text' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS_OPTIONS.ACTION,
        },
        {
          key: 'priority',
          label: 'Priority',
          type: 'select',
          options: PRIORITY_OPTIONS,
        },
        { key: 'dueDate', label: 'Due Date', type: 'date' },
      ]
    case 'EVIDENCE':
      return [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'source', label: 'Source', type: 'text' },
      ]
    case 'STAKEHOLDER':
      return [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'organization', label: 'Organization', type: 'text' },
        { key: 'role', label: 'Role', type: 'text' },
        {
          key: 'relationshipStrength',
          label: 'Relationship Strength (%)',
          type: 'number',
        },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]
  }
}

function formatDateForInput(val: unknown): string {
  if (!val) return ''
  const d = new Date(val as string)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function NodeEditModal({
  nodeId,
  nodeType,
  onClose,
  onSaved,
}: NodeEditModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [error, setError] = useState<string | null>(null)

  const fields = getFields(nodeType)

  useEffect(() => {
    async function fetchEntity() {
      try {
        const res = await fetch(`${API_PATH[nodeType]}/${nodeId}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setValues(data)
      } catch {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchEntity()
  }, [nodeId, nodeType])

  const handleChange = useCallback((key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {}
      for (const field of fields) {
        const val = values[field.key]
        if (val !== undefined && val !== null && val !== '') {
          if (field.type === 'number') {
            payload[field.key] = Number(val)
          } else if (field.type === 'date') {
            payload[field.key] = new Date(val as string).toISOString()
          } else {
            payload[field.key] = val
          }
        }
      }

      const res = await fetch(`${API_PATH[nodeType]}/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved()
      onClose()
    } catch {
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete this ${nodeType.toLowerCase()}?`)) return
    try {
      const res = await fetch(`${API_PATH[nodeType]}/${nodeId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      onSaved()
      onClose()
    } catch {
      setError('Failed to delete')
    }
  }

  function getDisplayValue(field: FieldConfig): string {
    const val = values[field.key]
    if (val === undefined || val === null) return ''
    if (field.type === 'date') return formatDateForInput(val)
    return String(val)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Edit {nodeType.charAt(0) + nodeType.slice(1).toLowerCase()}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Click a field to edit
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {!loading &&
            fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-none resize-none"
                    rows={3}
                    value={getDisplayValue(field)}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-none bg-white"
                    value={getDisplayValue(field)}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    min={0}
                    max={
                      field.key.includes('Strength') ||
                      field.key.includes('confidence')
                        ? 100
                        : undefined
                    }
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-none"
                    value={getDisplayValue(field)}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-none"
                    value={getDisplayValue(field)}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-none"
                    value={getDisplayValue(field)}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 bg-zinc-50">
            <button
              onClick={handleDelete}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
