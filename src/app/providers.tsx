'use client'

import type { ReactNode } from 'react'
import { TokensProvider } from '@/lib/useTokens'

export function Providers({ children }: { children: ReactNode }) {
  return <TokensProvider>{children}</TokensProvider>
}
