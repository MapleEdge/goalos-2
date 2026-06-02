'use client'

import { Check, Infinity as InfinityIcon, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { PLANS, type PlanId } from '@/lib/plan'
import { usePlan } from '@/lib/usePlan'

function resetLabel(): string {
  const d = new Date()
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  return next.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysLeft(iso: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  )
}

export function BillingSection() {
  const { planId, plan, token, status, trialEndsAt, usage, loading } = usePlan()
  const [busy, setBusy] = useState<PlanId | 'portal' | null>(null)

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

  async function openPortal() {
    setBusy('portal')
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setBusy(null)
    } catch {
      setBusy(null)
    }
  }

  const isTrialing = status === 'trialing'
  const isActive = status === 'active'
  const isFallback = status === 'canceled' || status === 'past_due'
  const isLocked = !isTrialing && !isActive && !isFallback
  const metered = isFallback && usage.limit != null
  const pct =
    metered && usage.limit
      ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
      : 0

  const displayName = isLocked ? 'No active plan' : plan.name

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
        Billing & Usage
      </h2>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-zinc-900">
              {displayName}
            </span>
            {!isLocked && plan.price > 0 && (
              <span className="text-xs text-zinc-500">${plan.price}/mo</span>
            )}
            {isTrialing && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Free trial
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isLocked
              ? 'Start your 2-month free trial to unlock premium models.'
              : plan.tagline}
          </p>
        </div>
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" aria-hidden />
        )}
      </div>

      <div className="mt-5">
        {isTrialing && (
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <InfinityIcon className="h-4 w-4 text-emerald-600" aria-hidden />
            <span>
              Unlimited use of the {plan.aiModelLabel}.
              {trialEndsAt
                ? ` Free for ${daysLeft(trialEndsAt)} more days — renews ${formatDate(
                    trialEndsAt
                  )} at $${plan.price}/mo.`
                : ''}
            </span>
          </div>
        )}
        {isActive && (
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <InfinityIcon className="h-4 w-4 text-emerald-600" aria-hidden />
            Unlimited use of the {plan.aiModelLabel}. Renews monthly at $
            {plan.price}/mo.
          </div>
        )}
        {isFallback && (
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-600 mb-1.5">
              <span>
                {usage.used} / {usage.limit} credits used
              </span>
              <span>{usage.remaining} left</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 100 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              Free fallback after cancellation. Resets {resetLabel()}. Powered
              by the {plan.aiModelLabel}.
            </p>
          </div>
        )}
        {isLocked && (
          <p className="text-sm text-zinc-500">
            No active plan yet. Start a free trial below to begin.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(isLocked || isFallback || planId === 'free') && (
          <button
            type="button"
            onClick={() => startCheckout('pro')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy === 'pro' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Start 2-month free trial
          </button>
        )}
        {planId !== 'max' && (
          <button
            type="button"
            onClick={() => startCheckout('max')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy === 'max' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isLocked || isFallback ? 'Go Max' : 'Upgrade to Max'}
          </button>
        )}
        {(isTrialing || isActive) && (
          <button
            type="button"
            onClick={openPortal}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy === 'portal' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Manage billing
          </button>
        )}
      </div>

      <ul className="mt-5 space-y-1.5">
        {PLANS[planId].features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-zinc-600">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </section>
  )
}
