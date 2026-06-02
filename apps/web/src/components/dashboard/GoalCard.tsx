'use client'

import { Card, CardTitle } from '@goalos/ui/components/Card'
import { ReadinessGauge } from '@goalos/ui/components/ReadinessGauge'
import { PriorityBadge, StatusBadge } from '@goalos/ui/components/StatusBadge'
import Link from 'next/link'
import { useState } from 'react'
import type { ReadinessScore } from '@/lib/reasoning/types'
import { MarkProgressModal } from './MarkProgressModal'

interface Prerequisite {
  id: string
  title: string
  status: string
  confidenceScore: number
}

interface Action {
  id: string
  title: string
  status: string
  priority: string
}

interface Goal {
  id: string
  title: string
  description: string | null
  status: string
  targetDate: string | null
  updatedAt: string
  completedAt: string | null
  prerequisites: Prerequisite[]
  actions: Action[]
}

function getTopBlocker(prereqs: Prerequisite[]): Prerequisite | null {
  const blocked = prereqs.filter(
    (p) => p.status === 'BLOCKED' || p.status === 'NOT_STARTED'
  )
  if (blocked.length === 0) return null
  return (
    blocked.sort((a, b) => a.confidenceScore - b.confidenceScore)[0] ?? null
  )
}

function getNextAction(actions: Action[]): Action | null {
  const priorityOrder: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  }
  const pending = actions.filter(
    (a) => a.status === 'TODO' || a.status === 'IN_PROGRESS'
  )
  if (pending.length === 0) return null
  return (
    pending.sort(
      (a, b) =>
        (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0)
    )[0] ?? null
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function GoalCard({
  goal,
  readiness,
  onRefresh,
}: {
  goal: Goal
  readiness?: ReadinessScore
  onRefresh: () => void
}) {
  const [showProgress, setShowProgress] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const topBlocker = getTopBlocker(goal.prerequisites)
  const nextAction = getNextAction(goal.actions)
  const completedPrereqs = goal.prerequisites.filter(
    (p) => p.status === 'COMPLETED'
  ).length

  const statusDot: Record<string, string> = {
    ACTIVE: 'bg-emerald-500',
    BLOCKED: 'bg-red-500',
    WAITING: 'bg-amber-500',
    COMPLETED: 'bg-blue-500',
    ARCHIVED: 'bg-zinc-400',
  }

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`h-2 w-2 rounded-full flex-shrink-0 ${statusDot[goal.status] || 'bg-zinc-400'}`}
              />
              <Link href={`/goals/${goal.id}`} className="hover:underline">
                <CardTitle>{goal.title}</CardTitle>
              </Link>
              <StatusBadge status={goal.status} />
            </div>
            <p className="text-[11px] text-zinc-400 ml-4">
              Updated {timeAgo(goal.updatedAt)}
              {goal.targetDate && (
                <>
                  {' '}
                  · Target{' '}
                  {new Date(goal.targetDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </>
              )}
            </p>
          </div>
          {readiness && <ReadinessGauge score={readiness.score} size="md" />}
        </div>

        {/* Top Blocker */}
        {topBlocker && goal.status !== 'COMPLETED' && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-red-500 flex-shrink-0"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3M8 10.5v.5" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-red-700 font-medium">Blocked:</span>
            <span className="text-xs text-red-600 truncate">
              {topBlocker.title}
            </span>
            <span className="text-xs text-red-400 ml-auto flex-shrink-0">
              {topBlocker.confidenceScore}%
            </span>
          </div>
        )}

        {/* Next Action */}
        {nextAction && goal.status !== 'COMPLETED' && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-zinc-500 flex-shrink-0"
            >
              <path
                d="M4 8h8M9 5l3 3-3 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xs text-zinc-500 font-medium">Next:</span>
            <span className="text-xs text-zinc-700 truncate">
              {nextAction.title}
            </span>
            <PriorityBadge priority={nextAction.priority} />
          </div>
        )}

        {/* Action buttons */}
        {goal.status !== 'COMPLETED' && goal.status !== 'ARCHIVED' && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setShowProgress(true)}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Mark Progress
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
            >
              {expanded ? 'Less' : 'Details'}
            </button>
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
            {goal.prerequisites.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-zinc-700">
                  Prerequisites ({completedPrereqs}/{goal.prerequisites.length})
                </p>
                {goal.prerequisites.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <StatusBadge status={p.status} />
                    <span className="truncate text-zinc-600">{p.title}</span>
                    <span className="ml-auto text-zinc-400 tabular-nums">
                      {p.confidenceScore}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            {goal.actions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-zinc-700">Actions</p>
                {goal.actions.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <PriorityBadge priority={a.priority} />
                    <span className="truncate text-zinc-600">{a.title}</span>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            )}
            {goal.description && (
              <p className="text-xs text-zinc-500">{goal.description}</p>
            )}
          </div>
        )}

        {/* Completed state */}
        {goal.status === 'COMPLETED' && goal.completedAt && (
          <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2">
            <p className="text-xs text-blue-700">
              Completed{' '}
              {new Date(goal.completedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
      </Card>

      {showProgress && (
        <MarkProgressModal
          goal={goal}
          onClose={() => setShowProgress(false)}
          onDone={() => {
            setShowProgress(false)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
