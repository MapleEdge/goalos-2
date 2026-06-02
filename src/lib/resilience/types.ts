export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3). */
  maxAttempts: number
  /** Initial delay in milliseconds before the first retry (default: 100). */
  initialDelay: number
  /** Multiplier applied to the delay after each attempt (default: 2). */
  multiplier: number
  /** Upper bound for the computed delay in milliseconds (default: 5_000). */
  maxDelay: number
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before the circuit opens (default: 5). */
  threshold: number
  /** Time in milliseconds before the circuit transitions to half-open (default: 30_000). */
  halfOpenAfter: number
}
