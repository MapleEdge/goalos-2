'use client'

import { useState } from 'react'

type CreatableType = 'GOAL' | 'VEHICLE' | 'STAKEHOLDER'

interface NodeCreateModalProps {
  onClose: () => void
  onCreated: () => void
}

const ENTITY_TYPES: { value: CreatableType; label: string; color: string }[] = [
  { value: 'GOAL', label: 'Goal', color: '#10b981' },
  { value: 'VEHICLE', label: 'Vehicle', color: '#06b6d4' },
  { value: 'STAKEHOLDER', label: 'Stakeholder', color: '#ec4899' },
]

const VEHICLE_TYPES = [
  'EDUCATION',
  'EMPLOYMENT',
  'BUSINESS',
  'ASSET',
  'PLATFORM',
  'NETWORK',
  'ORGANIZATION',
  'EVENT_SERIES',
  'SKILL',
  'OTHER',
]

const VEHICLE_STATUSES = [
  'IDENTIFIED',
  'RESEARCHING',
  'ACQUIRING',
  'BUILDING',
  'ACTIVE',
  'DORMANT',
  'RETIRED',
]

const GOAL_STATUSES = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED']

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-none'

export function NodeCreateModal({ onClose, onCreated }: NodeCreateModalProps) {
  const [entityType, setEntityType] = useState<CreatableType>('GOAL')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Goal fields
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDescription, setGoalDescription] = useState('')
  const [goalStatus, setGoalStatus] = useState('ACTIVE')

  // Vehicle fields
  const [vehicleTitle, setVehicleTitle] = useState('')
  const [vehicleDescription, setVehicleDescription] = useState('')
  const [vehicleType, setVehicleType] = useState('EDUCATION')
  const [vehicleStatus, setVehicleStatus] = useState('IDENTIFIED')
  const [vehicleInstitution, setVehicleInstitution] = useState('')

  // Stakeholder fields
  const [stakeholderName, setStakeholderName] = useState('')
  const [stakeholderOrg, setStakeholderOrg] = useState('')
  const [stakeholderRole, setStakeholderRole] = useState('')

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      let url = ''
      let payload: Record<string, unknown> = {}

      switch (entityType) {
        case 'GOAL':
          if (!goalTitle.trim()) {
            setError('Title is required')
            setSaving(false)
            return
          }
          url = '/api/goals'
          payload = {
            title: goalTitle,
            description: goalDescription || null,
            status: goalStatus,
          }
          break
        case 'VEHICLE':
          if (!vehicleTitle.trim()) {
            setError('Title is required')
            setSaving(false)
            return
          }
          url = '/api/vehicles'
          payload = {
            title: vehicleTitle,
            description: vehicleDescription || null,
            type: vehicleType,
            status: vehicleStatus,
            institution: vehicleInstitution || null,
          }
          break
        case 'STAKEHOLDER':
          if (!stakeholderName.trim()) {
            setError('Name is required')
            setSaving(false)
            return
          }
          url = '/api/stakeholders'
          payload = {
            name: stakeholderName,
            organization: stakeholderOrg || null,
            role: stakeholderRole || null,
          }
          break
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create')
      onCreated()
      onClose()
    } catch {
      setError('Failed to create entity')
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
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">
            Create Node
          </h2>
          <button
            type="button"
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

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Entity type selector */}
          <div className="flex gap-2">
            {ENTITY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setEntityType(t.value)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border-2 transition-colors ${
                  entityType === t.value
                    ? 'text-white'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                }`}
                style={
                  entityType === t.value
                    ? { backgroundColor: t.color, borderColor: t.color }
                    : undefined
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Goal fields */}
          {entityType === 'GOAL' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Graduate with 3.0 GPA"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Description
                </label>
                <textarea
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  className={inputClass}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Status
                </label>
                <select
                  value={goalStatus}
                  onChange={(e) => setGoalStatus(e.target.value)}
                  className={inputClass}
                >
                  {GOAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Vehicle fields */}
          {entityType === 'VEHICLE' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={vehicleTitle}
                  onChange={(e) => setVehicleTitle(e.target.value)}
                  placeholder='e.g. "CS Degree at MIT"'
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Description
                </label>
                <textarea
                  value={vehicleDescription}
                  onChange={(e) => setVehicleDescription(e.target.value)}
                  className={inputClass}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className={inputClass}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Status
                  </label>
                  <select
                    value={vehicleStatus}
                    onChange={(e) => setVehicleStatus(e.target.value)}
                    className={inputClass}
                  >
                    {VEHICLE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  value={vehicleInstitution}
                  onChange={(e) => setVehicleInstitution(e.target.value)}
                  placeholder='e.g. "MIT", "Stripe"'
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Stakeholder fields */}
          {entityType === 'STAKEHOLDER' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={stakeholderName}
                  onChange={(e) => setStakeholderName(e.target.value)}
                  placeholder="e.g. Dr. Patel"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  value={stakeholderOrg}
                  onChange={(e) => setStakeholderOrg(e.target.value)}
                  placeholder="e.g. MIT"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={stakeholderRole}
                  onChange={(e) => setStakeholderRole(e.target.value)}
                  placeholder="e.g. Professor, Investor"
                  className={inputClass}
                />
              </div>
            </>
          )}
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
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
