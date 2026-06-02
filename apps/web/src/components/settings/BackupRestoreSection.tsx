'use client'

import { type AccountInfo, PublicClientApplication } from '@azure/msal-browser'
import { useCallback, useEffect, useRef, useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface StatusState {
  status: Status
  message: string
}

// ── Env-var driven client IDs ───────────────────────────────────
const MS_CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID ?? ''
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? ''

// ── Helpers ─────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ── Google Identity Services helpers ────────────────────────────

let gapiInited = false

function ensureGapiScript(): Promise<void> {
  if (gapiInited) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (document.getElementById('gapi-script')) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.id = 'gapi-script'
    s.src = 'https://apis.google.com/js/api.js'
    s.onload = () => {
      window.gapi.load('client:picker', async () => {
        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
          ],
        })
        gapiInited = true
        resolve()
      })
    }
    s.onerror = reject
    document.head.appendChild(s)
  })
}

let gisInited = false

function ensureGisScript(): Promise<void> {
  if (gisInited) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (document.getElementById('gis-script')) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.id = 'gis-script'
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => {
      gisInited = true
      resolve()
    }
    s.onerror = reject
    document.head.appendChild(s)
  })
}

interface GoogleUser {
  email: string
  name: string
  accessToken: string
}

function signInWithGoogle(): Promise<GoogleUser> {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope:
        'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      callback: async (resp) => {
        if (resp.error) {
          reject(new Error(resp.error))
          return
        }
        try {
          const info = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${resp.access_token}` } }
          )
          const profile = (await info.json()) as {
            email: string
            name: string
          }
          resolve({
            email: profile.email,
            name: profile.name,
            accessToken: resp.access_token,
          })
        } catch {
          resolve({
            email: 'Google user',
            name: 'Google user',
            accessToken: resp.access_token,
          })
        }
      },
    })
    client.requestAccessToken()
  })
}

async function uploadToGoogleDrive(
  token: string,
  json: string,
  filename: string
): Promise<string> {
  const form = new FormData()
  form.append(
    'metadata',
    new Blob(
      [JSON.stringify({ name: filename, mimeType: 'application/json' })],
      { type: 'application/json' }
    )
  )
  form.append('file', new Blob([json], { type: 'application/json' }))
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  )
  if (!res.ok) throw new Error(`Google Drive upload failed: ${res.statusText}`)
  const data = (await res.json()) as { id: string }
  return data.id
}

async function pickFromGoogleDrive(token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const picker = new google.picker.PickerBuilder()
      .addView(new google.picker.DocsView().setMimeTypes('application/json'))
      .setOAuthToken(token)
      .setCallback(async (data: google.picker.ResponseObject) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0]
          if (!doc) {
            reject(new Error('No file selected'))
            return
          }
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (!res.ok) {
            reject(new Error('Failed to download from Google Drive'))
            return
          }
          resolve(await res.text())
        } else if (data.action === google.picker.Action.CANCEL) {
          reject(new Error('Picker cancelled'))
        }
      })
      .build()
    picker.setVisible(true)
  })
}

// ── Microsoft (MSAL.js) helpers ─────────────────────────────────

interface MsUser {
  email: string
  name: string
  account: AccountInfo
}

let msalInstance: PublicClientApplication | null = null

function getMsalInstance(): PublicClientApplication {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication({
      auth: {
        clientId: MS_CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri:
          typeof window !== 'undefined' ? window.location.origin : '/',
      },
      cache: { cacheLocation: 'sessionStorage' },
    })
  }
  return msalInstance
}

const MS_SCOPES = ['User.Read', 'Files.ReadWrite']

async function signInWithMicrosoft(): Promise<void> {
  const msal = getMsalInstance()
  await msal.initialize()
  await msal.loginRedirect({ scopes: MS_SCOPES })
}

async function getMsToken(account: AccountInfo): Promise<string> {
  const msal = getMsalInstance()
  try {
    const result = await msal.acquireTokenSilent({
      scopes: MS_SCOPES,
      account,
    })
    return result.accessToken
  } catch {
    await msal.acquireTokenRedirect({
      scopes: MS_SCOPES,
      account,
    })
    throw new Error('Redirecting for token...')
  }
}

async function uploadToOneDrive(
  account: AccountInfo,
  json: string,
  filename: string
): Promise<void> {
  const token = await getMsToken(account)
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/GoalOS Backups/${filename}:/content`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: json,
    }
  )
  if (!res.ok) throw new Error(`OneDrive upload failed: ${res.statusText}`)
}

interface DriveItem {
  id: string
  name: string
  '@microsoft.graph.downloadUrl': string
}

async function listOneDriveBackups(account: AccountInfo): Promise<DriveItem[]> {
  const token = await getMsToken(account)
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/drive/root:/GoalOS Backups:/children?$filter=endsWith(name,'.json')&$orderby=lastModifiedDateTime desc&$top=20",
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    if (res.status === 404) return []
    throw new Error(`OneDrive list failed: ${res.statusText}`)
  }
  const data = (await res.json()) as { value: DriveItem[] }
  return data.value
}

async function downloadFromOneDrive(item: DriveItem): Promise<string> {
  const url = item['@microsoft.graph.downloadUrl']
  if (!url) throw new Error('No download URL for file')
  const res = await fetch(url)
  return await res.text()
}

// ── Component ───────────────────────────────────────────────────

export function BackupRestoreSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportStatus, setExportStatus] = useState<StatusState>({
    status: 'idle',
    message: '',
  })
  const [importStatus, setImportStatus] = useState<StatusState>({
    status: 'idle',
    message: '',
  })
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [confirmReplace, setConfirmReplace] = useState(false)

  // ── Auth state ────────────────────────────────────────────────
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null)
  const [msUser, setMsUser] = useState<MsUser | null>(null)
  const [authLoading, setAuthLoading] = useState<'google' | 'microsoft' | null>(
    null
  )
  const [authError, setAuthError] = useState('')

  // OneDrive file picker state
  const [oneDriveFiles, setOneDriveFiles] = useState<DriveItem[]>([])
  const [showOneDrivePicker, setShowOneDrivePicker] = useState(false)

  const hasGoogleConfig = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY)
  const hasMsConfig = Boolean(MS_CLIENT_ID)

  // Handle MSAL redirect response + restore existing session on mount
  useEffect(() => {
    if (!hasMsConfig) return
    const msal = getMsalInstance()
    msal.initialize().then(async () => {
      const response = await msal.handleRedirectPromise()
      if (response?.account) {
        setMsUser({
          email: response.account.username,
          name: response.account.name ?? response.account.username,
          account: response.account,
        })
        return
      }
      const accounts = msal.getAllAccounts()
      if (accounts[0]) {
        setMsUser({
          email: accounts[0].username,
          name: accounts[0].name ?? accounts[0].username,
          account: accounts[0],
        })
      }
    })
  }, [hasMsConfig])

  // ── Sign in / sign out ────────────────────────────────────────

  const handleGoogleSignIn = useCallback(async () => {
    setAuthLoading('google')
    setAuthError('')
    try {
      await ensureGapiScript()
      await ensureGisScript()
      const user = await signInWithGoogle()
      setGoogleUser(user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed'
      if (!msg.includes('popup_closed')) setAuthError(msg)
    } finally {
      setAuthLoading(null)
    }
  }, [])

  const handleMsSignIn = useCallback(async () => {
    setAuthLoading('microsoft')
    setAuthError('')
    try {
      await signInWithMicrosoft()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Microsoft sign-in failed'
      if (!msg.includes('user_cancelled')) setAuthError(msg)
      setAuthLoading(null)
    }
  }, [])

  const handleGoogleSignOut = useCallback(() => {
    setGoogleUser(null)
    google.accounts.oauth2.revoke(googleUser?.accessToken ?? '', () => {})
  }, [googleUser])

  const handleMsSignOut = useCallback(async () => {
    const account = msUser?.account
    setMsUser(null)
    setOneDriveFiles([])
    setShowOneDrivePicker(false)
    if (account) {
      const msal = getMsalInstance()
      try {
        await msal.logoutRedirect({ account })
      } catch {
        // Silent logout failure is OK
      }
    }
  }, [msUser])

  // ── Export ────────────────────────────────────────────────────

  const doExport = useCallback(async () => {
    setExportStatus({ status: 'loading', message: 'Exporting data...' })
    try {
      const res = await fetch('/api/backup/export')
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`)
      return await res.text()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      setExportStatus({ status: 'error', message: msg })
      return null
    }
  }, [])

  const exportToFile = useCallback(async () => {
    const json = await doExport()
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    downloadBlob(blob, `goalos-backup-${ts()}.json`)
    setExportStatus({ status: 'success', message: 'Backup downloaded!' })
  }, [doExport])

  const exportToGoogleDrive = useCallback(async () => {
    if (!googleUser) return
    const json = await doExport()
    if (!json) return
    setExportStatus({
      status: 'loading',
      message: 'Uploading to Google Drive...',
    })
    try {
      await uploadToGoogleDrive(
        googleUser.accessToken,
        json,
        `goalos-backup-${ts()}.json`
      )
      setExportStatus({
        status: 'success',
        message: 'Saved to Google Drive!',
      })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google Drive upload failed'
      setExportStatus({ status: 'error', message: msg })
    }
  }, [doExport, googleUser])

  const exportToOneDrive = useCallback(async () => {
    if (!msUser) return
    const json = await doExport()
    if (!json) return
    setExportStatus({
      status: 'loading',
      message: 'Uploading to OneDrive...',
    })
    try {
      await uploadToOneDrive(msUser.account, json, `goalos-backup-${ts()}.json`)
      setExportStatus({
        status: 'success',
        message: 'Saved to OneDrive (GoalOS Backups folder)!',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OneDrive upload failed'
      setExportStatus({ status: 'error', message: msg })
    }
  }, [doExport, msUser])

  // ── Import ────────────────────────────────────────────────────

  const doImport = useCallback(
    async (json: string) => {
      setImportStatus({ status: 'loading', message: 'Importing data...' })
      try {
        const parsed = JSON.parse(json)
        if (!parsed.version || !parsed.data) {
          throw new Error('Invalid backup file format')
        }
        const res = await fetch(`/api/backup/import?mode=${importMode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => null)
          throw new Error(
            errBody?.error?.message ?? `Import failed: ${res.statusText}`
          )
        }
        const result = await res.json()
        const total = Object.values(
          result.counts as Record<string, number>
        ).reduce((a, b) => a + b, 0)
        setImportStatus({
          status: 'success',
          message: `Imported ${total} records (${importMode} mode)`,
        })
        setConfirmReplace(false)
        setShowOneDrivePicker(false)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Import failed'
        setImportStatus({ status: 'error', message: msg })
      }
    },
    [importMode]
  )

  const importFromFile = useCallback(() => {
    if (importMode === 'replace' && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    fileInputRef.current?.click()
  }, [importMode, confirmReplace])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const json = await file.text()
      await doImport(json)
      e.target.value = ''
    },
    [doImport]
  )

  const importFromGoogleDrive = useCallback(async () => {
    if (!googleUser) return
    if (importMode === 'replace' && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setImportStatus({
      status: 'loading',
      message: 'Picking file from Google Drive...',
    })
    try {
      const json = await pickFromGoogleDrive(googleUser.accessToken)
      await doImport(json)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google Drive import failed'
      if (msg.includes('cancelled')) {
        setImportStatus({ status: 'idle', message: '' })
      } else {
        setImportStatus({ status: 'error', message: msg })
      }
    }
  }, [doImport, googleUser, importMode, confirmReplace])

  const openOneDrivePicker = useCallback(async () => {
    if (!msUser) return
    if (importMode === 'replace' && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setImportStatus({
      status: 'loading',
      message: 'Loading OneDrive backups...',
    })
    try {
      const files = await listOneDriveBackups(msUser.account)
      setOneDriveFiles(files)
      setShowOneDrivePicker(true)
      if (files.length === 0) {
        setImportStatus({
          status: 'idle',
          message: 'No backup files found in GoalOS Backups folder',
        })
      } else {
        setImportStatus({ status: 'idle', message: '' })
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to list OneDrive files'
      setImportStatus({ status: 'error', message: msg })
    }
  }, [msUser, importMode, confirmReplace])

  const importFromOneDriveFile = useCallback(
    async (item: DriveItem) => {
      setImportStatus({
        status: 'loading',
        message: `Downloading ${item.name}...`,
      })
      try {
        const json = await downloadFromOneDrive(item)
        await doImport(json)
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'OneDrive import failed'
        setImportStatus({ status: 'error', message: msg })
      }
    },
    [doImport]
  )

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
        Backup &amp; Restore
      </h2>
      <p className="text-xs text-zinc-500 mb-5">
        Export your goals, vehicles, stakeholders, and all related data as a
        snapshot. Restore from a previous backup file or from cloud storage.
      </p>

      {/* ── Connected Accounts ────────────────────── */}
      {(hasGoogleConfig || hasMsConfig) && (
        <div className="mb-6 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <h3 className="text-xs font-semibold text-zinc-600 mb-3">
            Cloud Accounts
          </h3>
          <div className="space-y-2">
            {/* Google */}
            {hasGoogleConfig && (
              <div className="flex items-center justify-between">
                {googleUser ? (
                  <>
                    <div className="flex items-center gap-2">
                      <GoogleDriveIcon />
                      <span className="text-xs text-zinc-700">
                        {googleUser.email}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Connected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleSignOut}
                      className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={authLoading === 'google'}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                  >
                    {authLoading === 'google' ? (
                      <LoadingSpinner />
                    ) : (
                      <GoogleIcon />
                    )}
                    Sign in with Google
                  </button>
                )}
              </div>
            )}

            {/* Microsoft */}
            {hasMsConfig && (
              <div className="flex items-center justify-between">
                {msUser ? (
                  <>
                    <div className="flex items-center gap-2">
                      <MicrosoftIcon />
                      <span className="text-xs text-zinc-700">
                        {msUser.email}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Connected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleMsSignOut}
                      className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleMsSignIn}
                    disabled={authLoading === 'microsoft'}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                  >
                    {authLoading === 'microsoft' ? (
                      <LoadingSpinner />
                    ) : (
                      <MicrosoftIcon />
                    )}
                    Sign in with Microsoft
                  </button>
                )}
              </div>
            )}
          </div>
          {authError && (
            <p className="mt-2 text-xs text-red-600">{authError}</p>
          )}
        </div>
      )}

      {/* ── Export ────────────────────────────────── */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-zinc-600 mb-2">Export</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportToFile}
            disabled={exportStatus.status === 'loading'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <DownloadIcon />
            Download JSON
          </button>
          {googleUser && (
            <button
              type="button"
              onClick={exportToGoogleDrive}
              disabled={exportStatus.status === 'loading'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <GoogleDriveIcon />
              Google Drive
            </button>
          )}
          {msUser && (
            <button
              type="button"
              onClick={exportToOneDrive}
              disabled={exportStatus.status === 'loading'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <OneDriveIcon />
              OneDrive
            </button>
          )}
        </div>
        <StatusMessage state={exportStatus} />
      </div>

      {/* ── Import ────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-600 mb-2">Import</h3>

        {/* Mode selector */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-zinc-500">Mode:</span>
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5">
            <button
              type="button"
              onClick={() => {
                setImportMode('merge')
                setConfirmReplace(false)
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                importMode === 'merge'
                  ? 'bg-white text-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              Merge
            </button>
            <button
              type="button"
              onClick={() => {
                setImportMode('replace')
                setConfirmReplace(false)
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                importMode === 'replace'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              Replace
            </button>
          </div>
          <span className="text-xs text-zinc-400">
            {importMode === 'merge'
              ? 'Adds new records, updates existing ones'
              : 'Wipes all data, then restores from backup'}
          </span>
        </div>

        {/* Replace-mode confirmation */}
        {importMode === 'replace' && confirmReplace && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium text-red-700 mb-2">
              This will permanently delete all existing data and replace it with
              the backup. Continue?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                Yes, replace all data
              </button>
              <button
                type="button"
                onClick={() => setConfirmReplace(false)}
                className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={importFromFile}
            disabled={importStatus.status === 'loading'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <UploadIcon />
            Upload JSON
          </button>
          {googleUser && (
            <button
              type="button"
              onClick={importFromGoogleDrive}
              disabled={importStatus.status === 'loading'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <GoogleDriveIcon />
              Google Drive
            </button>
          )}
          {msUser && (
            <button
              type="button"
              onClick={openOneDrivePicker}
              disabled={importStatus.status === 'loading'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <OneDriveIcon />
              OneDrive
            </button>
          )}
        </div>

        {/* OneDrive file list */}
        {showOneDrivePicker && oneDriveFiles.length > 0 && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-600">
                GoalOS Backups on OneDrive
              </span>
              <button
                type="button"
                onClick={() => setShowOneDrivePicker(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Close
              </button>
            </div>
            <ul className="space-y-1">
              {oneDriveFiles.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => importFromOneDriveFile(file)}
                    disabled={importStatus.status === 'loading'}
                    className="w-full text-left rounded-md px-2 py-1.5 text-xs text-zinc-600 hover:bg-white hover:shadow-sm transition-all disabled:opacity-50"
                  >
                    {file.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <StatusMessage state={importStatus} />
      </div>

      {!hasGoogleConfig && !hasMsConfig && (
        <p className="mt-4 text-xs text-zinc-400">
          To enable cloud storage sign-in, set{' '}
          <code className="bg-zinc-100 px-1 rounded">
            NEXT_PUBLIC_GOOGLE_CLIENT_ID
          </code>
          ,{' '}
          <code className="bg-zinc-100 px-1 rounded">
            NEXT_PUBLIC_GOOGLE_API_KEY
          </code>
          , and/or{' '}
          <code className="bg-zinc-100 px-1 rounded">
            NEXT_PUBLIC_MICROSOFT_CLIENT_ID
          </code>{' '}
          in your environment.
        </p>
      )}
    </section>
  )
}

// ── Status badge ────────────────────────────────────────────────

function StatusMessage({ state }: { state: StatusState }) {
  if (state.status === 'idle' && !state.message) return null
  const colors: Record<Status, string> = {
    idle: 'text-zinc-500',
    loading: 'text-blue-600',
    success: 'text-emerald-600',
    error: 'text-red-600',
  }
  return (
    <p className={`mt-2 text-xs font-medium ${colors[state.status]}`}>
      {state.status === 'loading' && <LoadingSpinner />}
      {state.message}
    </p>
  )
}

// ── Icons ───────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <svg
      className="inline mr-1 h-3 w-3 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function GoogleDriveIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.71 3.5L1.15 15l3.43 5.95L11.14 9.45zm1.14 0l6.57 11.36H23l-6.57-11.36zm7.71 12.86H8.28l-3.43 5.95h8.28z" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 23 23">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  )
}

function OneDriveIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.5 18.5H19c1.93 0 3.5-1.57 3.5-3.5 0-1.58-1.06-2.91-2.5-3.34C19.96 8.52 17.59 6 14.63 6c-2.1 0-3.92 1.21-4.83 2.96C8.44 8.35 7 7.5 5.38 7.5 3.01 7.5 1.08 9.44 1 11.8c-1.35.74-2 2.28-1.5 3.82.37 1.14 1.37 1.94 2.55 2.1.14.02.29.03.45.03z" />
    </svg>
  )
}
