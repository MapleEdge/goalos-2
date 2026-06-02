// Demonstrates that desktop and web share the same TypeScript domain types.
import type { GoalSuggestion } from '@goalos/shared/types'
import { Card, CardTitle, ReadinessGauge, StatusBadge } from '@goalos/ui'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

const SAMPLE_GOALS: (GoalSuggestion & { readiness: number })[] = [
  {
    title: 'Ship the desktop client',
    description: 'Package GoalOS as a native Windows app via Tauri.',
    reasoning:
      'Offline-first access keeps momentum when away from the browser.',
    alignedValues: ['Focus', 'Craft'],
    priority: 'HIGH',
    readiness: 72,
  },
  {
    title: 'Consolidate shared UI',
    description: 'Reuse the same components across web and desktop.',
    reasoning: 'One component library means less drift and faster iteration.',
    alignedValues: ['Leverage'],
    priority: 'MEDIUM',
    readiness: 44,
  },
]

export function App() {
  const [greeting, setGreeting] = useState<string>('')

  useEffect(() => {
    invoke<string>('greet', { name: 'GoalOS' })
      .then(setGreeting)
      .catch(() => setGreeting('Running in browser (Tauri IPC unavailable)'))
  }, [])

  return (
    <main className="mx-auto max-w-2xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">GoalOS Desktop</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Native Windows shell built with Tauri — sharing UI and types with the
          web app.
        </p>
        {greeting && (
          <p className="mt-2 text-xs text-emerald-600">{greeting}</p>
        )}
      </header>

      <div className="flex flex-col gap-4">
        {SAMPLE_GOALS.map((goal) => (
          <Card key={goal.title}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{goal.title}</CardTitle>
                <p className="mt-1 text-sm text-zinc-600">{goal.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <StatusBadge status={goal.priority} />
                  {goal.alignedValues.map((value) => (
                    <span
                      key={value}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
              <ReadinessGauge score={goal.readiness} />
            </div>
          </Card>
        ))}
      </div>
    </main>
  )
}
