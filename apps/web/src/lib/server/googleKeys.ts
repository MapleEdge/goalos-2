import 'server-only'
import logger from '@goalos/shared/lib/logger'
import { GoogleAuth } from 'google-auth-library'

/**
 * Provisions and revokes per-customer Gemini API keys via the Google Cloud
 * API Keys API (v2). Paid subscribers get their own key restricted to the
 * Generative Language API so usage is isolated, attributable, and revocable.
 * Keys are created in the OWNER's GCP project — the customer pays via Stripe,
 * billing still flows to the owner. Keys never leave the server.
 *
 * Requires:
 *  - GOOGLE_CLOUD_PROJECT: project id or number that owns the keys
 *  - service-account creds via GCP_SERVICE_ACCOUNT_JSON (inline) or ADC, with
 *    the `apikeys.keys.create` / `.delete` permissions.
 */
const API_BASE = 'https://apikeys.googleapis.com/v2'
const GEMINI_SERVICE = 'generativelanguage.googleapis.com'

function getProject(): string | null {
  return process.env.GOOGLE_CLOUD_PROJECT ?? null
}

let cachedAuth: GoogleAuth | null = null

function getAuth(): GoogleAuth | null {
  if (cachedAuth) return cachedAuth
  const inline = process.env.GCP_SERVICE_ACCOUNT_JSON
  try {
    cachedAuth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      ...(inline ? { credentials: JSON.parse(inline) } : {}),
    })
    return cachedAuth
  } catch (err) {
    logger.error({ err }, 'googleKeys: failed to init GoogleAuth')
    return null
  }
}

/** Whether per-customer key provisioning is configured in this environment. */
export function isKeyProvisioningEnabled(): boolean {
  return Boolean(
    getProject() &&
      (process.env.GCP_SERVICE_ACCOUNT_JSON ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS)
  )
}

interface LongRunningOp {
  name: string
  done?: boolean
  error?: { message?: string }
  response?: { name?: string; keyString?: string }
}

async function pollOperation(
  auth: GoogleAuth,
  opName: string
): Promise<LongRunningOp> {
  const client = await auth.getClient()
  for (let i = 0; i < 30; i++) {
    const { data } = await client.request<LongRunningOp>({
      url: `${API_BASE}/${opName}`,
    })
    if (data.done) return data
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Timed out waiting for API Keys operation')
}

export interface ProvisionedKey {
  /** The secret key string (store encrypted; never send to clients). */
  keyString: string
  /** API Keys resource name, used to revoke the key later. */
  resourceName: string
}

/**
 * Creates a new Gemini-restricted API key. Returns null when provisioning is
 * not configured (caller should fall back to the shared owner key).
 */
export async function provisionGeminiKey(
  label: string
): Promise<ProvisionedKey | null> {
  const project = getProject()
  const auth = getAuth()
  if (!project || !auth || !isKeyProvisioningEnabled()) return null

  try {
    const client = await auth.getClient()
    const { data: op } = await client.request<LongRunningOp>({
      url: `${API_BASE}/projects/${project}/locations/global/keys`,
      method: 'POST',
      data: {
        displayName: label,
        restrictions: { apiTargets: [{ service: GEMINI_SERVICE }] },
      },
    })

    const done = op.done ? op : await pollOperation(auth, op.name)
    if (done.error) {
      throw new Error(done.error.message ?? 'API Keys create failed')
    }
    const resourceName = done.response?.name
    if (!resourceName) throw new Error('API Keys create returned no key name')

    let keyString = done.response?.keyString
    if (!keyString) {
      const { data } = await client.request<{ keyString: string }>({
        url: `${API_BASE}/${resourceName}/keyString`,
      })
      keyString = data.keyString
    }
    if (!keyString) throw new Error('Could not retrieve key string')

    logger.info({ resourceName }, 'googleKeys: provisioned customer key')
    return { keyString, resourceName }
  } catch (err) {
    logger.error({ err }, 'googleKeys: provisioning failed')
    return null
  }
}

/** Revokes (deletes) a previously provisioned key. Best-effort. */
export async function revokeGeminiKey(resourceName: string): Promise<void> {
  const auth = getAuth()
  if (!auth) return
  try {
    const client = await auth.getClient()
    await client.request({
      url: `${API_BASE}/${resourceName}`,
      method: 'DELETE',
    })
    logger.info({ resourceName }, 'googleKeys: revoked customer key')
  } catch (err) {
    logger.error({ err, resourceName }, 'googleKeys: revoke failed')
  }
}
