import {
  type CircuitBreakerPolicy,
  CircuitState,
  ConsecutiveBreaker,
  circuitBreaker,
  ExponentialBackoff,
  handleAll,
  isBrokenCircuitError,
  type RetryPolicy,
  retry,
  wrap,
} from 'cockatiel'
import logger from '../logger'
import type { CircuitBreakerOptions, RetryOptions } from './types'

export type { CircuitBreakerOptions, RetryOptions } from './types'

// ── Defaults ────────────────────────────────────────────────────

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 100,
  multiplier: 2,
  maxDelay: 5_000,
}

const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerOptions = {
  threshold: 5,
  halfOpenAfter: 30_000,
}

// ── Factory helpers ─────────────────────────────────────────────

export function createRetryPolicy(
  opts: Partial<RetryOptions> = {}
): RetryPolicy {
  const { maxAttempts, initialDelay, multiplier, maxDelay } = {
    ...DEFAULT_RETRY,
    ...opts,
  }

  const policy = retry(handleAll, {
    maxAttempts,
    backoff: new ExponentialBackoff({
      initialDelay,
      maxDelay,
      exponent: multiplier,
    }),
  })

  policy.onRetry((evt) => {
    logger.warn(
      { attempt: evt.attempt, delay: evt.delay },
      'resilience: retrying after transient failure'
    )
  })

  policy.onGiveUp(() => {
    logger.error('resilience: retry attempts exhausted')
  })

  return policy
}

export function createCircuitBreakerPolicy(
  opts: Partial<CircuitBreakerOptions> = {}
): CircuitBreakerPolicy {
  const { threshold, halfOpenAfter } = {
    ...DEFAULT_CIRCUIT_BREAKER,
    ...opts,
  }

  const policy = circuitBreaker(handleAll, {
    breaker: new ConsecutiveBreaker(threshold),
    halfOpenAfter,
  })

  policy.onStateChange((state) => {
    logger.info(
      { state: CircuitState[state] },
      'resilience: circuit breaker state changed'
    )
  })

  return policy
}

// ── Convenience wrappers ────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: Partial<RetryOptions>
): Promise<T> {
  const policy = createRetryPolicy(opts)
  return policy.execute(fn)
}

export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  policy: CircuitBreakerPolicy
): Promise<T> {
  return policy.execute(fn)
}

export function isCircuitOpen(policy: CircuitBreakerPolicy): boolean {
  return policy.state === CircuitState.Open
}

export { CircuitState, isBrokenCircuitError, wrap }
