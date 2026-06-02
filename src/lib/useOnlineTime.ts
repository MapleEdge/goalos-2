'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fetches the real current time for a given IANA timezone from worldtimeapi.org,
 * computes an offset from the local system clock, and returns a `getNow` function
 * that FullCalendar can use as its `now` prop.
 *
 * Syncs once on mount and every 10 minutes to stay accurate.
 */
export function useOnlineTime(timezone: string) {
  const offsetRef = useRef<number>(0)
  const [ready, setReady] = useState(false)

  const sync = useCallback(async () => {
    try {
      const res = await fetch(
        `https://worldtimeapi.org/api/timezone/${timezone}`
      )
      if (!res.ok) return
      const data = await res.json()
      const serverTime = new Date(data.datetime).getTime()
      const localTime = Date.now()
      offsetRef.current = serverTime - localTime
      setReady(true)
    } catch {
      // Fallback: compute offset using Intl (no network needed)
      try {
        const now = new Date()
        const tzString = now.toLocaleString('en-US', { timeZone: timezone })
        const tzTime = new Date(tzString).getTime()
        const localString = now.toLocaleString('en-US')
        const localTime = new Date(localString).getTime()
        offsetRef.current = tzTime - localTime
        setReady(true)
      } catch {
        // Give up, use system time
        offsetRef.current = 0
        setReady(true)
      }
    }
  }, [timezone])

  useEffect(() => {
    sync()
    const interval = setInterval(sync, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [sync])

  const getNow = useCallback(() => {
    return new Date(Date.now() + offsetRef.current)
  }, [])

  return { getNow, ready }
}
