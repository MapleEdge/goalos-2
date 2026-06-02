'use client'

import { type ReactNode, useCallback } from 'react'
import { usePlan } from '@/lib/usePlan'

/** First day of next month — when the allotment refreshes. */
function nextResetDate(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

interface CreditsValue {
  /** AI requests consumed this period. */
  used: number
  /** Monthly allotment; null = unlimited (paid tiers). */
  limit: number | null
  /** Remaining requests; null = unlimited. */
  remaining: number | null
  /** Whether another metered AI request is allowed. */
  hasCredits: boolean
  /** Records one AI request against the allotment (optimistic + server sync). */
  consume: () => void
  /** Date the allotment refreshes. */
  resetsOn: Date
}

/**
 * Pass-through provider kept for backwards compatibility — credit state now
 * lives in the server-authoritative {@link usePlan} context.
 */
export function CreditsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useCredits(): CreditsValue {
  const { usage, noteUsage, refresh } = usePlan()

  const consume = useCallback(() => {
    noteUsage()
    // Reconcile the optimistic bump with the server's authoritative count.
    void refresh()
  }, [noteUsage, refresh])

  return {
    used: usage.used,
    limit: usage.limit,
    remaining: usage.remaining,
    hasCredits: usage.hasCredits,
    consume,
    resetsOn: nextResetDate(),
  }
}
