'use client'

import { Modal } from '@goalos/ui/components/Modal'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { VehicleTypeIcon } from '@/lib/icons'
import { CreateVehicleForm } from './CreateVehicleForm'

interface VehicleData {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  institution: string | null
  startDate: string | null
  leverageScore: number
  value: { id: string; label: string; rank: number } | null
  values: { id: string; label: string }[]
  vehicleGoals: {
    id: string
    leverage: string | null
    goal: { id: string; title: string; status: string }
  }[]
  opportunities: { id: string; realized: boolean }[]
}

const STATUS_ORDER = [
  'ACTIVE',
  'BUILDING',
  'ACQUIRING',
  'RESEARCHING',
  'IDENTIFIED',
  'DORMANT',
  'RETIRED',
]

const STATUS_COLORS: Record<string, string> = {
  IDENTIFIED: 'bg-zinc-100 text-zinc-700',
  RESEARCHING: 'bg-blue-50 text-blue-700',
  ACQUIRING: 'bg-amber-50 text-amber-700',
  BUILDING: 'bg-orange-50 text-orange-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DORMANT: 'bg-zinc-100 text-zinc-500',
  RETIRED: 'bg-zinc-50 text-zinc-400',
}

type FilterStatus = 'ALL' | 'ACTIVE_BUILDING' | string

export function VehiclesList() {
  const [vehicles, setVehicles] = useState<VehicleData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('ALL')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/vehicles')
    const data: VehicleData[] = await res.json()
    setVehicles(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = vehicles.filter((v) => {
    if (filter === 'ALL') return true
    if (filter === 'ACTIVE_BUILDING')
      return v.status === 'ACTIVE' || v.status === 'BUILDING'
    return v.status === filter
  })

  const sorted = [...filtered].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status)
    const bi = STATUS_ORDER.indexOf(b.status)
    if (ai !== bi) return ai - bi
    return b.leverageScore - a.leverageScore
  })

  const totalOpportunities = vehicles.reduce(
    (sum, v) => sum + v.opportunities.length,
    0
  )
  const realizedOpportunities = vehicles.reduce(
    (sum, v) => sum + v.opportunities.filter((o) => o.realized).length,
    0
  )
  const activeVehicles = vehicles.filter((v) => v.status === 'ACTIVE').length
  const buildingVehicles = vehicles.filter(
    (v) =>
      v.status === 'BUILDING' ||
      v.status === 'ACQUIRING' ||
      v.status === 'RESEARCHING'
  ).length

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-zinc-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Vehicles</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Strategic assets and pathways that multiply your leverage across
            goals
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New Vehicle
        </button>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <div className="text-2xl font-bold text-zinc-900">
            {activeVehicles}
          </div>
          <div className="text-xs text-zinc-500">Active vehicles</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <div className="text-2xl font-bold text-zinc-900">
            {buildingVehicles}
          </div>
          <div className="text-xs text-zinc-500">In progress</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <div className="text-2xl font-bold text-zinc-900">
            {totalOpportunities}
          </div>
          <div className="text-xs text-zinc-500">Opportunities unlocked</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <div className="text-2xl font-bold text-zinc-900">
            {realizedOpportunities}
          </div>
          <div className="text-xs text-zinc-500">Opportunities realized</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1">
        {[
          { key: 'ALL', label: 'All' },
          { key: 'ACTIVE_BUILDING', label: 'Active & Building' },
          { key: 'IDENTIFIED', label: 'Ideas' },
          { key: 'RETIRED', label: 'Retired' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vehicle cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((vehicle) => (
          <Link
            key={vehicle.id}
            href={`/vehicles/${vehicle.id}`}
            className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <VehicleTypeIcon
                  type={vehicle.type}
                  className="size-5 text-zinc-700"
                />
                <div>
                  <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-700">
                    {vehicle.title}
                  </h3>
                  {vehicle.institution && (
                    <p className="text-xs text-zinc-500">
                      {vehicle.institution}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[vehicle.status] || 'bg-zinc-100 text-zinc-600'}`}
              >
                {vehicle.status}
              </span>
            </div>

            {vehicle.description && (
              <p className="mb-3 line-clamp-2 text-sm text-zinc-600">
                {vehicle.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>{vehicle.vehicleGoals.length} goals linked</span>
              <span>{vehicle.opportunities.length} opportunities</span>
            </div>

            {vehicle.values.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {vehicle.values.map((v) => (
                  <span
                    key={v.id}
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                  >
                    {v.label}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center">
          <p className="text-sm text-zinc-500">
            No vehicles match this filter.
          </p>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Vehicle"
      >
        <CreateVehicleForm
          onCreated={() => {
            setShowCreate(false)
            load()
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  )
}
