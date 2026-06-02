import logger from '@/lib/logger'

interface ErrorCounts {
  [code: string]: number
}

const errorCounts: ErrorCounts = {}
let transactionRollbacks = 0
const ALERT_THRESHOLD = 10
const WINDOW_MS = 60_000

let windowStart = Date.now()

function maybeResetWindow() {
  const now = Date.now()
  if (now - windowStart > WINDOW_MS) {
    for (const key of Object.keys(errorCounts)) {
      errorCounts[key] = 0
    }
    transactionRollbacks = 0
    windowStart = now
  }
}

export function trackError(code: string) {
  maybeResetWindow()
  errorCounts[code] = (errorCounts[code] ?? 0) + 1
  if (errorCounts[code] === ALERT_THRESHOLD) {
    logger.warn(
      { code, count: errorCounts[code], windowMs: WINDOW_MS },
      'error monitoring: elevated error rate'
    )
  }
}

export function trackTransactionRollback() {
  maybeResetWindow()
  transactionRollbacks++
  if (transactionRollbacks === ALERT_THRESHOLD) {
    logger.warn(
      { count: transactionRollbacks, windowMs: WINDOW_MS },
      'error monitoring: elevated transaction rollback rate'
    )
  }
}

export function getErrorSnapshot(): {
  errors: ErrorCounts
  transactionRollbacks: number
  windowStartedAt: string
} {
  return {
    errors: { ...errorCounts },
    transactionRollbacks,
    windowStartedAt: new Date(windowStart).toISOString(),
  }
}
