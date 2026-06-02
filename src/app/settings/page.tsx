'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTimezone } from '@/lib/useTimezone'
import { useTokens } from '@/lib/useTokens'

const ALL_TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return ['UTC']
  }
})()

interface TzInfo {
  id: string
  label: string
  offset: string
  abbr: string
}

function getTzInfo(tz: string, now: Date): TzInfo {
  try {
    const short =
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'short',
      })
        .formatToParts(now)
        .find((p) => p.type === 'timeZoneName')?.value || ''

    const long =
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'longOffset',
      })
        .formatToParts(now)
        .find((p) => p.type === 'timeZoneName')?.value || ''

    const offset = long.replace('GMT', 'UTC') || 'UTC'
    return {
      id: tz,
      label: `${tz.replace(/_/g, ' ')} (${offset}, ${short})`,
      offset,
      abbr: short,
    }
  } catch {
    return { id: tz, label: tz.replace(/_/g, ' '), offset: '', abbr: '' }
  }
}

export default function SettingsPage() {
  const { tokensEnabled, setTokensEnabled } = useTokens()
  const { timezone, setTimezone } = useTimezone()
  const [tzSearch, setTzSearch] = useState('')
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false)

  const tzInfoMap = useMemo(() => {
    const now = new Date()
    const map = new Map<string, TzInfo>()
    for (const tz of ALL_TIMEZONES) {
      map.set(tz, getTzInfo(tz, now))
    }
    return map
  }, [])

  useEffect(() => {
    if (!timezone) return
    const info = tzInfoMap.get(timezone)
    setTzSearch(info ? info.label : timezone.replace(/_/g, ' '))
  }, [tzInfoMap, timezone])

  const filteredTimezones = tzSearch
    ? ALL_TIMEZONES.filter((tz) => {
        const info = tzInfoMap.get(tz)
        const searchable = info ? info.label.toLowerCase() : tz.toLowerCase()
        return searchable.includes(tzSearch.toLowerCase())
      })
    : ALL_TIMEZONES

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Settings</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Configure your GoalOS preferences.
      </p>

      <div className="space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
            AI & Tokens
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">
                Use Gemini Tokens
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Enable AI-powered suggestions, intent detection, and briefing
                analysis.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={tokensEnabled}
              onClick={() => setTokensEnabled(!tokensEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 ${
                tokensEnabled ? 'bg-emerald-500' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  tokensEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
            Time Zone
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">
                Current Time Zone
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Used for schedule display, event times, and briefing timestamps.
              </p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={tzSearch}
                onChange={(e) => {
                  setTzSearch(e.target.value)
                  setTzDropdownOpen(true)
                }}
                onFocus={() => setTzDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setTzDropdownOpen(false), 150)
                }}
                placeholder="Search time zones…"
                className="w-80 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {tzDropdownOpen && filteredTimezones.length > 0 && (
                <ul className="absolute right-0 z-20 mt-1 max-h-48 w-80 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                  {filteredTimezones.slice(0, 50).map((tz) => {
                    const info = tzInfoMap.get(tz)
                    const display = info ? info.label : tz.replace(/_/g, ' ')
                    return (
                      <li key={tz}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setTimezone(tz)
                            setTzSearch(display)
                            setTzDropdownOpen(false)
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-50 ${
                            tz === timezone
                              ? 'font-semibold text-zinc-900 bg-zinc-50'
                              : 'text-zinc-600'
                          }`}
                        >
                          {display}
                        </button>
                      </li>
                    )
                  })}
                  {filteredTimezones.length > 50 && (
                    <li className="px-3 py-1.5 text-xs text-zinc-400">
                      Type to narrow results…
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
          {timezone && (
            <p className="mt-3 text-xs text-zinc-400">
              Current time:{' '}
              {new Date().toLocaleString('en-US', {
                timeZone: timezone,
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
            Data
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Export Data</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Download all your goals, vehicles, and stakeholders as JSON.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Export
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">Theme</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Choose your preferred color scheme.
              </p>
            </div>
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5">
              <button
                type="button"
                className="rounded-md bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm"
              >
                Light
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-1 text-xs font-medium text-zinc-400"
              >
                Dark
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
