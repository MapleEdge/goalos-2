export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  location?: string;
  color?: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
}

export interface CalendarConnector {
  getAuthUrl(redirectUri: string, state?: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenResult>;
  refreshAccessToken(refreshToken: string): Promise<TokenResult>;
  listCalendars(accessToken: string): Promise<CalendarListEntry[]>;
  listEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarEvent[]>;
  createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<CalendarEvent>;
  updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent>;
  deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void>;
}

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}
