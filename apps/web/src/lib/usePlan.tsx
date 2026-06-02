'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  DEFAULT_PLAN,
  getPlan,
  isPlanId,
  type PlanConfig,
  type PlanId,
} from '@/lib/plan'
import {
  configureEmbedder,
  startEmbedderInstall,
} from '@/lib/semantic/embedder'

/** Opaque subscription token persisted on the device. */
const TOKEN_KEY = 'goalos-sub-token'

/** Server-derived subscription state (mirrors the API's status union). */
export type SubscriptionState =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'

export interface PlanUsage {
  /** AI requests consumed this period (server-tracked). */
  used: number
  /** Monthly allotment; null = unlimited. */
  limit: number | null
  /** Remaining requests; null = unlimited. */
  remaining: number | null
  /** Whether another metered AI request is allowed. */
  hasCredits: boolean
}

interface EntitlementResponse {
  token?: string
  status: SubscriptionState
  entitled: boolean
  tier: PlanId
  creditLimit: number | null
  used: number
  remaining: number | null
  hasCredits: boolean
  trialEndsAt: string | null
}

interface PlanContextValue {
  planId: PlanId
  plan: PlanConfig
  /** Subscription token sent with AI requests; null until registered. */
  token: string | null
  /** Server-derived subscription state. */
  status: SubscriptionState
  /** Whether any AI is unlocked (trial/paid, or metered Free fallback). */
  entitled: boolean
  /** Trial end (ISO) while trialing, else null. */
  trialEndsAt: string | null
  usage: PlanUsage
  loading: boolean
  /** Re-pull tier + usage from the server. */
  refresh: () => Promise<void>
  /** Optimistically record a consumed credit after a successful AI call. */
  noteUsage: () => void
}

const UNLIMITED_USAGE: PlanUsage = {
  used: 0,
  limit: null,
  remaining: null,
  hasCredits: true,
}

const PlanContext = createContext<PlanContextValue>({
  planId: DEFAULT_PLAN,
  plan: getPlan(DEFAULT_PLAN),
  token: null,
  status: 'none',
  entitled: false,
  trialEndsAt: null,
  usage: UNLIMITED_USAGE,
  loading: true,
  refresh: async () => {},
  noteUsage: () => {},
})

function usageFrom(e: EntitlementResponse): PlanUsage {
  return {
    used: e.used,
    limit: e.creditLimit,
    remaining: e.remaining,
    hasCredits: e.hasCredits,
  }
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [planId, setPlanId] = useState<PlanId>(DEFAULT_PLAN)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<SubscriptionState>('none')
  const [entitled, setEntitled] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [usage, setUsage] = useState<PlanUsage>(UNLIMITED_USAGE)
  const [loading, setLoading] = useState(true)
  const tokenRef = useRef<string | null>(null)

  const apply = useCallback((e: EntitlementResponse) => {
    if (isPlanId(e.tier)) setPlanId(e.tier)
    setStatus(e.status)
    setEntitled(e.entitled)
    setTrialEndsAt(e.trialEndsAt)
    setUsage(usageFrom(e))
  }, [])

  // Register (or restore) the device subscription on first load. The server is
  // authoritative for the tier — the client never decides what it's paid for.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let stored: string | null = null
      try {
        stored = localStorage.getItem(TOKEN_KEY)
      } catch {
        // localStorage unavailable
      }
      try {
        const res = await fetch('/api/subscription/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(stored ? { token: stored } : {}),
        })
        const data = (await res.json()) as EntitlementResponse
        if (cancelled) return
        if (data.token) {
          setToken(data.token)
          tokenRef.current = data.token
          try {
            localStorage.setItem(TOKEN_KEY, data.token)
          } catch {
            // ignore
          }
        }
        apply(data)
      } catch {
        // Offline / server unreachable — stay on the Free default.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

  // Point the on-device embedder at the model unlocked by the active tier, then
  // (re)start the background install so the better model loads after upgrades.
  useEffect(() => {
    const plan = getPlan(planId)
    configureEmbedder({
      modelId: plan.embedModel,
      queryPrefix: plan.queryPrefix,
    })
    startEmbedderInstall()
  }, [planId])

  const refresh = useCallback(async () => {
    const t = tokenRef.current
    if (!t) return
    try {
      const res = await fetch('/api/entitlement', {
        headers: { 'x-goalos-token': t },
      })
      const data = (await res.json()) as EntitlementResponse
      apply(data)
    } catch {
      // ignore transient failures
    }
  }, [apply])

  const noteUsage = useCallback(() => {
    setUsage((prev) => {
      if (prev.limit == null) return prev
      const used = prev.used + 1
      return {
        used,
        limit: prev.limit,
        remaining: Math.max(0, prev.limit - used),
        hasCredits: used < prev.limit,
      }
    })
  }, [])

  return (
    <PlanContext.Provider
      value={{
        planId,
        plan: getPlan(planId),
        token,
        status,
        entitled,
        trialEndsAt,
        usage,
        loading,
        refresh,
        noteUsage,
      }}
    >
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  return useContext(PlanContext)
}
