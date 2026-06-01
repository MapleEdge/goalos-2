'use client'

import { useState } from 'react'

interface CalendarConnection {
  id: string
  provider: 'GOOGLE' | 'MICROSOFT'
  accountEmail: string
  syncEnabled: boolean
  lastSyncAt: string | null
}

interface CalendarSettingsProps {
  connections: CalendarConnection[]
  onRefresh: () => void
  onClose: () => void
}

export function CalendarSettings({
  connections,
  onRefresh,
  onClose,
}: CalendarSettingsProps) {
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)

  async function connectCalendar(provider: 'google' | 'microsoft') {
    setConnecting(provider)
    try {
      const res = await fetch(`/api/calendar/auth?provider=${provider}`)
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        alert(
          data.error ||
            'Failed to get auth URL. Check that OAuth credentials are configured.'
        )
        setConnecting(null)
      }
    } catch {
      alert(
        'Failed to initiate connection. Ensure GOOGLE_CLIENT_ID/SECRET or MICROSOFT_CLIENT_ID/SECRET environment variables are set.'
      )
      setConnecting(null)
    }
  }

  async function syncCalendar(connectionId: string) {
    setSyncing(connectionId)
    try {
      const res = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Sync failed: ${data.error}`)
      }
    } catch {
      alert('Sync request failed')
    }
    setSyncing(null)
    onRefresh()
  }

  async function disconnectCalendar(connectionId: string) {
    if (!confirm('Disconnect this calendar? Synced events will be removed.'))
      return
    await fetch(`/api/calendar/connections?id=${connectionId}`, {
      method: 'DELETE',
    })
    onRefresh()
  }

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          Calendar Connections
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {/* Existing connections */}
      {connections.length > 0 && (
        <div className="space-y-2 mb-4">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${
                    conn.provider === 'GOOGLE' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                >
                  {conn.provider === 'GOOGLE' ? 'G' : 'M'}
                </span>
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    {conn.accountEmail}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {conn.provider === 'GOOGLE'
                      ? 'Google Calendar'
                      : 'Microsoft Outlook'}
                    {conn.lastSyncAt && (
                      <>
                        {' '}
                        &middot; Last synced {formatRelative(conn.lastSyncAt)}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => syncCalendar(conn.id)}
                  disabled={syncing === conn.id}
                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
                >
                  {syncing === conn.id ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={() => disconnectCalendar(conn.id)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => connectCalendar('google')}
          disabled={connecting === 'google'}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path
              d="M8 1a7 7 0 100 14A7 7 0 008 1z"
              fill="none"
              stroke="#4285f4"
              strokeWidth="1.5"
            />
            <text
              x="4.5"
              y="11.5"
              fontSize="9"
              fontWeight="bold"
              fill="#4285f4"
            >
              G
            </text>
          </svg>
          {connecting === 'google'
            ? 'Connecting...'
            : 'Connect Google Calendar'}
        </button>
        <button
          onClick={() => connectCalendar('microsoft')}
          disabled={connecting === 'microsoft'}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect x="1" y="1" width="6" height="6" fill="#f25022" />
            <rect x="9" y="1" width="6" height="6" fill="#7fba00" />
            <rect x="1" y="9" width="6" height="6" fill="#00a4ef" />
            <rect x="9" y="9" width="6" height="6" fill="#ffb900" />
          </svg>
          {connecting === 'microsoft'
            ? 'Connecting...'
            : 'Connect Microsoft Outlook'}
        </button>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        OAuth credentials required. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
        or MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET in your environment.
      </p>
    </div>
  )
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}
