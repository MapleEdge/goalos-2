'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { GoalPrompt } from './GoalPrompt'
import { ModelStatus } from './ModelStatus'
import { Nav } from './Nav'

const authPaths = ['/login', '/signup']

export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = authPaths.includes(pathname)

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      <Nav />
      <main className="flex-1 pb-24">{children}</main>
      <GoalPrompt />
      <ModelStatus />
    </>
  )
}
