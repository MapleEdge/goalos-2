'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { GoalPrompt } from './GoalPrompt'
import { Nav } from './Nav'

const AUTH_PATHS = ['/login', '/register']

export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      <Nav />
      <main className="flex-1 pb-24">{children}</main>
      <GoalPrompt />
    </>
  )
}
