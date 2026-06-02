'use client'

import { useCallback, useEffect, useState } from 'react'

// ── Types ────────────────────────────────────────────────────────

interface OperationData {
  [key: string]: unknown
}

interface Operation {
  type: 'create' | 'update'
  entity: string
  reason: string
  data: OperationData
  existingId?: string
}

interface LinkOp {
  type: string
  vehicleTitle: string
  goalTitle: string
  leverage?: string
}

interface ParseResult {
  summary: string
  operations: Operation[]
  links: LinkOp[]
}

interface ApplyResult {
  entity: string
  action: string
  id: string
  title: string
}

interface BriefingSuggestion {
  id: string
  operationType: string
  entityType: string
  entityTitle: string
  reason: string | null
  proposedData: OperationData
  decision: 'ACCEPTED' | 'REJECTED' | 'SKIPPED'
  rejectionReason: string | null
  resultAction: string | null
  resultEntityId: string | null
  createdAt: string
}

interface BriefingSession {
  id: string
  inputText: string
  aiSummary: string | null
  createdAt: string
  suggestions: BriefingSuggestion[]
}

// ── Constants ────────────────────────────────────────────────────

const ENTITY_COLORS: Record<string, string> = {
  goal: '#22c55e',
  vehicle: '#06b6d4',
  stakeholder: '#ec4899',
  controlDimension: '#f59e0b',
  value: '#8b5cf6',
}

const ENTITY_LABELS: Record<string, string> = {
  goal: 'Goal',
  vehicle: 'Vehicle',
  stakeholder: 'Stakeholder',
  controlDimension: 'Control Dimension',
  value: 'Value',
}

// ── Component ────────────────────────────────────────────────────

export default function BriefingPage() {
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [approved, setApproved] = useState<Record<number, boolean>>({})
  const [edits, setEdits] = useState<Record<number, Operation>>({})
  const [rejectionReasons, setRejectionReasons] = useState<
    Record<number, string>
  >({})
  const [applyResults, setApplyResults] = useState<ApplyResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // History state
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<BriefingSession[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/briefing/history')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
      }
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    if (showHistory && sessions.length === 0) {
      fetchHistory()
    }
  }, [showHistory, sessions.length, fetchHistory])

  const handleParse = useCallback(async () => {
    setError(null)
    setParsing(true)
    setParseResult(null)
    setApplyResults(null)

    try {
      const res = await fetch('/api/briefing/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data: ParseResult = await res.json()
      setParseResult(data)
      const defaults: Record<number, boolean> = {}
      data.operations.forEach((_, i) => {
        defaults[i] = true
      })
      setApproved(defaults)
      setEdits({})
      setRejectionReasons({})
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setParsing(false)
    }
  }, [text])

  const handleApply = useCallback(async () => {
    if (!parseResult) return
    setApplying(true)
    setError(null)

    // Build suggestions array with all operations (accepted + rejected)
    const suggestions = parseResult.operations.map((op, i) => ({
      operation: edits[i] || op,
      decision: approved[i] ? ('accepted' as const) : ('rejected' as const),
      rejectionReason: !approved[i]
        ? rejectionReasons[i] || undefined
        : undefined,
    }))

    try {
      const res = await fetch('/api/briefing/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestions,
          links: parseResult.links,
          inputText: text,
          aiSummary: parseResult.summary,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setApplyResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }, [parseResult, approved, edits, rejectionReasons, text])

  const toggleApprove = (i: number) => {
    setApproved((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const approvedCount = parseResult
    ? parseResult.operations.filter((_, i) => approved[i]).length
    : 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-zinc-900">Briefing</h1>
          <p className="text-sm text-zinc-500">
            Paste any information about your situation. The AI will extract
            goals, vehicles, stakeholders, and other entities — then you review
            and approve each change before it&apos;s applied.
          </p>
        </div>
        {!parseResult && !applyResults && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            {showHistory ? 'New Briefing' : 'History'}
          </button>
        )}
      </div>

      {/* ── History ─────────────────────────────────────────────── */}
      {showHistory && !parseResult && !applyResults && (
        <HistoryView
          sessions={sessions}
          loading={loadingHistory}
          expandedSession={expandedSession}
          onToggle={(id) =>
            setExpandedSession(expandedSession === id ? null : id)
          }
        />
      )}

      {/* ── Input ──────────────────────────────────────────────── */}
      {!showHistory && !parseResult && !applyResults && (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your briefing here — academic status, career info, financial situation, relationships, goals, anything..."
            rows={14}
            className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-800 shadow-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {text.length.toLocaleString()} characters
            </span>
            <button
              type="button"
              onClick={handleParse}
              disabled={parsing || text.trim().length < 10}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {parsing ? 'Analyzing...' : 'Analyze Briefing'}
            </button>
          </div>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────── */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Review ─────────────────────────────────────────────── */}
      {parseResult && !applyResults && (
        <div>
          {/* Summary */}
          <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="mb-1 text-sm font-semibold text-zinc-700">
              AI Summary
            </h2>
            <p className="text-sm leading-relaxed text-zinc-600">
              {parseResult.summary}
            </p>
          </div>

          {/* Operations */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Proposed Changes ({parseResult.operations.length})
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const all: Record<number, boolean> = {}
                  parseResult.operations.forEach((_, i) => {
                    all[i] = true
                  })
                  setApproved(all)
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Approve All
              </button>
              <button
                type="button"
                onClick={() => setApproved({})}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Reject All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {parseResult.operations.map((op, i) => (
              <OperationCard
                key={`op-${i}-${op.entity}`}
                op={edits[i] || op}
                index={i}
                isApproved={!!approved[i]}
                rejectionReason={rejectionReasons[i] || ''}
                onToggle={() => toggleApprove(i)}
                onEdit={(updated) =>
                  setEdits((prev) => ({ ...prev, [i]: updated }))
                }
                onRejectionReasonChange={(reason) =>
                  setRejectionReasons((prev) => ({ ...prev, [i]: reason }))
                }
              />
            ))}
          </div>

          {/* Links */}
          {parseResult.links && parseResult.links.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-zinc-700">
                Relationships to Create
              </h3>
              <div className="space-y-2">
                {parseResult.links.map((link, i) => (
                  <div
                    key={`link-${i}-${link.vehicleTitle}`}
                    className="rounded-lg border border-zinc-100 bg-white px-4 py-2 text-sm"
                  >
                    <span className="font-medium text-cyan-600">
                      {link.vehicleTitle}
                    </span>
                    <span className="mx-2 text-zinc-400">&rarr;</span>
                    <span className="font-medium text-green-600">
                      {link.goalTitle}
                    </span>
                    {link.leverage && (
                      <span className="ml-2 text-zinc-400">
                        — {link.leverage}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setParseResult(null)
                setApproved({})
                setEdits({})
                setRejectionReasons({})
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              &larr; Back to Edit
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || approvedCount === 0}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {applying
                ? 'Applying...'
                : `Apply ${approvedCount} Change${approvedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────── */}
      {applyResults && (
        <div>
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <h2 className="mb-1 text-sm font-semibold text-green-800">
              Briefing Applied
            </h2>
            <p className="text-sm text-green-700">
              {applyResults.length} operations completed successfully.
            </p>
          </div>
          <div className="space-y-2">
            {applyResults.map((r, i) => (
              <div
                key={`result-${i}-${r.id}`}
                className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-white px-4 py-2.5"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: ENTITY_COLORS[r.entity] || '#94a3b8',
                  }}
                />
                <span className="text-sm font-medium text-zinc-800">
                  {r.title}
                </span>
                <span className="ml-auto text-xs uppercase text-zinc-400">
                  {r.entity}
                </span>
                <span
                  className={`text-xs font-medium ${r.action.startsWith('error') ? 'text-red-500' : 'text-green-600'}`}
                >
                  {r.action}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setText('')
                setParseResult(null)
                setApplyResults(null)
                setApproved({})
                setEdits({})
                setRejectionReasons({})
              }}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              New Briefing
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Operation Card ───────────────────────────────────────────────

function OperationCard({
  op,
  index,
  isApproved,
  rejectionReason,
  onToggle,
  onEdit,
  onRejectionReasonChange,
}: {
  op: Operation
  index: number
  isApproved: boolean
  rejectionReason: string
  onToggle: () => void
  onEdit: (updated: Operation) => void
  onRejectionReasonChange: (reason: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editJson, setEditJson] = useState('')

  const color = ENTITY_COLORS[op.entity] || '#94a3b8'
  const entityLabel = ENTITY_LABELS[op.entity] || op.entity

  const startEdit = () => {
    setEditJson(JSON.stringify(op.data, null, 2))
    setEditing(true)
  }

  const saveEdit = () => {
    try {
      const parsed = JSON.parse(editJson)
      onEdit({ ...op, data: parsed })
      setEditing(false)
    } catch {
      // invalid JSON, don't save
    }
  }

  const displayFields = Object.entries(op.data).filter(
    ([k]) =>
      !['vehicleId', 'vehicleTitle'].includes(k) &&
      op.data[k] !== null &&
      op.data[k] !== undefined
  )

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition-all ${
        isApproved ? 'border-zinc-200' : 'border-zinc-100 opacity-50'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors ${
            isApproved
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 bg-white text-transparent'
          }`}
          aria-label={`${isApproved ? 'Reject' : 'Approve'} operation ${index + 1}`}
        >
          &#10003;
        </button>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="mb-1 flex items-center gap-2">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
              style={{ backgroundColor: color }}
            >
              {entityLabel}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                op.type === 'create'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {op.type}
            </span>
            <span className="truncate text-sm font-semibold text-zinc-900">
              {String(op.data.title || op.data.name || op.data.label || '')}
            </span>
          </div>

          {/* Reason */}
          {op.reason && (
            <p className="mb-2 text-xs leading-relaxed text-zinc-500">
              {op.reason}
            </p>
          )}

          {/* Fields */}
          {!editing && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {displayFields.map(([key, val]) => (
                <div key={key} className="text-xs">
                  <span className="text-zinc-400">{key}: </span>
                  <span className="text-zinc-700">
                    {typeof val === 'object'
                      ? JSON.stringify(val)
                      : String(val)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Rejection reason input */}
          {!isApproved && (
            <div className="mt-2">
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => onRejectionReasonChange(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              />
            </div>
          )}

          {/* Edit mode */}
          {editing && (
            <div className="mt-2">
              <textarea
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 font-mono text-xs text-zinc-800 focus:border-zinc-400 focus:outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit button */}
        {!editing && isApproved && (
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            title="Edit"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ── History View ─────────────────────────────────────────────────

function HistoryView({
  sessions,
  loading,
  expandedSession,
  onToggle,
}: {
  sessions: BriefingSession[]
  loading: boolean
  expandedSession: string | null
  onToggle: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        Loading history...
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        No briefing sessions yet. Paste a briefing and analyze it to get
        started.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const accepted = session.suggestions.filter(
          (s) => s.decision === 'ACCEPTED'
        )
        const rejected = session.suggestions.filter(
          (s) => s.decision === 'REJECTED'
        )
        const isExpanded = expandedSession === session.id

        return (
          <div
            key={session.id}
            className="rounded-xl border border-zinc-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => onToggle(session.id)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">
                    {new Date(session.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                    {accepted.length} accepted
                  </span>
                  {rejected.length > 0 && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                      {rejected.length} rejected
                    </span>
                  )}
                </div>
                {session.aiSummary && (
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {session.aiSummary}
                  </p>
                )}
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`shrink-0 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {isExpanded && (
              <div className="border-t border-zinc-100 px-4 pb-4 pt-3">
                {/* Input text preview */}
                <details className="mb-3">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-700">
                    Original briefing text
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
                    {session.inputText}
                  </pre>
                </details>

                {/* Suggestions list */}
                <div className="space-y-2">
                  {session.suggestions.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                        s.decision === 'ACCEPTED'
                          ? 'border-zinc-100 bg-white'
                          : 'border-red-100 bg-red-50/50'
                      }`}
                    >
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            ENTITY_COLORS[s.entityType] || '#94a3b8',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                            style={{
                              backgroundColor:
                                ENTITY_COLORS[s.entityType] || '#94a3b8',
                            }}
                          >
                            {ENTITY_LABELS[s.entityType] || s.entityType}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                              s.operationType === 'create'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {s.operationType}
                          </span>
                          <span className="truncate text-xs font-medium text-zinc-800">
                            {s.entityTitle}
                          </span>
                        </div>
                        {s.reason && (
                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            {s.reason}
                          </p>
                        )}
                        {s.rejectionReason && (
                          <p className="mt-1 text-[11px] italic text-red-600">
                            Rejection reason: {s.rejectionReason}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-medium ${
                          s.decision === 'ACCEPTED'
                            ? 'text-green-600'
                            : 'text-red-500'
                        }`}
                      >
                        {s.decision === 'ACCEPTED'
                          ? s.resultAction || 'applied'
                          : 'rejected'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
