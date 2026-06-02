'use client'

import { useCallback, useEffect, useState } from 'react'

const TIMEZONE_KEY = 'goalos-timezone'

function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export function useTimezone() {
  const [timezone, setTimezoneRaw] = useState(getDefaultTimezone)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TIMEZONE_KEY)
      if (stored) setTimezoneRaw(stored)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const setTimezone = useCallback((tz: string) => {
    setTimezoneRaw(tz)
    try {
      localStorage.setItem(TIMEZONE_KEY, tz)
    } catch {
      // localStorage unavailable
    }
  }, [])

  return { timezone, setTimezone }
}
