'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface VehicleGoalData {
  id: string
  leverage: string | null
  goal: { id: string; title: string; status: string }
}

interface OpportunityData {
  id: string
  title: string
  description: string | null
  goalId: string | null
  realized: boolean
  realizedAt: string | null
  createdAt: string
}

interface ControlDimensionData {
  id: string
  name: string
  description: string | null
  value: number
  icon: string | null
  color: string | null
}

interface VehicleData {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  institution: string | null
  startDate: string | null
  endDate: string | null
  investmentNotes: string | null
  leverageScore: number
  createdAt: string
  value: { id: string; label: string; rank: number } | null
  vehicleGoals: VehicleGoalData[]
  opportunities: OpportunityData[]
  controlDimensions: ControlDimensionData[]
}

const STATUS_COLORS: Record<string, string> = {
  IDENTIFIED: 'bg-zinc-100 text-zinc-700',
  RESEARCHING: 'bg-blue-50 text-blue-700',
  ACQUIRING: 'bg-amber-50 text-amber-700',
  BUILDING: 'bg-orange-50 text-orange-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DORMANT: 'bg-zinc-100 text-zinc-500',
  RETIRED: 'bg-zinc-50 text-zinc-400',
}

const TYPE_ICONS: Record<string, string> = {
  EDUCATION: '🎓',
  EMPLOYMENT: '💼',
  BUSINESS: '🚀',
  ASSET: '🏠',
  PLATFORM: '📝',
  NETWORK: '🤝',
  ORGANIZATION: '🏛️',
  EVENT_SERIES: '🎉',
  SKILL: '🧠',
  OTHER: '📦',
}

const STATUS_FLOW = [
  'IDENTIFIED',
  'RESEARCHING',
  'ACQUIRING',
  'BUILDING',
  'ACTIVE',
  'DORMANT',
  'RETIRED',
]

export function VehicleDetail({ id }: { id: string }) {
  const router = useRouter()
  const [vehicle, setVehicle] = useState<VehicleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddDimension, setShowAddDimension] = useState(false)
  const [dimName, setDimName] = useState('')
  const [dimDescription, setDimDescription] = useState('')
  const [dimValue, setDimValue] = useState('50')
  const [dimIcon, setDimIcon] = useState('')
  const [dimColor, setDimColor] = useState('#6366f1')

  const load = useCallback(async () => {
    const res = await fetch(`/api/vehicles/${id}`)
    if (!res.ok) {
      router.push('/vehicles')
      return
    }
    const data: VehicleData = await res.json()
    setVehicle(data)
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete() {
    if (!confirm('Delete this vehicle? This cannot be undone.')) return
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
    router.push('/vehicles')
  }

  async function handleStatusChange(newStatus: string) {
    await fetch(`/api/vehicles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    load()
  }

  async function handleAddDimension() {
    if (!dimName.trim()) return
    await fetch(`/api/vehicles/${id}/control-dimensions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: dimName,
        description: dimDescription || null,
        value: Number(dimValue),
        icon: dimIcon || null,
        color: dimColor || null,
      }),
    })
    setDimName('')
    setDimDescription('')
    setDimValue('50')
    setDimIcon('')
    setDimColor('#6366f1')
    setShowAddDimension(false)
    load()
  }

  async function handleUpdateDimension(dimId: string, newValue: number) {
    await fetch(`/api/vehicles/${id}/control-dimensions/${dimId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newValue }),
    })
    load()
  }

  async function handleDeleteDimension(dimId: string) {
    await fetch(`/api/vehicles/${id}/control-dimensions/${dimId}`, {
      method: 'DELETE',
    })
    load()
  }

  async function handleMarkRealized(oppId: string) {
    await fetch(`/api/vehicles/${id}/opportunities/${oppId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ realized: true }),
    })
    load()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-zinc-200" />
          <div className="h-64 rounded-xl bg-zinc-100" />
        </div>
      </div>
    )
  }

  if (!vehicle) return null

  const currentStatusIndex = STATUS_FLOW.indexOf(vehicle.status)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/vehicles"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
        >
          ← Back to Vehicles
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{TYPE_ICONS[vehicle.type] || '📦'}</span>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                {vehicle.title}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[vehicle.status] || 'bg-zinc-100'}`}
                >
                  {vehicle.status}
                </span>
                <span className="text-sm text-zinc-500">
                  {vehicle.type.replace('_', ' ')}
                </span>
                {vehicle.institution && (
                  <span className="text-sm text-zinc-500">
                    · {vehicle.institution}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Status progression */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
          Acquisition Status
        </h2>
        <div className="flex items-center gap-1">
          {STATUS_FLOW.map((status, i) => {
            const isActive = i <= currentStatusIndex
            const isCurrent = status === vehicle.status
            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'bg-zinc-900 text-white'
                    : isActive
                      ? 'bg-zinc-200 text-zinc-700'
                      : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Details + Linked Goals */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          {vehicle.description && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold text-zinc-700">
                Description
              </h2>
              <p className="text-sm text-zinc-600">{vehicle.description}</p>
            </div>
          )}

          {/* Control Dimensions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">
                Control Dimensions ({vehicle.controlDimensions.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowAddDimension(true)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                + Add Dimension
              </button>
            </div>
            {vehicle.controlDimensions.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No control dimensions tracked yet. Add dimensions to monitor
                your extent of control.
              </p>
            ) : (
              <div className="space-y-3">
                {vehicle.controlDimensions.map((dim) => {
                  const pct = Math.min(100, Math.max(0, dim.value))
                  const barColor = dim.color || '#6366f1'
                  return (
                    <div
                      key={dim.id}
                      className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {dim.icon && (
                            <span className="text-base">{dim.icon}</span>
                          )}
                          <span className="text-sm font-medium text-zinc-800">
                            {dim.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-bold"
                            style={{ color: barColor }}
                          >
                            {pct}%
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDimension(dim.id)}
                            className="rounded p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 text-xs"
                            title="Remove"
                          >
                            \u2715
                          </button>
                        </div>
                      </div>
                      {dim.description && (
                        <p className="text-xs text-zinc-500 mb-2">
                          {dim.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 rounded-full bg-zinc-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={pct}
                          onChange={(e) =>
                            handleUpdateDimension(
                              dim.id,
                              Number(e.target.value)
                            )
                          }
                          className="w-20 h-1.5 accent-zinc-700"
                        />
                      </div>
                    </div>
                  )
                })}
                {/* Overall control score */}
                {vehicle.controlDimensions.length > 0 && (
                  <div className="rounded-lg border-2 border-zinc-300 bg-white p-3 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-700">
                        Overall Control
                      </span>
                      <span className="text-lg font-bold text-zinc-900">
                        {Math.round(
                          vehicle.controlDimensions.reduce(
                            (sum, d) => sum + d.value,
                            0
                          ) / vehicle.controlDimensions.length
                        )}
                        %
                      </span>
                    </div>
                    <div className="mt-1 h-3 rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-800 transition-all duration-300"
                        style={{
                          width: `${Math.round(
                            vehicle.controlDimensions.reduce(
                              (sum, d) => sum + d.value,
                              0
                            ) / vehicle.controlDimensions.length
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Linked Goals */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">
                Linked Goals ({vehicle.vehicleGoals.length})
              </h2>
            </div>
            {vehicle.vehicleGoals.length === 0 ? (
              <p className="text-sm text-zinc-400">No goals linked yet.</p>
            ) : (
              <div className="space-y-3">
                {vehicle.vehicleGoals.map((vg) => (
                  <div
                    key={vg.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-900">
                        {vg.goal.title}
                      </span>
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                        {vg.goal.status}
                      </span>
                    </div>
                    {vg.leverage && (
                      <p className="mt-1 text-xs text-zinc-500">
                        ↗ {vg.leverage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opportunities */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">
              Opportunities ({vehicle.opportunities.length})
            </h2>
            {vehicle.opportunities.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No opportunities recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {vehicle.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex items-start justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${opp.realized ? 'text-emerald-700' : 'text-zinc-900'}`}
                        >
                          {opp.realized ? '✓ ' : '○ '}
                          {opp.title}
                        </span>
                      </div>
                      {opp.description && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {opp.description}
                        </p>
                      )}
                      {opp.realizedAt && (
                        <p className="mt-1 text-xs text-emerald-600">
                          Realized{' '}
                          {new Date(opp.realizedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {!opp.realized && (
                      <button
                        type="button"
                        onClick={() => handleMarkRealized(opp.id)}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                      >
                        Mark realized
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Sidebar */}
        <div className="space-y-4">
          {/* Dates */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Details
            </h3>
            <dl className="space-y-2 text-sm">
              {vehicle.startDate && (
                <div>
                  <dt className="text-zinc-500">Started</dt>
                  <dd className="font-medium text-zinc-900">
                    {new Date(vehicle.startDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {vehicle.endDate && (
                <div>
                  <dt className="text-zinc-500">Ended</dt>
                  <dd className="font-medium text-zinc-900">
                    {new Date(vehicle.endDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {!vehicle.endDate && vehicle.startDate && (
                <div>
                  <dt className="text-zinc-500">Duration</dt>
                  <dd className="font-medium text-zinc-900">Ongoing</dd>
                </div>
              )}
              <div>
                <dt className="text-zinc-500">Leverage Score</dt>
                <dd className="font-medium text-zinc-900">
                  {vehicle.leverageScore}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Created</dt>
                <dd className="font-medium text-zinc-900">
                  {new Date(vehicle.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Investment */}
          {vehicle.investmentNotes && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Investment
              </h3>
              <p className="text-sm text-zinc-600">{vehicle.investmentNotes}</p>
            </div>
          )}

          {/* Aligned Value */}
          {vehicle.value && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Aligned Value
              </h3>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700">
                {vehicle.value.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Add Dimension Modal */}
      {showAddDimension && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900">
              Add Control Dimension
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Name
                </label>
                <input
                  value={dimName}
                  onChange={(e) => setDimName(e.target.value)}
                  placeholder="e.g. Financial Access, Army Control"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Description
                </label>
                <input
                  value={dimDescription}
                  onChange={(e) => setDimDescription(e.target.value)}
                  placeholder="What does this dimension measure?"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Initial Value (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={dimValue}
                    onChange={(e) => setDimValue(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Icon
                  </label>
                  <input
                    value={dimIcon}
                    onChange={(e) => setDimIcon(e.target.value)}
                    placeholder="💰"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Color
                  </label>
                  <input
                    type="color"
                    value={dimColor}
                    onChange={(e) => setDimColor(e.target.value)}
                    className="h-[38px] w-full cursor-pointer rounded-lg border border-zinc-300"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDimension(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDimension}
                disabled={!dimName.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Add Dimension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
