// Simple in-memory per-user rate limiter for insight generation.
//
// Trade-off: in a multi-instance serverless deployment, each instance has its
// own Map, so the effective limit is `max * instances`. For Phase 2 we accept
// this — same behavior the existing Render backend has on a single instance.
// Phase 4-ish: replace with Redis (Upstash) for distributed limits.
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX = 10;

const store = (global._rateLimitStore =
  global._rateLimitStore || new Map());

// Throttled sweep of expired entries so the Map doesn't grow forever.
// Cheap (single scan, at most once per SWEEP_INTERVAL_MS).
const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // sweep at most once per hour
let lastSweepAt = 0;

function maybeSweep(now) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [k, entry] of store) {
    if (entry.resetAt <= now) store.delete(k);
  }
}

export function checkRateLimit(key, max = DEFAULT_MAX, windowMs = WINDOW_MS) {
  const now = Date.now();
  maybeSweep(now);
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (entry.count >= max) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      resetAt: entry.resetAt,
    };
  }

  entry.count += 1;
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

// Returns a previously-consumed slot back to the pool. Use when a request
// passed `checkRateLimit` but the work the slot was reserving didn't
// actually happen (e.g. an upstream API call failed before incurring cost).
// No-op if the entry has already reset; the sweep will clean stale rows.
export function refundRateLimit(key) {
  const entry = store.get(key);
  if (!entry) return;
  if (entry.resetAt <= Date.now()) return;
  if (entry.count > 0) entry.count -= 1;
}
