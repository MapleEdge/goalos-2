'use client'

import { ChevronDown, Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon, ICON_LIBRARY } from '@/lib/icons'
import { suggestIcons } from '@/lib/semantic/iconSuggest'
import { useEmbedder } from '@/lib/semantic/useEmbedder'

interface IconPickerProps {
  value: string
  onChange: (name: string) => void
  /** Title + description text used to rank suggested icons. */
  context?: string
  className?: string
}

function IconCell({
  name,
  selected,
  onClick,
}: {
  name: string
  selected: boolean
  onClick: () => void
}) {
  const entry = ICON_LIBRARY.find((e) => e.name === name)
  return (
    <button
      type="button"
      onClick={onClick}
      title={entry?.label ?? name}
      className={`flex aspect-square items-center justify-center rounded-lg border transition-colors ${
        selected
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-transparent text-zinc-600 hover:bg-zinc-100'
      }`}
    >
      <AppIcon name={name} className="size-4" />
    </button>
  )
}

export function IconPicker({
  value,
  onChange,
  context = '',
  className,
}: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggested, setSuggested] = useState<string[]>([])
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const { status } = useEmbedder()
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    searchRef.current?.focus()
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  // biome-ignore lint/correctness/useExhaustiveDependencies: status re-triggers ranking once the offline model is ready
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingSuggest(true)
    suggestIcons(context, 8).then((names) => {
      if (!cancelled) {
        setSuggested(names)
        setLoadingSuggest(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, context, status])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ICON_LIBRARY
    return ICON_LIBRARY.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.keywords.some((k) => k.includes(q))
    )
  }, [query])

  function choose(name: string) {
    onChange(name)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-zinc-300 px-2 text-sm text-zinc-700 hover:border-zinc-400 focus:border-zinc-500 focus:outline-none"
      >
        {value ? (
          <AppIcon name={value} className="size-4 text-zinc-700" />
        ) : (
          <span className="text-zinc-400">Icon</span>
        )}
        <ChevronDown className="size-3 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
          <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2">
            <Search className="size-3.5 text-zinc-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons"
              className="h-8 w-full bg-transparent text-sm focus:outline-none"
            />
          </div>

          {!query && (
            <div className="mb-2">
              <div className="mb-1 flex items-center gap-1 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                <Sparkles className="size-3" />
                {status === 'ready' ? 'Suggested' : 'Suggested (keywords)'}
              </div>
              <div className="grid grid-cols-6 gap-1">
                {loadingSuggest && suggested.length === 0 ? (
                  <div className="col-span-6 py-2 text-center text-xs text-zinc-400">
                    Finding icons…
                  </div>
                ) : (
                  suggested.map((name) => (
                    <IconCell
                      key={`suggested-${name}`}
                      name={name}
                      selected={name === value}
                      onClick={() => choose(name)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-6 gap-1">
              {filtered.map((entry) => (
                <IconCell
                  key={entry.name}
                  name={entry.name}
                  selected={entry.name === value}
                  onClick={() => choose(entry.name)}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="py-3 text-center text-xs text-zinc-400">
                No icons match “{query}”
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
