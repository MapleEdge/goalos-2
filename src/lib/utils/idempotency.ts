import logger from '@/lib/logger'
import { prisma } from '@/lib/prisma'

export interface IdempotencyResult<T> {
  cached: boolean
  response: T
}

/**
 * Execute `fn` at most once for the given idempotency key.
 *
 * If the key already exists in the database the cached response is returned.
 * Otherwise `fn` is executed, its JSON-serialisable result is stored, and the
 * result is returned.
 */
export async function withIdempotency<T>(
  key: string | undefined | null,
  fn: () => Promise<T>
): Promise<IdempotencyResult<T>> {
  if (!key) {
    return { cached: false, response: await fn() }
  }

  const existing = await prisma.idempotencyKey.findUnique({
    where: { key },
  })

  if (existing) {
    logger.debug({ key }, 'idempotency: returning cached response')
    return { cached: true, response: existing.response as T }
  }

  const response = await fn()

  try {
    await prisma.idempotencyKey.create({
      data: { key, response: response as never },
    })
  } catch (err) {
    // Unique constraint race — another request beat us. Return our result
    // but log the conflict.
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      logger.warn({ key }, 'idempotency: key race detected')
      return { cached: false, response }
    }
    throw err
  }

  return { cached: false, response }
}
