import { NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Sweep expired entries every 60s to avoid memory leaks.
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}, 60_000).unref?.()

interface RateLimitOpts {
  /** Maximum requests allowed in the window. */
  limit: number
  /** Window size in seconds. */
  windowSeconds: number
}

/**
 * In-memory sliding-window rate limiter keyed on an arbitrary string (e.g. IP,
 * email, or a composite). Returns null if the request is allowed, or a 429
 * NextResponse if the limit has been exceeded.
 */
export function rateLimit(
  key: string,
  opts: RateLimitOpts
): NextResponse | null {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowSeconds * 1000 })
    return null
  }

  entry.count++
  if (entry.count > opts.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    )
  }

  return null
}

/**
 * Extract the client IP from the request, falling back to a generic key.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
