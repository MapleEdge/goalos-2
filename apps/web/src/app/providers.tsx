'use client'

import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'
import { CreditsProvider } from '@/lib/useCredits'
import { PlanProvider } from '@/lib/usePlan'
import { TokensProvider } from '@/lib/useTokens'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <PlanProvider>
        <CreditsProvider>
          <TokensProvider>{children}</TokensProvider>
        </CreditsProvider>
      </PlanProvider>
    </SessionProvider>
  )
}
