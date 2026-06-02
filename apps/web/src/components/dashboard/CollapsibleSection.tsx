'use client'

import { useState } from 'react'

export function CollapsibleSection({
  title,
  count,
  storageKey,
  defaultOpen = true,
  children,
}: {
  title: string
  count: number
  storageKey?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined' || !storageKey) return defaultOpen
    const saved = window.localStorage.getItem(storageKey)
    return saved === null ? defaultOpen : saved === '1'
  })

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      if (storageKey) window.localStorage.setItem(storageKey, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className={`text-zinc-400 transition-transform ${open ? 'rotate-90' : ''}`}
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold text-zinc-900">{title}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
            {count}
          </span>
        </span>
      </button>
      {open && <div className="space-y-4 px-4 pb-4">{children}</div>}
    </div>
  )
}
