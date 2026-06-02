'use client'

import { useCallback, useRef, useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface StatusState {
  status: Status
  message: string
}

// ── OneDrive Picker (via Microsoft's v8 picker SDK) ────────────
const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? ''

/** Trigger a browser download of a Blob. */
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

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ── Google Drive helpers ────────────────────────────────────────

let gisTokenClient: google.accounts.oauth2.TokenClient | null = null
let gapiInited = false
let gisInited = false

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

function getGoogleAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!gisTokenClient) {
      gisTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (resp) => {
          if (resp.error) {
            reject(new Error(resp.error))
          } else {
            resolve(resp.access_token)
          }
        },
      })
    }
    gisTokenClient.requestAccessToken()
  })
}

async function uploadToGoogleDrive(
  json: string,
  filename: string
): Promise<string> {
  await ensureGapiScript()
  await ensureGisScript()
  const token = await getGoogleAccessToken()

  const metadata = {
    name: filename,
    mimeType: 'application/json',
  }

  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
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
  const data = await res.json()
  return data.id
}

async function pickFromGoogleDrive(): Promise<string> {
  await ensureGapiScript()
  await ensureGisScript()
  const token = await getGoogleAccessToken()

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
          const fileId = doc.id
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
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

// ── OneDrive helpers ────────────────────────────────────────────

function ensureOneDriveScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as Record<string, unknown>).OneDrive) {
      resolve()
      return
    }
    if (document.getElementById('onedrive-script')) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.id = 'onedrive-script'
    s.src = 'https://js.live.net/v7.2/OneDrive.js'
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

interface OneDriveFile {
  '@microsoft.graph.downloadUrl'?: string
  name: string
}

interface OneDrivePickerResult {
  value: OneDriveFile[]
}

interface OneDriveSDK {
  open(options: Record<string, unknown>): void
  save(options: Record<string, unknown>): void
}

async function uploadToOneDrive(json: string, filename: string): Promise<void> {
  await ensureOneDriveScript()
  const sdk = (window as unknown as { OneDrive: OneDriveSDK }).OneDrive

  return new Promise((resolve, reject) => {
    // OneDrive JS SDK save-picker: opens a UI for the user to choose a folder
    const blob = new Blob([json], { type: 'application/json' })
    const file = new File([blob], filename, { type: 'application/json' })

    sdk.save({
      clientId: ONEDRIVE_CLIENT_ID,
      action: 'save',
      sourceInputElementId: '', // not used when providing file
      file,
      fileName: filename,
      openInNewWindow: true,
      success: () => resolve(),
      cancel: () => reject(new Error('OneDrive save cancelled')),
      error: (err: Error) => reject(err),
    })
  })
}

async function pickFromOneDrive(): Promise<string> {
  await ensureOneDriveScript()
  const sdk = (window as unknown as { OneDrive: OneDriveSDK }).OneDrive

  return new Promise((resolve, reject) => {
    sdk.open({
      clientId: ONEDRIVE_CLIENT_ID,
      action: 'download',
      multiSelect: false,
      advanced: {
        filter: '.json',
      },
      success: async (result: OneDrivePickerResult) => {
        const file = result.value?.[0]
        const url = file?.['@microsoft.graph.downloadUrl']
        if (!url) {
          reject(new Error('No download URL returned'))
          return
        }
        const res = await fetch(url)
        resolve(await res.text())
      },
      cancel: () => reject(new Error('OneDrive picker cancelled')),
      error: (err: Error) => reject(err),
    })
  })
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

  const hasGoogleConfig = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY)
  const hasOneDriveConfig = Boolean(ONEDRIVE_CLIENT_ID)

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
    downloadBlob(blob, `goalos-backup-${timestamp()}.json`)
    setExportStatus({ status: 'success', message: 'Backup downloaded!' })
  }, [doExport])

  const exportToGoogleDrive = useCallback(async () => {
    const json = await doExport()
    if (!json) return
    setExportStatus({
      status: 'loading',
      message: 'Uploading to Google Drive...',
    })
    try {
      await uploadToGoogleDrive(json, `goalos-backup-${timestamp()}.json`)
      setExportStatus({ status: 'success', message: 'Saved to Google Drive!' })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google Drive upload failed'
      setExportStatus({ status: 'error', message: msg })
    }
  }, [doExport])

  const exportToOneDrive = useCallback(async () => {
    const json = await doExport()
    if (!json) return
    setExportStatus({ status: 'loading', message: 'Uploading to OneDrive...' })
    try {
      await uploadToOneDrive(json, `goalos-backup-${timestamp()}.json`)
      setExportStatus({ status: 'success', message: 'Saved to OneDrive!' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OneDrive upload failed'
      setExportStatus({ status: 'error', message: msg })
    }
  }, [doExport])

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
          const err = await res.json().catch(() => null)
          throw new Error(
            err?.error?.message ?? `Import failed: ${res.statusText}`
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
      // Reset input so the same file can be re-selected
      e.target.value = ''
    },
    [doImport]
  )

  const importFromGoogleDrive = useCallback(async () => {
    if (importMode === 'replace' && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setImportStatus({
      status: 'loading',
      message: 'Picking file from Google Drive...',
    })
    try {
      const json = await pickFromGoogleDrive()
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
  }, [doImport, importMode, confirmReplace])

  const importFromOneDrive = useCallback(async () => {
    if (importMode === 'replace' && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setImportStatus({
      status: 'loading',
      message: 'Picking file from OneDrive...',
    })
    try {
      const json = await pickFromOneDrive()
      await doImport(json)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OneDrive import failed'
      if (msg.includes('cancelled')) {
        setImportStatus({ status: 'idle', message: '' })
      } else {
        setImportStatus({ status: 'error', message: msg })
      }
    }
  }, [doImport, importMode, confirmReplace])

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
        Backup &amp; Restore
      </h2>
      <p className="text-xs text-zinc-500 mb-5">
        Export your goals, vehicles, stakeholders, and all related data as a
        snapshot. Restore from a previous backup file or from cloud storage.
      </p>

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
          {hasGoogleConfig && (
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
          {hasOneDriveConfig && (
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
          {hasGoogleConfig && (
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
          {hasOneDriveConfig && (
            <button
              type="button"
              onClick={importFromOneDrive}
              disabled={importStatus.status === 'loading'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <OneDriveIcon />
              OneDrive
            </button>
          )}
        </div>
        <StatusMessage state={importStatus} />
      </div>

      {!hasGoogleConfig && !hasOneDriveConfig && (
        <p className="mt-4 text-xs text-zinc-400">
          To enable cloud storage, set{' '}
          <code className="bg-zinc-100 px-1 rounded">
            NEXT_PUBLIC_GOOGLE_CLIENT_ID
          </code>
          ,{' '}
          <code className="bg-zinc-100 px-1 rounded">
            NEXT_PUBLIC_GOOGLE_API_KEY
          </code>
          , and/or{' '}
          <code className="bg-zinc-100 px-1 rounded">
            NEXT_PUBLIC_ONEDRIVE_CLIENT_ID
          </code>{' '}
          in your environment.
        </p>
      )}
    </section>
  )
}

// ── Status badge ────────────────────────────────────────────────

function StatusMessage({ state }: { state: StatusState }) {
  if (state.status === 'idle') return null
  const colors = {
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

function GoogleDriveIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.71 3.5L1.15 15l3.43 5.95L11.14 9.45zm1.14 0l6.57 11.36H23l-6.57-11.36zm7.71 12.86H8.28l-3.43 5.95h8.28z" />
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
