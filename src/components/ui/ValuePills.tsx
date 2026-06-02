'use client'

import { useEffect, useRef, useState } from 'react'

interface ValueOption {
  id: string
  label: string
}

interface ValuePillsProps {
  selected: ValueOption[]
  onChange: (values: ValueOption[]) => void
  /** If true, shows as read-only pills (no add/remove) */
  readOnly?: boolean
}

export function ValuePills({
  selected,
  onChange,
  readOnly = false,
}: ValuePillsProps) {
  const [allValues, setAllValues] = useState<ValueOption[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/values')
      .then((r) => r.json())
      .then((data: ValueOption[]) => setAllValues(data))
      .catch(() => setAllValues([]))
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const available = allValues.filter(
    (v) => !selected.some((s) => s.id === v.id)
  )

  function add(value: ValueOption) {
    onChange([...selected, value])
    setOpen(false)
  }

  function remove(id: string) {
    onChange(selected.filter((v) => v.id !== id))
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((v) => (
        <span
          key={v.id}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
        >
          {v.label}
          {!readOnly && (
            <button
              type="button"
              onClick={() => remove(v.id)}
              className="ml-0.5 text-zinc-400 hover:text-zinc-600"
              aria-label={`Remove ${v.label}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!readOnly && available.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-600"
          >
            + Value
          </button>
          {open && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              {available.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => add(v)}
                  className="w-full px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {selected.length === 0 && readOnly && (
        <span className="text-xs text-zinc-400">No values</span>
      )}
    </div>
  )
}
