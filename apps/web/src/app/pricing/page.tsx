'use client'

import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PLAN_ORDER, PLANS, type PlanId } from '@/lib/plan'
import { usePlan } from '@/lib/usePlan'

export default function PricingPage() {
  const { planId, token, refresh } = usePlan()
  const [busy, setBusy] = useState<PlanId | null>(null)
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(null)

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status')
    if (status === 'success') {
      setBanner('success')
      void refresh()
    } else if (status === 'cancelled') {
      setBanner('cancelled')
    }
  }, [refresh])

  async function startCheckout(target: PlanId) {
    setBusy(target)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: target, token }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setBusy(null)
    } catch {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 text-center">
        Choose your plan
      </h1>
      <p className="text-sm text-zinc-500 text-center mt-2 mb-10">
        Every tier unlocks progressively more powerful AI. Cancel anytime.
      </p>

      {banner === 'success' && (
        <div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Payment received — your plan is now active.
        </div>
      )}
      {banner === 'cancelled' && (
        <div className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Checkout cancelled — no changes were made.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id]
          const isCurrent = id === planId
          const isPaid = id !== 'free'
          const highlight = id === 'pro'
          return (
            <div
              key={id}
              className={`flex flex-col rounded-2xl border bg-white p-6 ${
                highlight ? 'border-zinc-900 shadow-lg' : 'border-zinc-200'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {plan.name}
                </h2>
                {highlight && (
                  <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    Popular
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-900">
                  ${plan.price}
                </span>
                <span className="text-sm text-zinc-500">/mo</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2 min-h-[2.5rem]">
                {plan.tagline}
              </p>

              <div className="mt-5">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-400"
                  >
                    Current plan
                  </button>
                ) : isPaid ? (
                  <button
                    type="button"
                    onClick={() => startCheckout(id)}
                    disabled={busy !== null}
                    className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                      highlight
                        ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                        : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {busy === id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Upgrade to {plan.name}
                  </button>
                ) : (
                  <div className="h-[38px]" />
                )}
              </div>

              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-zinc-600"
                  >
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.locked?.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-zinc-300 line-through"
                  >
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
