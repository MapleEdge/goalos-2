import type {
  CalendarConnector,
  CalendarEvent,
  CalendarListEntry,
  TokenResult,
} from './types'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables'
    )
  }
  return { clientId, clientSecret }
}

export const googleCalendar: CalendarConnector = {
  getAuthUrl(redirectUri: string, state?: string): string {
    const { clientId } = getCredentials()
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
    })
    if (state) params.set('state', state)
    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  },

  async exchangeCode(code: string, redirectUri: string): Promise<TokenResult> {
    const { clientId, clientSecret } = getCredentials()
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const data = await res.json()
    if (!res.ok)
      throw new Error(data.error_description || 'Token exchange failed')
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  },

  async refreshAccessToken(refreshToken: string): Promise<TokenResult> {
    const { clientId, clientSecret } = getCredentials()
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    if (!res.ok)
      throw new Error(data.error_description || 'Token refresh failed')
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  },

  async listCalendars(accessToken: string): Promise<CalendarListEntry[]> {
    const res = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()
    if (!res.ok)
      throw new Error(data.error?.message || 'Failed to list calendars')
    return (data.items || []).map(
      (cal: { id: string; summary: string; primary?: boolean }) => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary || false,
      })
    )
  },

  async listEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    })
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Failed to list events')
    return (data.items || []).map(
      (ev: {
        id: string
        summary?: string
        description?: string
        location?: string
        start?: { dateTime?: string; date?: string }
        end?: { dateTime?: string; date?: string }
      }) => ({
        id: ev.id,
        title: ev.summary || '(No title)',
        description: ev.description,
        location: ev.location,
        startTime: new Date(ev.start?.dateTime || ev.start?.date || ''),
        endTime: new Date(ev.end?.dateTime || ev.end?.date || ''),
        allDay: !ev.start?.dateTime,
      })
    )
  },

  async createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<CalendarEvent> {
    const body = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.allDay
        ? { date: event.startTime.toISOString().split('T')[0] }
        : { dateTime: event.startTime.toISOString() },
      end: event.allDay
        ? { date: event.endTime.toISOString().split('T')[0] }
        : { dateTime: event.endTime.toISOString() },
    }
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    const data = await res.json()
    if (!res.ok)
      throw new Error(data.error?.message || 'Failed to create event')
    return {
      id: data.id,
      title: data.summary,
      description: data.description,
      startTime: new Date(data.start?.dateTime || data.start?.date),
      endTime: new Date(data.end?.dateTime || data.end?.date),
      allDay: !data.start?.dateTime,
    }
  },

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const body: Record<string, unknown> = {}
    if (event.title !== undefined) body.summary = event.title
    if (event.description !== undefined) body.description = event.description
    if (event.location !== undefined) body.location = event.location
    if (event.startTime) {
      body.start = event.allDay
        ? { date: event.startTime.toISOString().split('T')[0] }
        : { dateTime: event.startTime.toISOString() }
    }
    if (event.endTime) {
      body.end = event.allDay
        ? { date: event.endTime.toISOString().split('T')[0] }
        : { dateTime: event.endTime.toISOString() }
    }
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    const data = await res.json()
    if (!res.ok)
      throw new Error(data.error?.message || 'Failed to update event')
    return {
      id: data.id,
      title: data.summary,
      description: data.description,
      startTime: new Date(data.start?.dateTime || data.start?.date),
      endTime: new Date(data.end?.dateTime || data.end?.date),
      allDay: !data.start?.dateTime,
    }
  },

  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
    if (!res.ok && res.status !== 404) {
      throw new Error('Failed to delete event')
    }
  },
}
