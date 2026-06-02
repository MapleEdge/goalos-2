'use client'

import { useEffect, useState } from 'react'

const VEHICLE_TYPES = [
  { value: 'EDUCATION', label: 'Education', icon: '🎓' },
  { value: 'EMPLOYMENT', label: 'Employment', icon: '💼' },
  { value: 'BUSINESS', label: 'Business', icon: '🚀' },
  { value: 'ASSET', label: 'Asset', icon: '🏠' },
  { value: 'PLATFORM', label: 'Platform', icon: '📝' },
  { value: 'NETWORK', label: 'Network', icon: '🤝' },
  { value: 'ORGANIZATION', label: 'Organization', icon: '🏛️' },
  { value: 'EVENT_SERIES', label: 'Event Series', icon: '🎉' },
  { value: 'SKILL', label: 'Skill', icon: '🧠' },
  { value: 'OTHER', label: 'Other', icon: '📦' },
]

const VEHICLE_STATUSES = [
  { value: 'IDENTIFIED', label: 'Identified' },
  { value: 'RESEARCHING', label: 'Researching' },
  { value: 'ACQUIRING', label: 'Acquiring' },
  { value: 'BUILDING', label: 'Building' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DORMANT', label: 'Dormant' },
  { value: 'RETIRED', label: 'Retired' },
]

interface ValueOption {
  id: string
  label: string
}

interface CreateVehicleFormProps {
  onCreated: () => void
  onCancel: () => void
}

export function CreateVehicleForm({
  onCreated,
  onCancel,
}: CreateVehicleFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('EDUCATION')
  const [status, setStatus] = useState('IDENTIFIED')
  const [institution, setInstitution] = useState('')
  const [investmentNotes, setInvestmentNotes] = useState('')
  const [valueId, setValueId] = useState('')
  const [values, setValues] = useState<ValueOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/values')
      .then((r) => r.json())
      .then((data: ValueOption[]) => setValues(data))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || null,
        type,
        status,
        institution: institution || null,
        investmentNotes: investmentNotes || null,
        valueId: valueId || null,
      }),
    })
    setSaving(false)
    onCreated()
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500'
  const labelClass = 'block text-sm font-medium text-zinc-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>
          Title *
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "CS Degree at MIT"'
            className={inputClass}
            required
          />
        </label>
      </div>

      <div>
        <label className={labelClass}>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What leverage does this vehicle provide?"
            className={inputClass}
            rows={2}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>
            Type *
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label className={labelClass}>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              {VEHICLE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Institution / Organization
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder='e.g. "MIT", "Stripe", "Grace Church"'
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <label className={labelClass}>
          Aligned Value
          <select
            value={valueId}
            onChange={(e) => setValueId(e.target.value)}
            className={inputClass}
          >
            <option value="">None</option>
            {values.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label className={labelClass}>
          Investment Notes
          <textarea
            value={investmentNotes}
            onChange={(e) => setInvestmentNotes(e.target.value)}
            placeholder="Time, money, effort required..."
            className={inputClass}
            rows={2}
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Vehicle'}
        </button>
      </div>
    </form>
  )
}
