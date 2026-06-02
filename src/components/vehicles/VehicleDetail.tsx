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
    </div>
  )
}
