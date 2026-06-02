'use client'

import { Modal } from '@goalos/ui/components/Modal'
import { ArrowRight, Circle, CircleCheck, CircleDot } from 'lucide-react'
import { useCallback, useState } from 'react'
import { CreateGoalForm } from '@/components/dashboard/CreateGoalForm'
import { isEmbedderReady } from '@/lib/semantic/embedder'
import {
  classifyIntentSemantic,
  INTENT_CONFIDENCE,
} from '@/lib/semantic/intent'
import { useAiAccess } from '@/lib/useAiAccess'
import { useTokens } from '@/lib/useTokens'

interface ParsedGoal {
  title: string
  description: string
  targetDate: string
  successCriteria: string
}

interface GoalProgress {
  id: string
  title: string
  status: string
  targetDate: string | null
  readiness: number
  prerequisites: { title: string; status: string; confidenceScore: number }[]
  actions: { title: string; status: string; priority: string }[]
  weeklyHours: number
  eventCount: number
}

interface ProgressData {
  goals: GoalProgress[]
  query: string
  matchedGoalId: string | null
}

const MONTH_MAP: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

function parseGoalInput(input: string): ParsedGoal {
  const result: ParsedGoal = {
    title: '',
    description: '',
    targetDate: '',
    successCriteria: '',
  }

  // Split on period or semicolons to get clauses
  const parts = input.split(/(?<=[.;])\s+/).filter(Boolean)

  // Extract success criteria: look for "success means/is/when..." or "achieved when..."
  const successPatterns = [
    /success\s+(?:means|is|criteria|looks like|would be)[:\s]+(.+)/i,
    /achieved\s+(?:when|by|if)[:\s]+(.+)/i,
    /goal\s+is\s+met\s+(?:when|if)[:\s]+(.+)/i,
    /measured\s+by[:\s]+(.+)/i,
  ]

  const remainingParts: string[] = []
  for (const part of parts) {
    let matched = false
    for (const pattern of successPatterns) {
      const match = part.match(pattern)
      if (match) {
        result.successCriteria = (match[1] ?? '').trim().replace(/\.$/, '')
        matched = true
        break
      }
    }
    if (!matched) remainingParts.push(part)
  }

  // Rejoin remaining text for further parsing
  let text = remainingParts.join(' ')

  // Extract date: "by <month> <year>", "by <YYYY-MM-DD>", "before <month> <year>", "by end of <year>"
  const datePatterns = [
    // "by December 2025" or "before March 2026"
    /(?:by|before|until|due)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i,
    // "by 2025-12-01" or "by 2025/12/01"
    /(?:by|before|until|due)\s+(\d{4})[-/](\d{1,2})[-/](\d{1,2})/i,
    // "by end of 2025"
    /(?:by|before)\s+(?:the\s+)?end\s+of\s+(\d{4})/i,
    // "by Q1 2026"
    /(?:by|before)\s+Q([1-4])\s+(\d{4})/i,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      if (pattern === datePatterns[0]) {
        const month = MONTH_MAP[(match[1] ?? '').toLowerCase()] ?? '01'
        const year = match[2] ?? ''
        const lastDay = new Date(
          parseInt(year, 10),
          parseInt(month, 10),
          0
        ).getDate()
        result.targetDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
      } else if (pattern === datePatterns[1]) {
        result.targetDate = `${match[1] ?? ''}-${(match[2] ?? '').padStart(2, '0')}-${(match[3] ?? '').padStart(2, '0')}`
      } else if (pattern === datePatterns[2]) {
        result.targetDate = `${match[1] ?? ''}-12-31`
      } else if (pattern === datePatterns[3]) {
        const q = parseInt(match[1] ?? '0', 10)
        const year = match[2] ?? ''
        const endMonth = q * 3
        const lastDay = new Date(parseInt(year, 10), endMonth, 0).getDate()
        result.targetDate = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      }
      text = text
        .replace(match[0] ?? '', '')
        .replace(/,\s*,/g, ',')
        .trim()
      break
    }
  }

  // Now split remaining text into title vs description
  // First sentence or clause (up to first comma, period, or dash separator) is the title
  // The rest is description
  const separatorMatch = text.match(
    /^([^,.\n]+?)(?:[,.]|\s+-\s+|\s+(?:by|through|via|need(?:ing)?|requiring|I need|I want|including)\s+)(.+)$/is
  )

  if (separatorMatch && (separatorMatch[2] ?? '').trim().length > 10) {
    result.title = (separatorMatch[1] ?? '').trim().replace(/[,.]$/, '')
    result.description = (separatorMatch[2] ?? '').trim().replace(/\.$/, '')
  } else {
    result.title = text.trim().replace(/\.$/, '')
  }

  return result
}

/* ─── Intent detection ──────────────────────────────────────────── */

type IntentType =
  | 'review_all'
  | 'progress'
  | 'work_on'
  | 'navigate'
  | 'schedule_query'
  | 'help'
  | 'create_goal'

interface IntentResult {
  type: IntentType
  query?: string
  page?: string
  label?: string
  input?: string
}

const NAV_KEYWORDS: Record<string, { page: string; label: string }> = {
  schedule: { page: '/schedule', label: 'Schedule' },
  calendar: { page: '/schedule', label: 'Schedule' },
  graph: { page: '/graph', label: 'Graph' },
  timeline: { page: '/timeline', label: 'Timeline' },
  history: { page: '/timeline', label: 'Timeline' },
  dashboard: { page: '/', label: 'Dashboard' },
  home: { page: '/', label: 'Dashboard' },
}

function extractNavTarget(input: string): { page: string; label: string } {
  const lower = input.toLowerCase()
  for (const [keyword, target] of Object.entries(NAV_KEYWORDS)) {
    if (lower.includes(keyword)) return target
  }
  return { page: '/', label: 'Dashboard' }
}

function buildIntent(type: IntentType, input: string): IntentResult {
  switch (type) {
    case 'navigate': {
      const nav = extractNavTarget(input)
      return { type, page: nav.page, label: nav.label }
    }
    case 'schedule_query':
      return { type, page: '/schedule', label: 'Schedule' }
    case 'progress':
      return { type, query: input }
    case 'create_goal':
      return { type, input }
    default:
      return { type }
  }
}

async function detectIntent(
  input: string,
  useAi = true,
  aiHeaders: Record<string, string> = {},
  onLlmUsed?: () => void
): Promise<IntentResult> {
  const trimmed = input.trim()

  // 1. Offline model — preferred once it has finished installing.
  if (isEmbedderReady()) {
    try {
      const sem = await classifyIntentSemantic(trimmed)
      if (sem && sem.score >= INTENT_CONFIDENCE) {
        return buildIntent(sem.intent, trimmed)
      }
    } catch {
      // model error — fall through to regex
    }
    return detectIntentRegex(trimmed)
  }

  // 2. Gemini — used while the offline model is still installing.
  if (useAi) {
    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiHeaders },
        body: JSON.stringify({ input: trimmed }),
      })
      const data = await res.json()

      if (data.llm && data.intent) {
        onLlmUsed?.()
        return buildIntent(data.intent as IntentType, trimmed)
      }
    } catch {
      // LLM unavailable — fall through to regex
    }
  }

  // 3. Regex — last-resort fallback.
  return detectIntentRegex(trimmed)
}

/* ─── Regex fallback ────────────────────────────────────────────── */

function detectIntentRegex(input: string): IntentResult {
  if (
    /^(?:review|show|list|display|see|view)\s+(?:all\s+)?(?:my\s+)?goals?$/i.test(
      input
    ) ||
    /^goals?$/i.test(input) ||
    /^(?:review|summarize|summary)\s+(?:all\s+)?(?:my\s+)?(?:goal|goals|progress)$/i.test(
      input
    ) ||
    /^overview$/i.test(input) ||
    /^progress\s*report$/i.test(input)
  ) {
    return { type: 'review_all' }
  }

  if (
    /^(?:how\s+is|how(?:'s|\s+are)|what(?:'s|\s+is)\s+the\s+(?:status|progress)|show\s+(?:me\s+)?progress|progress\s+(?:on|for|of)|status\s+(?:of|on|for)|check\s+(?:on|progress)|how\s+am\s+I\s+doing)/i.test(
      input
    )
  ) {
    return { type: 'progress', query: input }
  }

  if (
    /^(?:what\s+should\s+I\s+(?:work\s+on|do|focus\s+on)|what(?:'s|\s+is)\s+next|next\s+(?:action|step|task)|prioriti(?:es|ze))/i.test(
      input
    )
  ) {
    return { type: 'work_on' }
  }

  if (/^(?:go\s+to|open|navigate\s+to)\s+/i.test(input)) {
    const nav = extractNavTarget(input)
    return { type: 'navigate', page: nav.page, label: nav.label }
  }

  if (
    /^(?:what(?:'s|\s+is)\s+on\s+(?:my\s+)?(?:calendar|schedule)|upcoming\s+events|my\s+(?:schedule|calendar))/i.test(
      input
    )
  ) {
    return { type: 'schedule_query', page: '/schedule', label: 'Schedule' }
  }

  if (
    /^(?:help|what\s+can\s+(?:you\s+do|I\s+(?:say|do|type|ask))|commands)\s*\??$/i.test(
      input
    )
  ) {
    return { type: 'help' }
  }

  return { type: 'create_goal', input }
}

function extractGoalKeywords(input: string): string {
  return input
    .replace(
      /^(?:how\s+is|how(?:'s|\s+are)|what(?:'s|\s+is)\s+the\s+(?:status|progress)\s+(?:of|on|for)?|show\s+(?:me\s+)?progress\s+(?:on|for)?|progress\s+(?:on|for|of)?|status\s+(?:of|on|for)?|update\s+(?:on|me\s+on)?|check\s+(?:on|progress\s+(?:on|for)?)?|how\s+am\s+I\s+doing\s+(?:on|with)?|how\s+(?:are|is)\s+(?:my|the)\s+goal(?:s)?\s*)/i,
      ''
    )
    .replace(/[?!.]+$/, '')
    .trim()
}

/* ─── Recommendations data ──────────────────────────────────────── */

interface RecommendedAction {
  title: string
  reason: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  relatedGoalTitle: string
}

interface RecommendationsData {
  highestLeverageActions: RecommendedAction[]
}

export function GoalPrompt() {
  const { tokensEnabled } = useTokens()
  const ai = useAiAccess()
  const [inputValue, setInputValue] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [recommendationsData, setRecommendationsData] =
    useState<RecommendationsData | null>(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedGoal>({
    title: '',
    description: '',
    targetDate: '',
    successCriteria: '',
  })

  const fetchProgress = useCallback(
    async (query: string, matchAll: boolean) => {
      setProgressLoading(true)
      try {
        const [goalsRes, allocRes] = await Promise.all([
          fetch('/api/goals'),
          fetch('/api/schedule/allocation?period=week'),
        ])
        const goals = await goalsRes.json()
        const alloc = await allocRes.json()

        const allocMap = new Map<string, { minutes: number; count: number }>()
        for (const a of alloc.allocations || []) {
          if (a.goalId)
            allocMap.set(a.goalId, {
              minutes: a.totalMinutes,
              count: a.eventCount,
            })
        }

        const keywords = matchAll
          ? ''
          : extractGoalKeywords(query).toLowerCase()
        const queryWords = keywords.split(/\s+/).filter((w) => w.length > 2)
        let matchedGoalId: string | null = null
        let bestMatchScore = 0

        const goalProgress: GoalProgress[] = goals
          .filter((g: { status: string }) =>
            ['ACTIVE', 'BLOCKED', 'WAITING'].includes(g.status)
          )
          .map(
            (g: {
              id: string
              title: string
              status: string
              targetDate: string | null
              prerequisites: {
                title: string
                status: string
                confidenceScore: number
              }[]
              actions: { title: string; status: string; priority: string }[]
            }) => {
              const prereqs = g.prerequisites || []
              const completed = prereqs.filter(
                (p: { status: string }) => p.status === 'COMPLETED'
              ).length
              const totalConf = prereqs.reduce(
                (s: number, p: { confidenceScore: number }) =>
                  s + (p.confidenceScore || 0),
                0
              )
              const readiness =
                prereqs.length > 0
                  ? Math.round(
                      (completed / prereqs.length) * 60 +
                        (totalConf / prereqs.length) * 0.4
                    )
                  : 50
              const allocData = allocMap.get(g.id)

              if (!matchAll && queryWords.length > 0) {
                const titleLower = g.title.toLowerCase()
                const matchCount = queryWords.filter((w) =>
                  titleLower.includes(w)
                ).length
                if (matchCount > bestMatchScore) {
                  bestMatchScore = matchCount
                  matchedGoalId = g.id
                }
              }

              return {
                id: g.id,
                title: g.title,
                status: g.status,
                targetDate: g.targetDate,
                readiness,
                prerequisites: prereqs,
                actions: g.actions || [],
                weeklyHours: allocData
                  ? Math.round((allocData.minutes / 60) * 10) / 10
                  : 0,
                eventCount: allocData ? allocData.count : 0,
              }
            }
          )

        setProgressData({
          goals: goalProgress,
          query,
          matchedGoalId: matchAll ? null : matchedGoalId,
        })
      } catch {
        setProgressData({ goals: [], query, matchedGoalId: null })
      }
      setProgressLoading(false)
    },
    []
  )

  const fetchRecommendations = useCallback(async () => {
    setRecommendationsLoading(true)
    try {
      const res = await fetch('/api/reasoning')
      const data = await res.json()
      setRecommendationsData(data)
    } catch {
      setRecommendationsData({ highestLeverageActions: [] })
    }
    setRecommendationsLoading(false)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const intent = await detectIntent(
      trimmed,
      tokensEnabled,
      ai.headers,
      ai.consume
    )

    switch (intent.type) {
      case 'review_all':
        setShowProgress(true)
        fetchProgress(trimmed, true)
        break
      case 'progress':
        setShowProgress(true)
        fetchProgress(intent.query || trimmed, false)
        break
      case 'work_on':
        setShowRecommendations(true)
        fetchRecommendations()
        break
      case 'navigate': {
        const target = intent.page || '/'
        if (window.location.pathname !== target) {
          window.location.href = target
        }
        setInputValue('')
        break
      }
      case 'schedule_query': {
        const schedTarget = intent.page || '/schedule'
        if (window.location.pathname !== schedTarget) {
          window.location.href = schedTarget
        }
        setInputValue('')
        break
      }
      case 'help':
        setShowHelp(true)
        break
      case 'create_goal':
        setParsed(parseGoalInput(intent.input || trimmed))
        setShowModal(true)
        break
    }
  }

  function handleCreated() {
    setShowModal(false)
    setParsed({
      title: '',
      description: '',
      targetDate: '',
      successCriteria: '',
    })
    setInputValue('')
    window.location.reload()
  }

  function handleCancel() {
    setShowModal(false)
    setParsed({
      title: '',
      description: '',
      targetDate: '',
      successCriteria: '',
    })
  }

  function handleCloseProgress() {
    setShowProgress(false)
    setProgressData(null)
    setInputValue('')
  }

  function handleCloseRecommendations() {
    setShowRecommendations(false)
    setRecommendationsData(null)
    setInputValue('')
  }

  function handleCloseHelp() {
    setShowHelp(false)
    setInputValue('')
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Try &quot;review all goals&quot; or &quot;what should I work on&quot;"
            className="w-[420px] rounded-full border border-zinc-300 bg-white/95 px-5 py-3 text-sm text-zinc-800 shadow-lg backdrop-blur-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-shadow hover:shadow-xl"
          />
          {inputValue.trim() && (
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-zinc-900 p-1.5 text-white hover:bg-zinc-700 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          )}
        </form>
      </div>

      <Modal open={showModal} onClose={handleCancel} title="Create New Goal">
        <CreateGoalForm
          key={parsed.title + parsed.targetDate}
          initialTitle={parsed.title}
          initialDescription={parsed.description}
          initialTargetDate={parsed.targetDate}
          initialSuccessCriteria={parsed.successCriteria}
          onCreated={handleCreated}
          onCancel={handleCancel}
        />
      </Modal>

      <Modal
        open={showProgress}
        onClose={handleCloseProgress}
        title="Goal Review"
      >
        <ProgressPanel
          data={progressData}
          loading={progressLoading}
          onClose={handleCloseProgress}
          onShowAll={() => {
            if (progressData) {
              setProgressData({ ...progressData, matchedGoalId: null })
            }
          }}
        />
      </Modal>

      <Modal
        open={showRecommendations}
        onClose={handleCloseRecommendations}
        title="What Should I Work On?"
      >
        <RecommendationsPanel
          data={recommendationsData}
          loading={recommendationsLoading}
          onClose={handleCloseRecommendations}
        />
      </Modal>

      <Modal
        open={showHelp}
        onClose={handleCloseHelp}
        title="Available Commands"
      >
        <HelpPanel onClose={handleCloseHelp} />
      </Modal>
    </>
  )
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  BLOCKED: '#ef4444',
  WAITING: '#f59e0b',
  COMPLETED: '#3b82f6',
  ARCHIVED: '#6b7280',
}

function ProgressPanel({
  data,
  loading,
  onClose,
  onShowAll,
}: {
  data: ProgressData | null
  loading: boolean
  onClose: () => void
  onShowAll: () => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
      </div>
    )
  }

  if (!data || data.goals.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-zinc-500">No active goals found.</p>
        <button
          onClick={onClose}
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700"
        >
          Close
        </button>
      </div>
    )
  }

  const goalsToShow = data.matchedGoalId
    ? data.goals.filter((g) => g.id === data.matchedGoalId)
    : data.goals
  const isFiltered = !!data.matchedGoalId

  const totalWeeklyHours = data.goals.reduce((s, g) => s + g.weeklyHours, 0)
  const avgReadiness = Math.round(
    data.goals.reduce((s, g) => s + g.readiness, 0) / data.goals.length
  )

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {!isFiltered && (
        <div className="flex items-center gap-4 rounded-lg bg-zinc-50 p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-900">
              {data.goals.length}
            </div>
            <div className="text-[10px] text-zinc-500">active goals</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-900">
              {avgReadiness}%
            </div>
            <div className="text-[10px] text-zinc-500">avg readiness</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-900">
              {totalWeeklyHours}h
            </div>
            <div className="text-[10px] text-zinc-500">weekly committed</div>
          </div>
        </div>
      )}

      {isFiltered && data.goals.length > 1 && (
        <p className="text-xs text-zinc-400">
          Showing results for &ldquo;{extractGoalKeywords(data.query)}&rdquo;
        </p>
      )}

      {/* Goal cards */}
      {goalsToShow.map((goal) => (
        <div
          key={goal.id}
          className="rounded-lg border border-zinc-200 p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: STATUS_COLORS[goal.status] || '#6b7280',
                }}
              />
              <span className="text-sm font-semibold text-zinc-900">
                {goal.title}
              </span>
            </div>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${STATUS_COLORS[goal.status] || '#6b7280'}20`,
                color: STATUS_COLORS[goal.status] || '#6b7280',
              }}
            >
              {goal.status}
            </span>
          </div>

          {/* Readiness + time */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-500">Readiness</span>
                <span className="font-medium text-zinc-900">
                  {goal.readiness}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${goal.readiness}%`,
                    backgroundColor:
                      goal.readiness >= 70
                        ? '#10b981'
                        : goal.readiness >= 40
                          ? '#f59e0b'
                          : '#ef4444',
                  }}
                />
              </div>
            </div>
            {goal.weeklyHours > 0 && (
              <div className="text-center shrink-0">
                <div className="text-sm font-bold text-zinc-900">
                  {goal.weeklyHours}h
                </div>
                <div className="text-[10px] text-zinc-500">/week</div>
              </div>
            )}
          </div>

          {goal.targetDate && (
            <div className="text-xs text-zinc-500">
              Target:{' '}
              {new Date(goal.targetDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {' · '}
              {(() => {
                const days = Math.ceil(
                  (new Date(goal.targetDate).getTime() - Date.now()) / 86400000
                )
                return days > 0 ? `${days} days remaining` : 'overdue'
              })()}
            </div>
          )}

          {/* Prerequisites */}
          {goal.prerequisites.length > 0 && (
            <div>
              <div className="text-xs font-medium text-zinc-700 mb-1">
                Prerequisites
              </div>
              <div className="space-y-1">
                {goal.prerequisites.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span
                      className={`shrink-0 ${
                        p.status === 'COMPLETED'
                          ? 'text-green-600'
                          : p.status === 'IN_PROGRESS'
                            ? 'text-amber-600'
                            : 'text-zinc-400'
                      }`}
                    >
                      {p.status === 'COMPLETED' ? (
                        <CircleCheck className="size-3.5" />
                      ) : p.status === 'IN_PROGRESS' ? (
                        <CircleDot className="size-3.5" />
                      ) : (
                        <Circle className="size-3.5" />
                      )}
                    </span>
                    <span className="text-zinc-700 truncate flex-1">
                      {p.title}
                    </span>
                    <span className="text-zinc-400 shrink-0">
                      {p.confidenceScore}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next actions */}
          {goal.actions.length > 0 && (
            <div>
              <div className="text-xs font-medium text-zinc-700 mb-1">
                Next Actions
              </div>
              <div className="space-y-1">
                {goal.actions
                  .filter((a) => a.status !== 'DONE')
                  .slice(0, 3)
                  .map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <ArrowRight className="size-3 shrink-0 text-zinc-400" />
                      <span className="text-zinc-700 truncate flex-1">
                        {a.title}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          a.priority === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : a.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {a.priority}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {isFiltered && (
        <button
          onClick={onShowAll}
          className="w-full text-center text-xs text-blue-600 hover:text-blue-800 py-1"
        >
          Show all {data.goals.length} goals
        </button>
      )}

      <button
        onClick={onClose}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700"
      >
        Close
      </button>
    </div>
  )
}

/* ─── Recommendations panel ─────────────────────────────────────── */

const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-amber-100 text-amber-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  LOW: 'bg-zinc-100 text-zinc-600',
}

function RecommendationsPanel({
  data,
  loading,
  onClose,
}: {
  data: RecommendationsData | null
  loading: boolean
  onClose: () => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
      </div>
    )
  }

  const actions = data?.highestLeverageActions || []

  if (actions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-zinc-500">
          No recommended actions right now.
        </p>
        <button
          onClick={onClose}
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Ranked by impact — actions that unblock the most progress across your
        goals.
      </p>

      {actions.map((action, i) => (
        <div
          key={i}
          className="rounded-lg border border-zinc-200 p-3 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-sm font-bold text-zinc-400">
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-zinc-900 truncate">
                {action.title}
              </span>
            </div>
            <span
              className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                PRIORITY_STYLE[action.priority] || PRIORITY_STYLE.LOW
              }`}
            >
              {action.priority}
            </span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            {action.reason}
          </p>
          <p className="text-[10px] text-zinc-400">
            Goal: {action.relatedGoalTitle}
          </p>
        </div>
      ))}

      <button
        onClick={onClose}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700"
      >
        Close
      </button>
    </div>
  )
}

/* ─── Help panel ────────────────────────────────────────────────── */

const HELP_ITEMS = [
  {
    command: 'review all goals',
    description:
      'See a summary of all your active goals with readiness, prerequisites, and time allocation',
  },
  {
    command: 'what should I work on',
    description: 'Get ranked recommendations for highest-impact actions',
  },
  {
    command: 'how is [goal name]',
    description: 'Check status and progress on a specific goal',
  },
  {
    command: 'show schedule',
    description: 'Open the calendar / schedule view',
  },
  {
    command: 'go to graph',
    description: 'Navigate to the goal graph visualization',
  },
  { command: 'go to timeline', description: 'Navigate to the event timeline' },
  {
    command: '[any text]',
    description: 'Create a new goal — just describe it naturally',
  },
]

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Type any of these commands, or just describe a goal to create it.
      </p>

      <div className="space-y-2">
        {HELP_ITEMS.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-2.5"
          >
            <code className="shrink-0 text-xs font-medium text-zinc-800 bg-white px-2 py-0.5 rounded border border-zinc-200">
              {item.command}
            </code>
            <span className="text-xs text-zinc-600 pt-0.5">
              {item.description}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700"
      >
        Close
      </button>
    </div>
  )
}
