'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAiAccess } from '@/lib/useAiAccess'
import { useTokens } from '@/lib/useTokens'

interface GoalSuggestion {
  title: string
  description: string
  reasoning: string
  alignedValues: string[]
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface SuggestionsResponse {
  suggestions: GoalSuggestion[]
  valuesSummary?: string
  message?: string
  source?: 'gemini' | 'templates'
  reason?: string
}

export function SuggestedGoals({
  refreshKey,
  onCreateGoal,
}: {
  refreshKey: number
  onCreateGoal: (title: string, description: string) => void
}) {
  const { tokensEnabled } = useTokens()
  const ai = useAiAccess()
  const [data, setData] = useState<SuggestionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dismissedTitles, setDismissedTitles] = useState<Set<string>>(new Set())

  const fetchSuggestions = useCallback(() => {
    if (!tokensEnabled) {
      setLoading(false)
      setRefreshing(false)
      return () => {}
    }
    let cancelled = false
    fetch('/api/goals/suggest', { headers: ai.headers })
      .then((r) => r.json())
      .then((d: SuggestionsResponse) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
          setRefreshing(false)
          if (d.source === 'gemini') ai.consume()
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [tokensEnabled, ai.headers, ai.consume])

  useEffect(() => {
    return fetchSuggestions()
    // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional trigger to re-fetch suggestions
  }, [refreshKey, fetchSuggestions])

  const handleRefresh = () => {
    setRefreshing(true)
    setDismissedTitles(new Set())
    fetchSuggestions()
  }

  if (!tokensEnabled) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-2">
          Suggested Next Goals
        </h3>
        <p className="text-xs text-zinc-400">
          Suggestions are disabled. Enable &quot;Smart Suggestions&quot; in
          Settings to get recommendations.
        </p>
      </div>
    )
  }

  if (!loading && !data && !refreshing) return null

  const visible =
    data?.suggestions.filter((s) => !dismissedTitles.has(s.title)) ?? []
  const isWorking = loading || refreshing

  if (!loading && data?.message && data.suggestions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-2">
          Suggested Next Goals
        </h3>
        <p className="text-xs text-zinc-400">{data.message}</p>
      </div>
    )
  }

  if (!loading && !refreshing && visible.length === 0 && data) return null

  const priorityColor = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-zinc-100 text-zinc-600',
  }

  const spinner = (
    <div className="flex items-center justify-center gap-2 py-6">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
      <span className="text-xs text-zinc-400">Generating suggestions…</span>
    </div>
  )

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
          Suggested Next Goals
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isWorking}
          title="Refresh suggestions"
          className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isWorking ? 'animate-spin' : ''}
          >
            <path d="M1 1v4h4" />
            <path d="M15 15v-4h-4" />
            <path d="M13.5 6A6 6 0 0 0 3 3.5L1 5" />
            <path d="M2.5 10A6 6 0 0 0 13 12.5l2-1.5" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-zinc-400 mb-3">
        {isWorking
          ? 'Generating new suggestions…'
          : `Based on your values: ${data?.valuesSummary}`}
      </p>

      {visible.length === 0 && isWorking ? (
        spinner
      ) : (
        <div className="relative">
          {isWorking && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1px]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
            </div>
          )}
          <div
            className={`space-y-3 ${isWorking ? 'pointer-events-none' : ''}`}
          >
            {visible.slice(0, 5).map((s) => (
              <div
                key={s.title}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${priorityColor[s.priority]}`}
                      >
                        {s.priority}
                      </span>
                      <span className="text-sm font-medium text-zinc-800">
                        {s.title}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">
                      {s.description}
                    </p>
                    <p className="text-[11px] text-zinc-400 italic">
                      {s.reasoning}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.alignedValues.map((v) => (
                        <span
                          key={v}
                          className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-600"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => onCreateGoal(s.title, s.description)}
                      className="rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
                    >
                      Create
                    </button>
                    <button
                      onClick={() =>
                        setDismissedTitles((prev) => new Set(prev).add(s.title))
                      }
                      className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
