'use client'

import { ValuePills } from '@goalos/ui/components/ValuePills'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTokens } from '@/lib/useTokens'
import { TimeCommitmentStep } from './TimeCommitmentStep'

interface TimeBlock {
  day: number
  hour: number
  selected: boolean
}

interface Stakeholder {
  id: string
  name: string
  organization: string | null
  role: string | null
}

interface CapabilityEntry {
  capability: string
  willingness: string
  condition?: string | null
  // legacy format support
  type?: string
  description?: string
}

interface ValueExchangeSuggestion {
  strategy: string
  reasoning: string
  userAssetUsed: string | null
  stakeholderMotivator: string
  feasibility: 'high' | 'medium' | 'low'
}

interface SuggestedStakeholder {
  stakeholderId: string
  name: string
  organization: string | null
  role: string | null
  capabilities: CapabilityEntry[]
  relevanceScore: number
  valueExchangeSuggestions?: ValueExchangeSuggestion[]
}

interface SelectedStakeholder {
  stakeholderId: string
  name: string
  organization: string | null
  label: string
}

interface NewStakeholder {
  tempId: string
  name: string
  organization: string
  role: string
  label: string
}

export function CreateGoalForm({
  onCreated,
  onCancel,
  initialTitle = '',
  initialDescription = '',
  initialTargetDate = '',
  initialSuccessCriteria = '',
}: {
  onCreated: () => void
  onCancel: () => void
  initialTitle?: string
  initialDescription?: string
  initialTargetDate?: string
  initialSuccessCriteria?: string
}) {
  const { tokensEnabled } = useTokens()
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [targetDate, setTargetDate] = useState(initialTargetDate)
  const [successCriteria, setSuccessCriteria] = useState(initialSuccessCriteria)
  const [selectedValues, setSelectedValues] = useState<
    { id: string; label: string }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'details' | 'time'>('details')

  // Stakeholder linking state
  const [showStakeholders, setShowStakeholders] = useState(false)
  const [allStakeholders, setAllStakeholders] = useState<Stakeholder[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStakeholders, setSelectedStakeholders] = useState<
    SelectedStakeholder[]
  >([])
  const [newStakeholders, setNewStakeholders] = useState<NewStakeholder[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newOrg, setNewOrg] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestedStakeholder[]>([])
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set()
  )
  const suggestionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Capability editing state
  const [editingStakeholderId, setEditingStakeholderId] = useState<
    string | null
  >(null)
  const [editingCapabilities, setEditingCapabilities] = useState<
    CapabilityEntry[]
  >([])
  const [savingCapabilities, setSavingCapabilities] = useState(false)

  useEffect(() => {
    if (showStakeholders && allStakeholders.length === 0) {
      fetch('/api/stakeholders')
        .then((r) => r.json())
        .then((data: Stakeholder[]) => setAllStakeholders(data))
    }
  }, [showStakeholders, allStakeholders.length])

  const fetchSuggestions = useCallback(() => {
    if (!tokensEnabled) {
      setSuggestions([])
      return
    }
    const goalText = [title, description, successCriteria].join(' ').trim()
    if (goalText.length < 5) {
      setSuggestions([])
      return
    }
    fetch('/api/stakeholders/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, successCriteria }),
    })
      .then((r) => r.json())
      .then((data: SuggestedStakeholder[]) => setSuggestions(data))
      .catch(() => setSuggestions([]))
  }, [title, description, successCriteria, tokensEnabled])

  useEffect(() => {
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current)
    suggestionsTimerRef.current = setTimeout(fetchSuggestions, 500)
    return () => {
      if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current)
    }
  }, [fetchSuggestions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredStakeholders = allStakeholders.filter((s) => {
    const alreadySelected = selectedStakeholders.some(
      (sel) => sel.stakeholderId === s.id
    )
    if (alreadySelected) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.organization?.toLowerCase().includes(q) ||
      s.role?.toLowerCase().includes(q)
    )
  })

  function selectStakeholder(s: Stakeholder) {
    setSelectedStakeholders((prev) => [
      ...prev,
      {
        stakeholderId: s.id,
        name: s.name,
        organization: s.organization,
        label: '',
      },
    ])
    setSearchQuery('')
    setShowDropdown(false)
  }

  function acceptSuggestion(s: SuggestedStakeholder) {
    const bestCap = s.capabilities[0]
    setSelectedStakeholders((prev) => [
      ...prev,
      {
        stakeholderId: s.stakeholderId,
        name: s.name,
        organization: s.organization,
        label: bestCap?.capability || bestCap?.description || '',
      },
    ])
    if (!showStakeholders) setShowStakeholders(true)
  }

  function dismissSuggestion(id: string) {
    setDismissedSuggestions((prev) => new Set(prev).add(id))
  }

  async function startEditing(stakeholderId: string) {
    const res = await fetch(`/api/stakeholders/${stakeholderId}`)
    const data = await res.json()
    const caps = (data.capabilities as CapabilityEntry[] | null) || []
    setEditingCapabilities(caps)
    setEditingStakeholderId(stakeholderId)
  }

  function updateCapability(
    index: number,
    field: keyof CapabilityEntry,
    value: string
  ) {
    setEditingCapabilities((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value || null } : c))
    )
  }

  function deleteCapability(index: number) {
    setEditingCapabilities((prev) => prev.filter((_, i) => i !== index))
  }

  function addCapability() {
    setEditingCapabilities((prev) => [
      ...prev,
      { capability: '', willingness: '', condition: null },
    ])
  }

  async function saveCapabilities(stakeholderId: string) {
    setSavingCapabilities(true)
    const valid = editingCapabilities.filter((c) =>
      (c.capability || c.description || '').trim()
    )
    await fetch(`/api/stakeholders/${stakeholderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capabilities: valid }),
    })
    setSavingCapabilities(false)
    setEditingStakeholderId(null)
    // Re-trigger suggestions to reflect updated capabilities
    fetchSuggestions()
  }

  function removeSelected(id: string) {
    setSelectedStakeholders((prev) =>
      prev.filter((s) => s.stakeholderId !== id)
    )
  }

  function updateSelectedLabel(id: string, label: string) {
    setSelectedStakeholders((prev) =>
      prev.map((s) => (s.stakeholderId === id ? { ...s, label } : s))
    )
  }

  function addNewStakeholder() {
    if (!newName.trim()) return
    setNewStakeholders((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}`,
        name: newName.trim(),
        organization: newOrg.trim(),
        role: newRole.trim(),
        label: newLabel.trim(),
      },
    ])
    setNewName('')
    setNewOrg('')
    setNewRole('')
    setNewLabel('')
    setShowNewForm(false)
  }

  function removeNew(tempId: string) {
    setNewStakeholders((prev) => prev.filter((s) => s.tempId !== tempId))
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setStep('time')
  }

  async function createGoalWithTimeBlocks(
    weeklyHours: number,
    blocks: TimeBlock[]
  ) {
    setLoading(true)

    const goalRes = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        targetDate: targetDate || null,
        successCriteria: successCriteria.trim() || null,
        valueId: selectedValues[0]?.id || null,
        valueIds: selectedValues.map((v) => v.id),
      }),
    })
    const goal = await goalRes.json()

    // Link existing stakeholders
    for (const sel of selectedStakeholders) {
      await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromType: 'STAKEHOLDER',
          fromId: sel.stakeholderId,
          toType: 'GOAL',
          toId: goal.id,
          label: sel.label || 'linked to',
        }),
      })
    }

    // Create new stakeholders and link them
    for (const ns of newStakeholders) {
      const sRes = await fetch('/api/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ns.name,
          organization: ns.organization || null,
          role: ns.role || null,
          relationshipStrength: 50,
          lastInteraction: new Date().toISOString(),
        }),
      })
      const stakeholder = await sRes.json()

      await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromType: 'STAKEHOLDER',
          fromId: stakeholder.id,
          toType: 'GOAL',
          toId: goal.id,
          label: ns.label || 'linked to',
        }),
      })
    }

    // Create schedule events for confirmed time blocks
    if (blocks.length > 0) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      for (const block of blocks) {
        if (!block.selected) continue
        const blockStart = new Date(weekStart)
        blockStart.setDate(blockStart.getDate() + block.day)
        blockStart.setHours(block.hour, 0, 0, 0)
        const blockEnd = new Date(blockStart)
        blockEnd.setHours(block.hour + 1, 0, 0, 0)

        await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Work on: ${title.trim()}`,
            description: `Weekly time block for goal: ${title.trim()}\nCommitment: ${weeklyHours}h/week`,
            startTime: blockStart.toISOString(),
            endTime: blockEnd.toISOString(),
            goalId: goal.id,
            color: '#10b981',
          }),
        })
      }
    }

    setLoading(false)
    onCreated()
  }

  const totalLinked = selectedStakeholders.length + newStakeholders.length

  const visibleSuggestions = suggestions.filter(
    (s) =>
      !dismissedSuggestions.has(s.stakeholderId) &&
      !selectedStakeholders.some((sel) => sel.stakeholderId === s.stakeholderId)
  )

  if (step === 'time') {
    return (
      <TimeCommitmentStep
        goalTitle={title}
        targetDate={targetDate}
        onConfirm={createGoalWithTimeBlocks}
        onBack={() => setStep('details')}
      />
    )
  }

  return (
    <form onSubmit={handleNextStep} className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="h-5 w-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-medium">
            1
          </span>
          Details
        </span>
        <span className="h-px w-4 bg-zinc-300" />
        <span className="flex items-center gap-1">
          <span className="h-5 w-5 rounded-full bg-zinc-200 text-zinc-500 text-[10px] flex items-center justify-center font-medium">
            2
          </span>
          Time
        </span>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Goal Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Obtain TA Position"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does achieving this goal look like?"
          rows={3}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Aligned Values
        </label>
        <ValuePills selected={selectedValues} onChange={setSelectedValues} />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Target Date
        </label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Success Criteria
        </label>
        <textarea
          value={successCriteria}
          onChange={(e) => setSuccessCriteria(e.target.value)}
          placeholder="How will you know this goal is achieved?"
          rows={2}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      {/* Suggested stakeholders */}
      {visibleSuggestions.length > 0 && (
        <div className="border-t border-zinc-100 pt-3">
          <p className="mb-2 text-xs font-medium text-amber-700">
            Suggested stakeholders based on this goal:
          </p>
          <div className="space-y-2">
            {visibleSuggestions.map((s) => (
              <div
                key={s.stakeholderId}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 flex-shrink-0 rounded-full bg-amber-100 text-center text-xs leading-6 text-amber-700">
                    {s.name.charAt(0)}
                  </span>
                  <span className="text-sm font-medium text-zinc-800">
                    {s.name}
                  </span>
                  {s.organization && (
                    <span className="text-xs text-zinc-400">
                      {s.organization}
                    </span>
                  )}
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => acceptSuggestion(s)}
                      className="rounded bg-amber-600 px-2 py-0.5 text-xs text-white hover:bg-amber-700"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(s.stakeholderId)}
                      className="rounded bg-zinc-600 px-2 py-0.5 text-xs text-white hover:bg-zinc-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissSuggestion(s.stakeholderId)}
                      className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {editingStakeholderId === s.stakeholderId ? (
                  <div className="mt-2 space-y-2 rounded-lg border border-zinc-300 bg-white p-3">
                    <p className="text-xs font-medium text-zinc-700">
                      Edit Capabilities
                    </p>
                    {editingCapabilities.map((cap, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-zinc-500">
                            #{i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteCapability(i)}
                            className="ml-auto rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M4 4l8 8M12 4l-8 8" />
                            </svg>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={cap.capability || cap.description || ''}
                          onChange={(e) =>
                            updateCapability(i, 'capability', e.target.value)
                          }
                          placeholder="Capability — what can they do?"
                          className="w-full rounded border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={cap.willingness || ''}
                          onChange={(e) =>
                            updateCapability(i, 'willingness', e.target.value)
                          }
                          placeholder="Willingness — how willing are they?"
                          className="w-full rounded border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={cap.condition || ''}
                          onChange={(e) =>
                            updateCapability(i, 'condition', e.target.value)
                          }
                          placeholder="Condition (optional)"
                          className="w-full rounded border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addCapability}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                      </svg>
                      Add capability
                    </button>
                    <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setEditingStakeholderId(null)}
                        className="rounded px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveCapabilities(s.stakeholderId)}
                        disabled={savingCapabilities}
                        className="rounded bg-zinc-800 px-2.5 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {savingCapabilities ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Semantic capabilities */}
                    <div className="mt-1.5 space-y-2 pl-8">
                      {s.capabilities.map((cap, i) => (
                        <div
                          key={i}
                          className="text-xs rounded border border-zinc-100 bg-zinc-50 p-2"
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 flex-shrink-0">
                              capability
                            </span>
                            <span className="text-zinc-700">
                              {cap.capability || cap.description}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5 mt-1">
                            <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 flex-shrink-0">
                              willingness
                            </span>
                            <span className="text-zinc-600">
                              {cap.willingness || 'not specified'}
                            </span>
                          </div>
                          {cap.condition && (
                            <div className="mt-1 text-zinc-500 pl-0.5">
                              condition:{' '}
                              <span className="font-medium text-zinc-700">
                                {cap.condition}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Value exchange suggestions (when AI detects willingness gap) */}
                    {s.valueExchangeSuggestions &&
                      s.valueExchangeSuggestions.length > 0 && (
                        <div className="mt-2 ml-8 rounded-lg border border-red-200 bg-red-50 p-2.5">
                          <p className="text-xs font-semibold text-red-700 mb-1.5">
                            Willingness gap detected — suggested value
                            exchanges:
                          </p>
                          <div className="space-y-2">
                            {s.valueExchangeSuggestions.map((ve, i) => (
                              <div
                                key={i}
                                className="rounded border border-red-100 bg-white p-2"
                              >
                                <div className="flex items-start gap-1.5">
                                  <span
                                    className={`mt-0.5 inline-block h-4 w-4 flex-shrink-0 rounded text-center text-[10px] font-bold leading-4 ${
                                      ve.feasibility === 'high'
                                        ? 'bg-green-100 text-green-700'
                                        : ve.feasibility === 'medium'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {i + 1}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-zinc-800">
                                      {ve.strategy}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-zinc-500">
                                      {ve.reasoning}
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {ve.userAssetUsed && (
                                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                                          You offer: {ve.userAssetUsed}
                                        </span>
                                      )}
                                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                                        They want: {ve.stakeholderMotivator}
                                      </span>
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                          ve.feasibility === 'high'
                                            ? 'bg-green-50 text-green-600'
                                            : ve.feasibility === 'medium'
                                              ? 'bg-amber-50 text-amber-600'
                                              : 'bg-red-50 text-red-600'
                                        }`}
                                      >
                                        {ve.feasibility} feasibility
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional stakeholder linking */}
      <div className="border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={() => setShowStakeholders(!showStakeholders)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`transition-transform ${showStakeholders ? 'rotate-90' : ''}`}
          >
            <path
              d="M6 4l4 4-4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Link Stakeholders
          {totalLinked > 0 && (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white">
              {totalLinked}
            </span>
          )}
          <span className="text-xs font-normal text-zinc-400">(optional)</span>
        </button>

        {showStakeholders && (
          <div className="mt-3 space-y-3">
            {/* Search existing stakeholders */}
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search existing stakeholders..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
              {showDropdown && filteredStakeholders.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                  {filteredStakeholders.slice(0, 8).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectStakeholder(s)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                    >
                      <span className="h-6 w-6 flex-shrink-0 rounded-full bg-pink-100 text-center text-xs leading-6 text-pink-600">
                        {s.name.charAt(0)}
                      </span>
                      <span className="truncate font-medium text-zinc-800">
                        {s.name}
                      </span>
                      {s.organization && (
                        <span className="truncate text-xs text-zinc-400">
                          {s.organization}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected stakeholders */}
            {selectedStakeholders.map((sel) => (
              <div
                key={sel.stakeholderId}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <span className="h-6 w-6 flex-shrink-0 rounded-full bg-pink-100 text-center text-xs leading-6 text-pink-600">
                  {sel.name.charAt(0)}
                </span>
                <span className="text-sm font-medium text-zinc-800">
                  {sel.name}
                </span>
                {sel.organization && (
                  <span className="text-xs text-zinc-400">
                    {sel.organization}
                  </span>
                )}
                <input
                  type="text"
                  value={sel.label}
                  onChange={(e) =>
                    updateSelectedLabel(sel.stakeholderId, e.target.value)
                  }
                  placeholder="role (e.g., advisor, investor)"
                  className="ml-auto w-40 rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeSelected(sel.stakeholderId)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            ))}

            {/* New stakeholders */}
            {newStakeholders.map((ns) => (
              <div
                key={ns.tempId}
                className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2"
              >
                <span className="h-6 w-6 flex-shrink-0 rounded-full bg-green-100 text-center text-xs leading-6 text-green-600">
                  +
                </span>
                <span className="text-sm font-medium text-zinc-800">
                  {ns.name}
                </span>
                {ns.organization && (
                  <span className="text-xs text-zinc-400">
                    {ns.organization}
                  </span>
                )}
                {ns.label && (
                  <span className="text-xs text-zinc-500 italic">
                    {ns.label}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeNew(ns.tempId)}
                  className="ml-auto text-zinc-400 hover:text-zinc-600"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add new stakeholder inline form */}
            {showNewForm ? (
              <div className="space-y-2 rounded-lg border border-dashed border-zinc-300 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name *"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    placeholder="Organization"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="Role"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Relationship (e.g., mentor)"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="rounded px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addNewStakeholder}
                    disabled={!newName.trim()}
                    className="rounded bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                </svg>
                Add new stakeholder
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Next: Time Commitment
        </button>
      </div>
    </form>
  )
}
