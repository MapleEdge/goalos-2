'use client'

import { useMemo } from 'react'
import { usePlan } from '@/lib/usePlan'
import { useTokens } from '@/lib/useTokens'

export interface AiAccess {
  /** True when a cloud AI request may be made right now. */
  aiAllowed: boolean
  /** Why AI is unavailable, for upgrade/prompt copy. */
  reason: 'ok' | 'tokens-off' | 'no-credits'
  /** Active plan id. */
  planId: string
  /** Headers to attach to AI fetch calls (carries the subscription token). */
  headers: Record<string, string>
  /** Record one AI request against the plan's allotment (optimistic). */
  consume: () => void
  /** Re-pull authoritative tier + usage from the server. */
  refresh: () => Promise<void>
}

/**
 * Centralizes gating for cloud AI features: the master tokens toggle and the
 * server-tracked monthly allotment. Components call this before hitting an AI
 * endpoint and `consume()` after a successful request. The tier itself is
 * enforced server-side from the token — this only drives client UX.
 */
export function useAiAccess(): AiAccess {
  const { tokensEnabled } = useTokens()
  const { planId, token, usage, noteUsage, refresh } = usePlan()

  let reason: AiAccess['reason'] = 'ok'
  if (!tokensEnabled) reason = 'tokens-off'
  else if (!usage.hasCredits) reason = 'no-credits'

  // Stable identity so callers can safely use it in effect dependency arrays.
  const headers = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = {}
    if (token) h['x-goalos-token'] = token
    return h
  }, [token])

  return {
    aiAllowed: tokensEnabled && usage.hasCredits,
    reason,
    planId,
    headers,
    consume: noteUsage,
    refresh,
  }
}
