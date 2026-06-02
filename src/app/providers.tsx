'use client'

import { TokensProvider } from '@/lib/useTokens'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return <TokensProvider>{children}</TokensProvider>
}
