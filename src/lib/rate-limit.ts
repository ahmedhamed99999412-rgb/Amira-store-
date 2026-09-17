import { NextRequest } from 'next/server';

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();
const MAX_MEMORY_BUCKETS = 10_000;
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/$/, '');
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const RATE_LIMIT_SCRIPT = `
local limit = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', KEYS[1]) or '0')

if current >= limit then
  local ttl = redis.call('PTTL', KEYS[1])
  return {0, ttl}
end

local next_count = redis.call('INCR', KEYS[1])
if next_count == 1 then
  redis.call('PEXPIRE', KEYS[1], window_ms)
end

local ttl = redis.call('PTTL', KEYS[1])
return {1, ttl}
`;

function getClientAddress(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function cleanupMemory(currentTime: number) {
  if (memoryBuckets.size < MAX_MEMORY_BUCKETS) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= currentTime) memoryBuckets.delete(key);
  }
  if (memoryBuckets.size <= MAX_MEMORY_BUCKETS) return;
  const excess = memoryBuckets.size - MAX_MEMORY_BUCKETS;
  let removed = 0;
  for (const key of memoryBuckets.keys()) {
    memoryBuckets.delete(key);
    removed += 1;
    if (removed >= excess) break;
  }
}

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanupMemory(now);
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true };
}

async function distributedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const response = await fetch(UPSTASH_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['EVAL', RATE_LIMIT_SCRIPT, '1', key, String(limit), String(windowMs)]),
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`RATE_LIMIT_BACKEND_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) {
    throw new Error(`RATE_LIMIT_BACKEND_${payload.error}`);
  }

  const result = payload.result;
  if (!Array.isArray(result) || result.length < 2) {
    throw new Error('RATE_LIMIT_BACKEND_INVALID_RESPONSE');
  }

  const allowed = Number(result[0]) === 1;
  const ttlMs = Number(result[1]);
  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new Error('RATE_LIMIT_BACKEND_INVALID_TTL');
  }

  return allowed
    ? { ok: true }
    : { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)) };
}

/**
 * Distributed fixed-window rate limiter for Vercel/serverless.
 *
 * - Generic scopes are limited per client IP.
 * - Passing `identifier` makes the bucket global for that identifier (for
 *   example an authenticated user id), independent of the caller IP.
 * - Production intentionally fails closed when Upstash is not configured or
 *   unavailable; it never silently falls back to process-local memory.
 * - Development may use a bounded in-memory fallback so local setup does not
 *   require Redis for every request.
 */
export async function rateLimit(
  req: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
  identifier?: string,
): Promise<RateLimitResult> {
  if (!scope || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error('RATE_LIMIT_INVALID_CONFIGURATION');
  }

  const identity = identifier?.trim() || getClientAddress(req);
  const key = `amira:rate-limit:v1:${scope}:${identity}`;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RATE_LIMIT_CONFIG_MISSING');
    }
    return memoryRateLimit(key, limit, windowMs);
  }

  return distributedRateLimit(key, limit, windowMs);
}
