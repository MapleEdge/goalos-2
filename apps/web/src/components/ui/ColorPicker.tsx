'use client'

import { Check, ChevronDown, Pipette } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

/** Curated palette aligned with the app's Tailwind accent colors. */
const PRESETS: { hex: string; label: string }[] = [
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#0ea5e9', label: 'Sky' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#84cc16', label: 'Lime' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#71717a', label: 'Zinc' },
]

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const customRef = useRef<HTMLInputElement>(null)

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
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  const isPreset = PRESETS.some(
    (p) => p.hex.toLowerCase() === value.toLowerCase()
  )

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-2 text-sm text-zinc-700 hover:border-zinc-400 focus:border-zinc-500 focus:outline-none"
      >
        <span
          className="size-4 rounded-full border border-black/10"
          style={{ backgroundColor: value }}
        />
        <ChevronDown className="size-3 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-52 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
          <div className="grid grid-cols-6 gap-1.5">
            {PRESETS.map((p) => {
              const selected = p.hex.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={p.hex}
                  type="button"
                  title={p.label}
                  onClick={() => {
                    onChange(p.hex)
                    setOpen(false)
                  }}
                  className="flex aspect-square items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110"
                  style={{ backgroundColor: p.hex }}
                >
                  {selected && (
                    <Check className="size-3.5 text-white drop-shadow" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-2 border-t border-zinc-100 pt-2">
            <button
              type="button"
              onClick={() => customRef.current?.click()}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full border ${
                  isPreset ? 'border-zinc-200' : 'border-zinc-400'
                }`}
                style={{ backgroundColor: isPreset ? '#fff' : value }}
              >
                <Pipette
                  className={`size-3 ${isPreset ? 'text-zinc-500' : 'text-white drop-shadow'}`}
                />
              </span>
              <span className="flex-1 text-left">Custom</span>
              <span className="font-mono uppercase text-zinc-400">{value}</span>
            </button>
            <input
              ref={customRef}
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
          </div>
        </div>
      )}
    </div>
  )
}
