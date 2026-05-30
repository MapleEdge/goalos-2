import type {
  CalendarConnector,
  CalendarEvent,
  CalendarListEntry,
  TokenResult,
} from "./types";

const MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_API = "https://graph.microsoft.com/v1.0";

function getCredentials() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET environment variables"
    );
  }
  return { clientId, clientSecret };
}

export const microsoftCalendar: CalendarConnector = {
  getAuthUrl(redirectUri: string, state?: string): string {
    const { clientId } = getCredentials();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "openid",
        "email",
        "offline_access",
        "Calendars.ReadWrite",
      ].join(" "),
      response_mode: "query",
    });
    if (state) params.set("state", state);
    return `${MS_AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<TokenResult> {
    const { clientId, clientSecret } = getCredentials();
    const res = await fetch(MS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error_description || "Token exchange failed");
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<TokenResult> {
    const { clientId, clientSecret } = getCredentials();
    const res = await fetch(MS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        scope: "openid email offline_access Calendars.ReadWrite",
      }),
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error_description || "Token refresh failed");
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async listCalendars(accessToken: string): Promise<CalendarListEntry[]> {
    const res = await fetch(`${GRAPH_API}/me/calendars`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error?.message || "Failed to list calendars");
    return (data.value || []).map(
      (cal: { id: string; name: string; isDefaultCalendar?: boolean }) => ({
        id: cal.id,
        summary: cal.name,
        primary: cal.isDefaultCalendar || false,
      })
    );
  },

  async listEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      startDateTime: timeMin.toISOString(),
      endDateTime: timeMax.toISOString(),
      $top: "250",
      $orderby: "start/dateTime",
      $select: "id,subject,bodyPreview,location,start,end,isAllDay",
    });
    const res = await fetch(
      `${GRAPH_API}/me/calendars/${calendarId}/calendarView?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error?.message || "Failed to list events");
    return (data.value || []).map(
      (ev: {
        id: string;
        subject?: string;
        bodyPreview?: string;
        isAllDay?: boolean;
        location?: { displayName?: string };
        start?: { dateTime?: string; timeZone?: string };
        end?: { dateTime?: string; timeZone?: string };
      }) => ({
        id: ev.id,
        title: ev.subject || "(No title)",
        description: ev.bodyPreview,
        location: ev.location?.displayName,
        startTime: new Date(ev.start?.dateTime ? ev.start.dateTime + "Z" : ""),
        endTime: new Date(ev.end?.dateTime ? ev.end.dateTime + "Z" : ""),
        allDay: ev.isAllDay || false,
      })
    );
  },

  async createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<CalendarEvent> {
    const body = {
      subject: event.title,
      body: event.description
        ? { contentType: "text", content: event.description }
        : undefined,
      location: event.location
        ? { displayName: event.location }
        : undefined,
      start: {
        dateTime: event.startTime.toISOString().replace("Z", ""),
        timeZone: "UTC",
      },
      end: {
        dateTime: event.endTime.toISOString().replace("Z", ""),
        timeZone: "UTC",
      },
      isAllDay: event.allDay || false,
    };
    const res = await fetch(
      `${GRAPH_API}/me/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error?.message || "Failed to create event");
    return {
      id: data.id,
      title: data.subject,
      description: data.bodyPreview,
      startTime: new Date(data.start?.dateTime + "Z"),
      endTime: new Date(data.end?.dateTime + "Z"),
      allDay: data.isAllDay || false,
    };
  },

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const body: Record<string, unknown> = {};
    if (event.title !== undefined) body.subject = event.title;
    if (event.description !== undefined)
      body.body = { contentType: "text", content: event.description };
    if (event.location !== undefined)
      body.location = { displayName: event.location };
    if (event.startTime) {
      body.start = {
        dateTime: event.startTime.toISOString().replace("Z", ""),
        timeZone: "UTC",
      };
    }
    if (event.endTime) {
      body.end = {
        dateTime: event.endTime.toISOString().replace("Z", ""),
        timeZone: "UTC",
      };
    }
    if (event.allDay !== undefined) body.isAllDay = event.allDay;
    const res = await fetch(
      `${GRAPH_API}/me/calendars/${calendarId}/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error?.message || "Failed to update event");
    return {
      id: data.id,
      title: data.subject,
      description: data.bodyPreview,
      startTime: new Date(data.start?.dateTime + "Z"),
      endTime: new Date(data.end?.dateTime + "Z"),
      allDay: data.isAllDay || false,
    };
  },

  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const res = await fetch(
      `${GRAPH_API}/me/calendars/${calendarId}/events/${eventId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok && res.status !== 404) {
      throw new Error("Failed to delete event");
    }
  },
};
