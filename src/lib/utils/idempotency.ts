import logger from '@/lib/logger'
import { prisma } from '@/lib/prisma'

export interface IdempotencyResult<T> {
  cached: boolean
  response: T
}

/**
 * Execute `fn` at most once for the given idempotency key.
 *
 * Reserves the key atomically via INSERT before executing `fn`, so concurrent
 * requests with the same key cannot both proceed. If the INSERT fails with a
 * unique-constraint violation the existing cached response is returned instead.
 */
export async function withIdempotency<T>(
  key: string | undefined | null,
  fn: () => Promise<T>
): Promise<IdempotencyResult<T>> {
  if (!key) {
    return { cached: false, response: await fn() }
  }

  // Try to reserve the key first (atomic). The placeholder `null` marks the
  // row as "in-flight". If another request already reserved it, we fall
  // through to the catch branch.
  try {
    await prisma.idempotencyKey.create({
      data: { key, response: null as never },
    })
  } catch (err) {
    // Unique constraint → another request owns this key already.
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      // Poll briefly for the result in case the other request is still running.
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key },
      })
      if (existing) {
        logger.debug({ key }, 'idempotency: returning cached response')
        return { cached: true, response: existing.response as T }
      }
    }
    throw err
  }

  // We own the key — execute the operation.
  try {
    const response = await fn()

    await prisma.idempotencyKey.update({
      where: { key },
      data: { response: response as never },
    })

    return { cached: false, response }
  } catch (err) {
    // Clean up the reserved row so the operation can be retried.
    await prisma.idempotencyKey
      .delete({ where: { key } })
      .catch(() => {})
    throw err
  }
}
