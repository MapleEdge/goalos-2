import logger from '@goalos/shared/lib/logger'
import { prisma } from '@goalos/shared/lib/prisma'
import type { PrismaClient } from '@prisma/client'

/**
 * The transaction client exposed to callbacks.
 * Prisma's interactive-transaction callback receives an extended client that
 * mirrors PrismaClient but runs within the transaction scope.
 */
export type TxClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0]

/**
 * Execute `fn` inside a Prisma interactive transaction.
 * On failure the transaction is rolled back automatically and the error is
 * logged before being re-thrown so the caller can map it to a response.
 */
export async function withTransaction<T>(
  fn: (tx: TxClient) => Promise<T>
): Promise<T> {
  try {
    return await (
      prisma.$transaction as (fn: (tx: TxClient) => Promise<T>) => Promise<T>
    )(fn)
  } catch (err) {
    logger.error({ err }, 'transaction: rolled back')
    throw err
  }
}
