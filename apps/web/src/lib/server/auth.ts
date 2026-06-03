import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * Get the authenticated user's ID from the session.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * Require an authenticated user. Returns the user ID or throws a Response
 * that the caller can return directly.
 */
export async function requireAuthUserId(): Promise<string> {
  const userId = await getAuthUserId()
  if (!userId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return userId
}

/**
 * Wrapper for API route handlers that enforces authentication.
 * Catches the NextResponse thrown by requireAuthUserId().
 */
export function withAuth<T>(
  handler: (userId: string, ...args: T[]) => Promise<NextResponse>
) {
  return async (...args: T[]): Promise<NextResponse> => {
    try {
      const userId = await requireAuthUserId()
      return await handler(userId, ...args)
    } catch (err) {
      if (err instanceof NextResponse) return err
      throw err
    }
  }
}
