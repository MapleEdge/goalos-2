'use client'

import { useTokens } from '@/lib/useTokens'

export default function SettingsPage() {
  const { tokensEnabled, setTokensEnabled } = useTokens()

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
            Data
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  Export Data
                </p>
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
