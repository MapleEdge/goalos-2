'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Computes the offset between the browser's local timezone and the target
 * timezone, and returns a `getNow` function that FullCalendar can use as its
 * `now` prop so the now-indicator appears at the correct position.
 */
export function useOnlineTime(timezone: string) {
  const offsetRef = useRef<number>(0)

  const computeOffset = useCallback(() => {
    try {
      const now = new Date()
      const tzString = now.toLocaleString('en-US', { timeZone: timezone })
      const localString = now.toLocaleString('en-US', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      const tzTime = new Date(tzString).getTime()
      const localTime = new Date(localString).getTime()
      offsetRef.current = tzTime - localTime
    } catch {
      offsetRef.current = 0
    }
  }, [timezone])

  useEffect(() => {
    computeOffset()
  }, [computeOffset])

  const getNow = useCallback(() => {
    return new Date(Date.now() + offsetRef.current)
  }, [])

  return { getNow }
}
