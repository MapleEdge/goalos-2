import { CircuitState } from 'cockatiel'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createCircuitBreakerPolicy,
  createRetryPolicy,
  isCircuitOpen,
  withRetry,
} from './index'

vi.mock('@/lib/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('createRetryPolicy', () => {
  it('retries and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('ok')

    const policy = createRetryPolicy({ maxAttempts: 3, initialDelay: 1 })
    const result = await policy.execute(fn)

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('gives up after maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent'))

    const policy = createRetryPolicy({
      maxAttempts: 2,
      initialDelay: 1,
      maxDelay: 10,
    })

    await expect(policy.execute(fn)).rejects.toThrow('persistent')
    // 1 initial + 2 retries = 3 total calls
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe('createCircuitBreakerPolicy', () => {
  it('opens after consecutive failures exceed threshold', async () => {
    const policy = createCircuitBreakerPolicy({
      threshold: 3,
      halfOpenAfter: 60_000,
    })

    const fail = () => policy.execute(() => Promise.reject(new Error('fail')))

    await expect(fail()).rejects.toThrow('fail')
    await expect(fail()).rejects.toThrow('fail')
    await expect(fail()).rejects.toThrow('fail')

    expect(isCircuitOpen(policy)).toBe(true)
  })

  it('resets consecutive count on success', async () => {
    const policy = createCircuitBreakerPolicy({
      threshold: 3,
      halfOpenAfter: 60_000,
    })

    await expect(
      policy.execute(() => Promise.reject(new Error('fail')))
    ).rejects.toThrow()

    await expect(
      policy.execute(() => Promise.reject(new Error('fail')))
    ).rejects.toThrow()

    // Succeed — resets the consecutive counter
    const result = await policy.execute(() => Promise.resolve('ok'))
    expect(result).toBe('ok')

    // Two more failures should NOT open (only 2 consecutive, threshold=3)
    await expect(
      policy.execute(() => Promise.reject(new Error('fail')))
    ).rejects.toThrow()
    await expect(
      policy.execute(() => Promise.reject(new Error('fail')))
    ).rejects.toThrow()

    expect(isCircuitOpen(policy)).toBe(false)
  })

  it('reports closed state initially', () => {
    const policy = createCircuitBreakerPolicy()
    expect(isCircuitOpen(policy)).toBe(false)
    expect(policy.state).toBe(CircuitState.Closed)
  })
})

describe('withRetry', () => {
  it('wraps an async function with retry', async () => {
    let calls = 0
    const result = await withRetry(
      async () => {
        calls++
        if (calls < 2) throw new Error('transient')
        return 42
      },
      { maxAttempts: 3, initialDelay: 1 }
    )

    expect(result).toBe(42)
    expect(calls).toBe(2)
  })
})
