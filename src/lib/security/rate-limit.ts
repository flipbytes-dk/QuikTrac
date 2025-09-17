// Simple in-memory sliding window rate limiter (dev/single-instance only)
// Do not use as-is for multi-instance production.

export interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

type Entry = {
  timestamps: number[]
}

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, Entry> | undefined
}

const store: Map<string, Entry> = globalThis.__rateLimitStore || new Map()
if (!globalThis.__rateLimitStore) globalThis.__rateLimitStore = store

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const from = now - opts.windowMs

  const entry = store.get(opts.key) || { timestamps: [] }
  // prune old
  entry.timestamps = entry.timestamps.filter((ts) => ts > from)

  let allowed = true
  if (entry.timestamps.length >= opts.limit) {
    allowed = false
  } else {
    entry.timestamps.push(now)
  }

  store.set(opts.key, entry)

  const oldest = entry.timestamps[0] ?? now
  const resetAt = oldest + opts.windowMs
  const remaining = Math.max(0, opts.limit - entry.timestamps.length)

  return { allowed, remaining, resetAt }
}
