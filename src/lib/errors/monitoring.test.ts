import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getErrorSnapshot,
  trackError,
  trackTransactionRollback,
} from './monitoring'

vi.mock('@/lib/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

describe('error monitoring', () => {
  beforeEach(() => {
    // Reset window by advancing time past the window
    vi.useFakeTimers()
    vi.advanceTimersByTime(120_000)
    // Trigger a reset by calling trackError once
    trackError('__reset__')
    vi.useRealTimers()
  })

  it('tracks error counts by code', () => {
    trackError('VALIDATION_ERROR')
    trackError('VALIDATION_ERROR')
    trackError('NOT_FOUND')
    const snap = getErrorSnapshot()
    expect(snap.errors.VALIDATION_ERROR).toBe(2)
    expect(snap.errors.NOT_FOUND).toBe(1)
  })

  it('tracks transaction rollbacks', () => {
    trackTransactionRollback()
    trackTransactionRollback()
    const snap = getErrorSnapshot()
    expect(snap.transactionRollbacks).toBe(2)
  })

  it('returns a windowStartedAt timestamp', () => {
    const snap = getErrorSnapshot()
    expect(snap.windowStartedAt).toBeDefined()
    expect(new Date(snap.windowStartedAt).getTime()).toBeGreaterThan(0)
  })
})
