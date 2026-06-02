'use client'

import type { ReactNode } from 'react'
import { CreditsProvider } from '@/lib/useCredits'
import { PlanProvider } from '@/lib/usePlan'
import { TokensProvider } from '@/lib/useTokens'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PlanProvider>
      <CreditsProvider>
        <TokensProvider>{children}</TokensProvider>
      </CreditsProvider>
    </PlanProvider>
  )
}
