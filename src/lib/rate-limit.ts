import { NextRequest } from 'next/server';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function now() {
  return Date.now();
}

function getClientAddress(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function cleanup(currentTime: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= currentTime) buckets.delete(key);
  }
  if (buckets.size <= MAX_BUCKETS) return;
  const excess = buckets.size - MAX_BUCKETS;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;
    if (removed >= excess) break;
  }
}

export function rateLimit(
  req: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const currentTime = now();
  cleanup(currentTime);

  const key = `${scope}:${getClientAddress(req)}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= currentTime) {
    buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true };
}
