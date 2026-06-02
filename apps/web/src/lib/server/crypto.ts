import 'server-only'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto'

/**
 * AES-256-GCM encryption for secrets stored at rest (per-customer API keys).
 * The key is derived from APP_ENCRYPTION_KEY so rotating that env var
 * invalidates stored ciphertexts. Format: base64(iv).base64(tag).base64(data).
 */
function getKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY
  if (!secret) {
    throw new Error('APP_ENCRYPTION_KEY is not set')
  }
  // Normalize any-length secret to 32 bytes.
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    enc.toString('base64'),
  ].join('.')
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed ciphertext')
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivB64, 'base64')
  )
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
