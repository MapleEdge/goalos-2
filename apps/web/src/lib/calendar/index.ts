import { googleCalendar } from './google'
import { microsoftCalendar } from './microsoft'
import type { CalendarConnector } from './types'

export type {
  CalendarConnector,
  CalendarEvent,
  CalendarListEntry,
  TokenResult,
} from './types'

export function getConnector(
  provider: 'GOOGLE' | 'MICROSOFT'
): CalendarConnector {
  switch (provider) {
    case 'GOOGLE':
      return googleCalendar
    case 'MICROSOFT':
      return microsoftCalendar
  }
}

export function getRedirectUri(provider: 'GOOGLE' | 'MICROSOFT'): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base}/api/calendar/callback/${provider.toLowerCase()}`
}
