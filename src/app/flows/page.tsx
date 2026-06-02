'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────

interface ResourceType {
  id: string
  name: string
  unit: string
  icon: string | null
  color: string | null
  description: string | null
  isDefault: boolean
  _count?: { flows: number }
}

interface ResourceFlow {
  id: string
  resourceTypeId: string
  entityType: string
  entityId: string
  direction: 'INFLOW' | 'OUTFLOW'
  amount: number
  frequency: string
  label: string
  notes: string | null
  isActive: boolean
  startDate: string | null
  endDate: string | null
  resourceType: ResourceType
}

interface TypeSummary {
  resourceTypeId: string
  resourceTypeName: string
  unit: string
  color: string | null
  icon: string | null
  monthlyInflow: number
  monthlyOutflow: number
  monthlyNet: number
  oneTimeInflow: number
  oneTimeOutflow: number
  oneTimeNet: number
  totalNet: number
}

interface EntitySummary {
  entityType: string
  entityId: string
  entityName: string
  byType: TypeSummary[]
  totalMonthlyNet: number
}

interface Summary {
  global: TypeSummary[]
  entities: EntitySummary[]
}

interface EntityOption {
  type: string
  id: string
  name: string
}

const FREQ_OPTIONS = [
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
]

const ENTITY_TYPE_LABELS: Record<string, string> = {
  GOAL: 'Goal',
  VEHICLE: 'Vehicle',
  STAKEHOLDER: 'Stakeholder',
  ACTION: 'Action',
  PREREQUISITE: 'Prerequisite',
  EVIDENCE: 'Evidence',
}

function formatNum(n: number, unit: string): string {
  const prefix = n >= 0 ? '+' : ''
  if (unit === 'USD' || unit === 'usd' || unit === '$') {
    return `${prefix}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`
}

function formatAmount(n: number, unit: string): string {
  if (unit === 'USD' || unit === 'usd' || unit === '$') {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`
}

// ─── Main page component ─────────────────────────────────────────

export default function FlowsPage() {
  const [types, setTypes] = useState<ResourceType[]>([])
  const [flows, setFlows] = useState<ResourceFlow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [entities, setEntities] = useState<EntityOption[]>([])

  // New type form
  const [showNewType, setShowNewType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeUnit, setNewTypeUnit] = useState('')
  const [newTypeIcon, setNewTypeIcon] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('#6366f1')
  const [newTypeDescription, setNewTypeDescription] = useState('')

  // New flow form
  const [showNewFlow, setShowNewFlow] = useState(false)
  const [flowTypeId, setFlowTypeId] = useState('')
  const [flowEntityType, setFlowEntityType] = useState('VEHICLE')
  const [flowEntityId, setFlowEntityId] = useState('')
  const [flowDirection, setFlowDirection] = useState<'INFLOW' | 'OUTFLOW'>(
    'INFLOW'
  )
  const [flowAmount, setFlowAmount] = useState('')
  const [flowFrequency, setFlowFrequency] = useState('MONTHLY')
  const [flowLabel, setFlowLabel] = useState('')
  const [flowNotes, setFlowNotes] = useState('')

  const [activeTab, setActiveTab] = useState<'overview' | 'flows' | 'types'>(
    'overview'
  )

  // Edit flow state
  const [editingFlow, setEditingFlow] = useState<ResourceFlow | null>(null)
  const [editFlowTypeId, setEditFlowTypeId] = useState('')
  const [editFlowEntityType, setEditFlowEntityType] = useState('VEHICLE')
  const [editFlowEntityId, setEditFlowEntityId] = useState('')
  const [editFlowDirection, setEditFlowDirection] = useState<
    'INFLOW' | 'OUTFLOW'
  >('INFLOW')
  const [editFlowAmount, setEditFlowAmount] = useState('')
  const [editFlowFrequency, setEditFlowFrequency] = useState('MONTHLY')
  const [editFlowLabel, setEditFlowLabel] = useState('')
  const [editFlowNotes, setEditFlowNotes] = useState('')

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string
    label: string
  } | null>(null)

  // Filter & sort state
  const [filterType, setFilterType] = useState('')
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterDirection, setFilterDirection] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [sortField, setSortField] = useState<
    'date' | 'amount' | 'type' | 'entity' | 'label'
  >('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Fetch data
  const fetchTypes = useCallback(() => {
    fetch('/api/resource-types')
      .then((r) => r.json())
      .then(setTypes)
      .catch(() => setTypes([]))
  }, [])

  const fetchFlows = useCallback(() => {
    fetch('/api/resource-flows?activeOnly=false')
      .then((r) => r.json())
      .then(setFlows)
      .catch(() => setFlows([]))
  }, [])

  const fetchSummary = useCallback(() => {
    fetch('/api/resource-flows/summary')
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const fetchEntities = useCallback(() => {
    Promise.all([
      fetch('/api/vehicles').then((r) => r.json()),
      fetch('/api/stakeholders').then((r) => r.json()),
      fetch('/api/goals').then((r) => r.json()),
    ]).then(([vehicles, stakeholders, goals]) => {
      const opts: EntityOption[] = [
        ...vehicles.map((v: { id: string; title: string }) => ({
          type: 'VEHICLE',
          id: v.id,
          name: v.title,
        })),
        ...stakeholders.map((s: { id: string; name: string }) => ({
          type: 'STAKEHOLDER',
          id: s.id,
          name: s.name,
        })),
        ...(Array.isArray(goals)
          ? goals
          : goals.active
            ? [...goals.active, ...(goals.completed || [])]
            : []
        ).map((g: { id: string; title: string }) => ({
          type: 'GOAL',
          id: g.id,
          name: g.title,
        })),
      ]
      setEntities(opts)
    })
  }, [])

  useEffect(() => {
    fetchTypes()
    fetchFlows()
    fetchSummary()
    fetchEntities()
  }, [fetchTypes, fetchFlows, fetchSummary, fetchEntities])

  // Handlers
  async function createType() {
    if (!newTypeName.trim() || !newTypeUnit.trim()) return
    await fetch('/api/resource-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTypeName,
        unit: newTypeUnit,
        icon: newTypeIcon || null,
        color: newTypeColor || null,
        description: newTypeDescription || null,
      }),
    })
    setNewTypeName('')
    setNewTypeUnit('')
    setNewTypeIcon('')
    setNewTypeColor('#6366f1')
    setNewTypeDescription('')
    setShowNewType(false)
    fetchTypes()
    fetchSummary()
  }

  async function deleteType(id: string) {
    await fetch(`/api/resource-types/${id}`, { method: 'DELETE' })
    fetchTypes()
    fetchFlows()
    fetchSummary()
  }

  async function createFlow() {
    if (!flowTypeId || !flowEntityId || !flowLabel.trim() || !flowAmount) return
    await fetch('/api/resource-flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceTypeId: flowTypeId,
        entityType: flowEntityType,
        entityId: flowEntityId,
        direction: flowDirection,
        amount: Number(flowAmount),
        frequency: flowFrequency,
        label: flowLabel,
        notes: flowNotes || null,
      }),
    })
    setFlowLabel('')
    setFlowAmount('')
    setFlowNotes('')
    setShowNewFlow(false)
    fetchFlows()
    fetchSummary()
  }

  async function deleteFlow(id: string) {
    await fetch(`/api/resource-flows/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    fetchFlows()
    fetchSummary()
  }

  function openEditFlow(f: ResourceFlow) {
    setEditingFlow(f)
    setEditFlowTypeId(f.resourceTypeId)
    setEditFlowEntityType(f.entityType)
    setEditFlowEntityId(f.entityId)
    setEditFlowDirection(f.direction)
    setEditFlowAmount(String(f.amount))
    setEditFlowFrequency(f.frequency)
    setEditFlowLabel(f.label)
    setEditFlowNotes(f.notes || '')
  }

  async function updateFlow() {
    if (
      !editingFlow ||
      !editFlowTypeId ||
      !editFlowEntityId ||
      !editFlowLabel.trim() ||
      !editFlowAmount
    )
      return
    await fetch(`/api/resource-flows/${editingFlow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceTypeId: editFlowTypeId,
        entityType: editFlowEntityType,
        entityId: editFlowEntityId,
        direction: editFlowDirection,
        amount: Number(editFlowAmount),
        frequency: editFlowFrequency,
        label: editFlowLabel,
        notes: editFlowNotes || null,
      }),
    })
    setEditingFlow(null)
    fetchFlows()
    fetchSummary()
  }

  async function toggleFlowActive(id: string, isActive: boolean) {
    await fetch(`/api/resource-flows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    fetchFlows()
    fetchSummary()
  }

  const filteredEntities = entities.filter((e) => e.type === flowEntityType)
  const editFilteredEntities = entities.filter(
    (e) => e.type === editFlowEntityType
  )

  const filteredSortedFlows = useMemo(() => {
    let result = [...flows]

    // Filters
    if (filterType)
      result = result.filter((f) => f.resourceTypeId === filterType)
    if (filterEntityType)
      result = result.filter((f) => f.entityType === filterEntityType)
    if (filterDirection)
      result = result.filter((f) => f.direction === filterDirection)
    if (filterStatus === 'active') result = result.filter((f) => f.isActive)
    if (filterStatus === 'paused') result = result.filter((f) => !f.isActive)
    if (filterSearch) {
      const q = filterSearch.toLowerCase()
      result = result.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          (f.notes && f.notes.toLowerCase().includes(q)) ||
          f.resourceType.name.toLowerCase().includes(q) ||
          (entities.find((e) => e.id === f.entityId)?.name || '')
            .toLowerCase()
            .includes(q)
      )
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1
    result.sort((a, b) => {
      switch (sortField) {
        case 'amount':
          return (a.amount - b.amount) * dir
        case 'type':
          return a.resourceType.name.localeCompare(b.resourceType.name) * dir
        case 'entity': {
          const nameA = entities.find((e) => e.id === a.entityId)?.name || ''
          const nameB = entities.find((e) => e.id === b.entityId)?.name || ''
          return nameA.localeCompare(nameB) * dir
        }
        case 'label':
          return a.label.localeCompare(b.label) * dir
        case 'date':
        default:
          return 0 // preserve API order (createdAt desc)
      }
    })

    return result
  }, [
    flows,
    filterType,
    filterEntityType,
    filterDirection,
    filterStatus,
    filterSearch,
    sortField,
    sortDir,
    entities,
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Resource Flows</h1>
          <p className="text-sm text-zinc-500">
            Track cash, social capital, emotional energy, and any custom
            resource across all entities
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewType(true)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Resource Type
          </button>
          <button
            onClick={() => setShowNewFlow(true)}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + New Flow
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200">
        {(['overview', 'flows', 'types'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ─── */}
      {activeTab === 'overview' && summary && (
        <div className="space-y-6">
          {/* Global summary cards */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-800 mb-3">
              Net Resource Position
            </h2>
            {summary.global.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No resource flows yet. Add some to see your net position.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summary.global.map((ts) => (
                  <div
                    key={ts.resourceTypeId}
                    className="rounded-xl border border-zinc-200 bg-white p-4"
                    style={{
                      borderLeftColor: ts.color || '#a1a1aa',
                      borderLeftWidth: 4,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {ts.icon && <span className="text-lg">{ts.icon}</span>}
                      <span className="font-semibold text-zinc-800">
                        {ts.resourceTypeName}
                      </span>
                      <span className="ml-auto text-xs text-zinc-400">
                        {ts.unit}
                      </span>
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      <span
                        className={
                          ts.monthlyNet >= 0 ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {formatNum(ts.monthlyNet, ts.unit)}
                      </span>
                      <span className="text-sm font-normal text-zinc-400">
                        /mo
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <span>
                        In: {formatAmount(ts.monthlyInflow, ts.unit)}/mo
                      </span>
                      <span>
                        Out: {formatAmount(ts.monthlyOutflow, ts.unit)}/mo
                      </span>
                    </div>
                    {(ts.oneTimeInflow > 0 || ts.oneTimeOutflow > 0) && (
                      <div className="mt-1 text-xs text-zinc-400">
                        One-time net: {formatNum(ts.oneTimeNet, ts.unit)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-entity breakdown */}
          {summary.entities.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">
                By Entity
              </h2>
              <div className="space-y-2">
                {summary.entities.map((ent) => (
                  <div
                    key={`${ent.entityType}::${ent.entityId}`}
                    className="rounded-lg border border-zinc-200 bg-white p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 uppercase">
                        {ent.entityType}
                      </span>
                      <span className="font-medium text-zinc-800 text-sm">
                        {ent.entityName}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {ent.byType.map((ts) => (
                        <div
                          key={ts.resourceTypeId}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          {ts.icon && <span>{ts.icon}</span>}
                          <span className="text-zinc-500">
                            {ts.resourceTypeName}:
                          </span>
                          <span
                            className={
                              ts.monthlyNet >= 0
                                ? 'font-medium text-green-600'
                                : 'font-medium text-red-600'
                            }
                          >
                            {formatNum(ts.monthlyNet, ts.unit)}/mo
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Flows Tab ─── */}
      {activeTab === 'flows' && (
        <div className="space-y-3">
          {/* Filter & Sort Bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
            <input
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search flows..."
              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none w-44"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="">All Types</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon ? `${t.icon} ` : ''}
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="">All Entities</option>
              {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="">In & Out</option>
              <option value="INFLOW">Inflow only</option>
              <option value="OUTFLOW">Outflow only</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs text-zinc-500">Sort:</span>
              <select
                value={sortField}
                onChange={(e) =>
                  setSortField(e.target.value as typeof sortField)
                }
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
              >
                <option value="date">Date added</option>
                <option value="amount">Amount</option>
                <option value="type">Resource type</option>
                <option value="entity">Entity</option>
                <option value="label">Label</option>
              </select>
              <button
                onClick={() =>
                  setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                }
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm hover:bg-zinc-100"
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Result count & clear */}
          {(filterType ||
            filterEntityType ||
            filterDirection ||
            filterStatus ||
            filterSearch) && (
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                Showing {filteredSortedFlows.length} of {flows.length} flows
              </span>
              <button
                onClick={() => {
                  setFilterType('')
                  setFilterEntityType('')
                  setFilterDirection('')
                  setFilterStatus('')
                  setFilterSearch('')
                }}
                className="text-zinc-500 hover:text-zinc-800 underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {filteredSortedFlows.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">
              {flows.length === 0
                ? 'No resource flows yet.'
                : 'No flows match the current filters.'}
            </p>
          ) : (
            filteredSortedFlows.map((f) => {
              const entityName =
                entities.find((e) => e.id === f.entityId)?.name ||
                f.entityId.slice(0, 8)
              return (
                <div
                  key={f.id}
                  className={`rounded-lg border bg-white p-3 flex items-center gap-3 ${
                    !f.isActive ? 'opacity-50' : ''
                  }`}
                  style={{
                    borderLeftColor: f.resourceType.color || '#a1a1aa',
                    borderLeftWidth: 3,
                  }}
                >
                  <div
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                      f.direction === 'INFLOW'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {f.direction === 'INFLOW' ? '↑ IN' : '↓ OUT'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-800 text-sm truncate">
                        {f.label}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 uppercase flex-shrink-0">
                        {ENTITY_TYPE_LABELS[f.entityType] || f.entityType}
                      </span>
                      <span className="text-xs text-zinc-400 truncate">
                        {entityName}
                      </span>
                    </div>
                    {f.notes && (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">
                        {f.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`font-semibold text-sm ${f.direction === 'INFLOW' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {f.direction === 'INFLOW' ? '+' : '-'}
                      {formatAmount(f.amount, f.resourceType.unit)}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {FREQ_OPTIONS.find((o) => o.value === f.frequency)
                        ?.label || f.frequency}
                      {' · '}
                      {f.resourceType.name}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditFlow(f)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => toggleFlowActive(f.id, f.isActive)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                      title={f.isActive ? 'Pause' : 'Resume'}
                    >
                      {f.isActive ? '⏸' : '▶'}
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({ id: f.id, label: f.label })
                      }
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ─── Types Tab ─── */}
      {activeTab === 'types' && (
        <div className="space-y-2">
          {types.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">
              No resource types defined yet.
            </p>
          ) : (
            types.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-3 flex items-center gap-3"
                style={{
                  borderLeftColor: t.color || '#a1a1aa',
                  borderLeftWidth: 4,
                }}
              >
                {t.icon && <span className="text-xl">{t.icon}</span>}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-800">{t.name}</span>
                    <span className="text-xs text-zinc-400">({t.unit})</span>
                    {t.isDefault && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        default
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {t.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-zinc-400">
                  {t._count?.flows || 0} flows
                </span>
                {!t.isDefault && (
                  <button
                    onClick={() => deleteType(t.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── New Type Modal ─── */}
      {showNewType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 mb-3">
              New Resource Type
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Name *
                </label>
                <input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Emotional Energy"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Unit *
                  </label>
                  <input
                    value={newTypeUnit}
                    onChange={(e) => setNewTypeUnit(e.target.value)}
                    placeholder="e.g. points, USD, hours"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Icon
                  </label>
                  <input
                    value={newTypeIcon}
                    onChange={(e) => setNewTypeIcon(e.target.value)}
                    placeholder="💰"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-center focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newTypeColor}
                    onChange={(e) => setNewTypeColor(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-300 cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Description
                </label>
                <input
                  value={newTypeDescription}
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                  placeholder="What this resource represents"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowNewType(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={createType}
                disabled={!newTypeName.trim() || !newTypeUnit.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── New Flow Modal ─── */}
      {showNewFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 mb-3">
              New Resource Flow
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Resource Type *
                  </label>
                  <select
                    value={flowTypeId}
                    onChange={(e) => setFlowTypeId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="">Select type...</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon ? `${t.icon} ` : ''}
                        {t.name} ({t.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Direction *
                  </label>
                  <select
                    value={flowDirection}
                    onChange={(e) =>
                      setFlowDirection(e.target.value as 'INFLOW' | 'OUTFLOW')
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="INFLOW">Inflow</option>
                    <option value="OUTFLOW">Outflow</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Entity Type *
                  </label>
                  <select
                    value={flowEntityType}
                    onChange={(e) => {
                      setFlowEntityType(e.target.value)
                      setFlowEntityId('')
                    }}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Entity *
                  </label>
                  <select
                    value={flowEntityId}
                    onChange={(e) => setFlowEntityId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {filteredEntities.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={flowAmount}
                    onChange={(e) => setFlowAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={flowFrequency}
                    onChange={(e) => setFlowFrequency(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    {FREQ_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Label *
                </label>
                <input
                  value={flowLabel}
                  onChange={(e) => setFlowLabel(e.target.value)}
                  placeholder="e.g. Monthly salary, Therapy sessions, Coffee networking"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Notes
                </label>
                <input
                  value={flowNotes}
                  onChange={(e) => setFlowNotes(e.target.value)}
                  placeholder="Additional context"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowNewFlow(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={createFlow}
                disabled={
                  !flowTypeId ||
                  !flowEntityId ||
                  !flowLabel.trim() ||
                  !flowAmount
                }
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Add Flow
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── Edit Flow Modal ─── */}
      {editingFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 mb-3">
              Edit Resource Flow
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Resource Type *
                  </label>
                  <select
                    value={editFlowTypeId}
                    onChange={(e) => setEditFlowTypeId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="">Select type...</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon ? `${t.icon} ` : ''}
                        {t.name} ({t.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Direction *
                  </label>
                  <select
                    value={editFlowDirection}
                    onChange={(e) =>
                      setEditFlowDirection(
                        e.target.value as 'INFLOW' | 'OUTFLOW'
                      )
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="INFLOW">Inflow</option>
                    <option value="OUTFLOW">Outflow</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Entity Type *
                  </label>
                  <select
                    value={editFlowEntityType}
                    onChange={(e) => {
                      setEditFlowEntityType(e.target.value)
                      setEditFlowEntityId('')
                    }}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Entity *
                  </label>
                  <select
                    value={editFlowEntityId}
                    onChange={(e) => setEditFlowEntityId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {editFilteredEntities.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={editFlowAmount}
                    onChange={(e) => setEditFlowAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={editFlowFrequency}
                    onChange={(e) => setEditFlowFrequency(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  >
                    {FREQ_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Label *
                </label>
                <input
                  value={editFlowLabel}
                  onChange={(e) => setEditFlowLabel(e.target.value)}
                  placeholder="e.g. Monthly salary, Therapy sessions"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Notes
                </label>
                <input
                  value={editFlowNotes}
                  onChange={(e) => setEditFlowNotes(e.target.value)}
                  placeholder="Additional context"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingFlow(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={updateFlow}
                disabled={
                  !editFlowTypeId ||
                  !editFlowEntityId ||
                  !editFlowLabel.trim() ||
                  !editFlowAmount
                }
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">
              Delete Flow
            </h3>
            <p className="text-sm text-zinc-600 mb-4">
              Are you sure you want to delete{' '}
              <span className="font-medium text-zinc-800">
                &ldquo;{deleteConfirm.label}&rdquo;
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteFlow(deleteConfirm.id)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
