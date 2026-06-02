'use client'

import { Card, CardTitle } from '@goalos/ui/components/Card'
import { PriorityBadge } from '@goalos/ui/components/StatusBadge'
import { useState } from 'react'
import type { ReasoningOutput } from '@/lib/reasoning/types'

interface FulfillResult {
  actionType: 'calendar_invite' | 'email' | 'schedule_block' | 'generic'
  calendarInvite?: {
    title: string
    description: string
    attendees: string[]
    duration: number
  }
  emailDraft?: {
    to: string
    subject: string
    body: string
  }
  scheduleBlock?: {
    title: string
    description: string
    suggestedDuration: number
  }
  outlookUrl?: string
  googleCalUrl?: string
  mailtoUrl?: string
  message: string
}

export function RecommendationsPanel({
  reasoning,
}: {
  reasoning: ReasoningOutput & { aiInsight?: string | null }
}) {
  return (
    <div className="space-y-4">
      {reasoning.highestLeverageActions.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Highest-Leverage Actions</CardTitle>
          <div className="space-y-2.5">
            {reasoning.highestLeverageActions.map((action, i) => (
              <ActionCard
                key={i}
                title={action.title}
                reason={action.reason}
                priority={action.priority}
                goalTitle={action.relatedGoalTitle}
                goalId={action.relatedGoalId}
              />
            ))}
          </div>
        </Card>
      )}

      {reasoning.missingPrerequisites.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Missing Prerequisites</CardTitle>
          <div className="space-y-2">
            {reasoning.missingPrerequisites.slice(0, 5).map((mp, i) => (
              <div key={i} className="rounded-lg bg-red-50 p-3">
                <p className="text-sm font-medium text-red-900">{mp.title}</p>
                <p className="text-xs text-red-700 mt-0.5">{mp.reason}</p>
                <p className="text-xs text-red-500 mt-1">
                  Goal: {mp.goalTitle} — Confidence: {mp.confidenceScore}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {reasoning.importantRelationships.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Key Relationships</CardTitle>
          <div className="space-y-2">
            {reasoning.importantRelationships.slice(0, 5).map((rel, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
              >
                <p className="text-sm font-medium text-zinc-900">
                  {rel.stakeholderName}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{rel.reason}</p>
                {rel.linkedGoals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {rel.linkedGoals.map((g, j) => (
                      <span
                        key={j}
                        className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {reasoning.uncertaintyReductions.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Reduce Uncertainty</CardTitle>
          <div className="space-y-2">
            {reasoning.uncertaintyReductions.slice(0, 5).map((ur, i) => (
              <div key={i} className="rounded-lg bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">
                  {ur.question}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">{ur.reason}</p>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  → {ur.suggestedAction}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {reasoning.aiInsight && (
        <Card>
          <CardTitle className="mb-3">AI Insight</CardTitle>
          <div className="prose prose-sm prose-zinc max-w-none">
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">
              {reasoning.aiInsight}
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Action Card with "Do it" button ────────────────────────────

function ActionCard({
  title,
  reason,
  priority,
  goalTitle,
}: {
  title: string
  reason: string
  priority: string
  goalTitle: string
  goalId: string
}) {
  const [fulfillResult, setFulfillResult] = useState<FulfillResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleDoIt() {
    setLoading(true)
    try {
      const res = await fetch('/api/actions/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionTitle: title, goalTitle }),
      })
      const data: FulfillResult = await res.json()
      setFulfillResult(data)
    } catch {
      setFulfillResult({
        actionType: 'generic',
        message: `Could not prepare action: "${title}"`,
      })
    }
    setLoading(false)
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <PriorityBadge priority={priority} />
          <span className="text-sm font-medium text-zinc-900 truncate">
            {title}
          </span>
        </div>
        <button
          onClick={handleDoIt}
          disabled={loading || fulfillResult !== null}
          className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Do it'}
        </button>
      </div>
      <p className="text-xs text-zinc-500">{reason}</p>
      <p className="text-xs text-zinc-400 mt-1">Goal: {goalTitle}</p>

      {/* Fulfillment panel */}
      {fulfillResult && (
        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <ActionTypeIcon type={fulfillResult.actionType} />
            <span className="text-xs font-medium text-emerald-800">
              {fulfillResult.actionType === 'calendar_invite' &&
                'Schedule Meeting'}
              {fulfillResult.actionType === 'email' && 'Send Email'}
              {fulfillResult.actionType === 'schedule_block' && 'Block Time'}
              {fulfillResult.actionType === 'generic' && 'Action Ready'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {fulfillResult.outlookUrl && (
              <a
                href={fulfillResult.outlookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <rect x="1" y="1" width="6" height="6" opacity="0.8" />
                  <rect x="9" y="1" width="6" height="6" opacity="0.6" />
                  <rect x="1" y="9" width="6" height="6" opacity="0.6" />
                  <rect x="9" y="9" width="6" height="6" opacity="0.4" />
                </svg>
                {fulfillResult.actionType === 'email'
                  ? 'Open in Outlook'
                  : 'Outlook Calendar'}
              </a>
            )}
            {fulfillResult.googleCalUrl && (
              <a
                href={fulfillResult.googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="#4285f4"
                    strokeWidth="1.5"
                  />
                  <text
                    x="5"
                    y="11"
                    fontSize="7"
                    fontWeight="bold"
                    fill="#4285f4"
                  >
                    G
                  </text>
                </svg>
                Google Calendar
              </a>
            )}
            {fulfillResult.mailtoUrl && (
              <a
                href={fulfillResult.mailtoUrl}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="1" y="3" width="14" height="10" rx="1.5" />
                  <path d="M1 4l7 5 7-5" />
                </svg>
                Email
              </a>
            )}
          </div>

          {fulfillResult.emailDraft && (
            <div className="mt-2 text-xs text-emerald-700">
              <p>
                <span className="font-medium">Subject:</span>{' '}
                {fulfillResult.emailDraft.subject}
              </p>
              {fulfillResult.emailDraft.to && (
                <p>
                  <span className="font-medium">To:</span>{' '}
                  {fulfillResult.emailDraft.to}
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => setFulfillResult(null)}
            className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

function ActionTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'calendar_invite':
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#065f46"
          strokeWidth="1.5"
        >
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M2 6h12" />
          <path d="M5 1v2M11 1v2" />
        </svg>
      )
    case 'email':
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#065f46"
          strokeWidth="1.5"
        >
          <rect x="1" y="3" width="14" height="10" rx="1.5" />
          <path d="M1 4l7 5 7-5" />
        </svg>
      )
    case 'schedule_block':
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#065f46"
          strokeWidth="1.5"
        >
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4v4l3 2" />
        </svg>
      )
    default:
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#065f46"
          strokeWidth="1.5"
        >
          <path d="M4 8h8M8 4v8" />
        </svg>
      )
  }
}
