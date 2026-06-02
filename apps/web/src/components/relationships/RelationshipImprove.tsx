'use client'

import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  firstName,
  type OutreachChannel,
  type RelationshipHealth,
  type RelationshipTier,
} from '@/lib/reasoning/relationships'
import { AddStakeholderModal } from './AddStakeholderModal'
import { LogInteractionModal } from './LogInteractionModal'
import { StakeholderDetailDrawer } from './StakeholderDetailDrawer'

const tierStyle: Record<
  RelationshipTier,
  { label: string; badge: string; bar: string }
> = {
  STRONG: {
    label: 'Strong',
    badge: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
  },
  STEADY: {
    label: 'Steady',
    badge: 'bg-sky-100 text-sky-700',
    bar: 'bg-sky-500',
  },
  AT_RISK: {
    label: 'At risk',
    badge: 'bg-amber-100 text-amber-700',
    bar: 'bg-amber-500',
  },
  DORMANT: {
    label: 'Dormant',
    badge: 'bg-red-100 text-red-700',
    bar: 'bg-red-500',
  },
}

const channelLabel: Record<OutreachChannel, string> = {
  MEETING: 'Schedule meeting',
  CALL: 'Schedule call',
  EMAIL: 'Draft email',
  MESSAGE: 'Draft message',
  NOTE: 'Add note',
}

type FilterKey = 'all' | 'attention' | 'goals'
type SortKey = 'priority' | 'health' | 'recent'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'attention', label: 'Need attention' },
  { key: 'goals', label: 'Goal-linked' },
]

function buildOutreachUrl(item: RelationshipHealth): string | null {
  const subject = item.recommendedStep.title
  const body = [
    `Hi ${firstName(item.name)},`,
    '',
    ...item.talkingPoints.map((p) => `- ${p}`),
  ].join('\n')

  if (
    item.recommendedStep.channel === 'EMAIL' ||
    item.recommendedStep.channel === 'MESSAGE'
  ) {
    const params = new URLSearchParams({ subject, body })
    return `mailto:?${params.toString()}`
  }
  if (
    item.recommendedStep.channel === 'MEETING' ||
    item.recommendedStep.channel === 'CALL'
  ) {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: subject,
      details: body,
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }
  return null
}

export function RelationshipImprove() {
  const [health, setHealth] = useState<RelationshipHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<RelationshipHealth | null>(null)
  const [detail, setDetail] = useState<RelationshipHealth | null>(null)
  const [adding, setAdding] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('priority')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/relationships/health')
        const data = await res.json()
        if (!cancelled) setHealth(data.health ?? [])
      } catch {
        if (!cancelled) setHealth([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey is an intentional trigger to re-fetch data
  }, [reloadKey])

  function reload() {
    setLoading(true)
    setReloadKey((k) => k + 1)
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = health.filter((h) => {
      if (
        filter === 'attention' &&
        h.tier !== 'AT_RISK' &&
        h.tier !== 'DORMANT'
      )
        return false
      if (filter === 'goals' && h.linkedGoals.length === 0) return false
      if (q) {
        const hay = [h.name, h.organization, h.role]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'health') return a.healthScore - b.healthScore
      if (sort === 'recent') {
        const av = a.daysSinceContact ?? Number.POSITIVE_INFINITY
        const bv = b.daysSinceContact ?? Number.POSITIVE_INFINITY
        return bv - av
      }
      return b.priorityScore - a.priorityScore
    })
    return list
  }, [health, query, filter, sort])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
      </div>
    )
  }

  const needsAttention = health.filter(
    (h) => h.tier === 'AT_RISK' || h.tier === 'DORMANT'
  ).length
  const avgHealth = health.length
    ? Math.round(health.reduce((s, h) => s + h.healthScore, 0) / health.length)
    : 0

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Stat label="Tracked" value={String(health.length)} />
        <Stat
          label="Need attention"
          value={String(needsAttention)}
          tone={needsAttention > 0 ? 'warn' : 'ok'}
        />
        <Stat label="Avg. health" value={`${avgHealth}%`} />
        <button
          onClick={() => setAdding(true)}
          className="ml-auto rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Add stakeholder
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, org, or role…"
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <div className="flex rounded-lg bg-zinc-100 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 focus:border-zinc-500 focus:outline-none"
        >
          <option value="priority">Sort: Priority</option>
          <option value="health">Sort: Lowest health</option>
          <option value="recent">Sort: Least recent contact</option>
        </select>
      </div>

      {health.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <h2 className="text-lg font-semibold text-zinc-700">
            No stakeholders yet
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Add stakeholders to start tracking and improving relationships.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Add stakeholder
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center text-sm text-zinc-500">
          No stakeholders match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const style = tierStyle[item.tier]
            const outreachUrl = buildOutreachUrl(item)
            return (
              <div
                key={item.stakeholderId}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetail(item)}
                        className="truncate text-sm font-semibold text-zinc-900 hover:text-pink-600 hover:underline"
                      >
                        {item.name}
                      </button>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>
                    {(item.role || item.organization) && (
                      <p className="text-xs text-zinc-500">
                        {[item.role, item.organization]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Health</span>
                      <span className="font-medium text-zinc-600">
                        {item.healthScore}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full ${style.bar}`}
                        style={{ width: `${item.healthScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {item.linkedGoals.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.linkedGoals.map((g) => (
                      <span
                        key={g}
                        className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                <ul className="mt-2 space-y-0.5">
                  {item.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-zinc-500">
                      • {r}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs font-medium text-zinc-700">
                    Recommended next step
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-900">
                    {item.recommendedStep.title}
                  </p>
                  {item.talkingPoints.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {item.talkingPoints.map((p, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1 text-xs text-zinc-500"
                        >
                          <ArrowRight className="size-3 shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setActive(item)}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                  >
                    Log interaction
                  </button>
                  {outreachUrl && (
                    <a
                      href={outreachUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      {channelLabel[item.recommendedStep.channel]}
                    </a>
                  )}
                  <button
                    onClick={() => setDetail(item)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {active && (
        <LogInteractionModal
          stakeholderId={active.stakeholderId}
          stakeholderName={active.name}
          currentStrength={active.relationshipStrength}
          suggestedNote={active.recommendedStep.title}
          onClose={() => setActive(null)}
          onDone={() => {
            setActive(null)
            setDetail(null)
            reload()
          }}
        />
      )}

      {detail && (
        <StakeholderDetailDrawer
          item={detail}
          onClose={() => setDetail(null)}
          onLog={() => {
            setActive(detail)
            setDetail(null)
          }}
        />
      )}

      {adding && (
        <AddStakeholderModal
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false)
            reload()
          }}
        />
      )}
    </>
  )
}

function Stat({
  label,
  value,
  tone = 'ok',
}: {
  label: string
  value: string
  tone?: 'ok' | 'warn'
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">
        {label}
      </div>
      <div
        className={`text-lg font-semibold ${tone === 'warn' ? 'text-amber-600' : 'text-zinc-900'}`}
      >
        {value}
      </div>
    </div>
  )
}
