# Repair Checkpoint 12 — Best-effort API Rate Limiting

## Scope
Added a small, dependency-free, per-process rate limiter and applied it only to high-risk public endpoints:
- auth/login
- orders/track
- coupons/validate
- product reviews
- AI endpoints

## Behavior
- Returns HTTP 429 when the per-IP window is exceeded.
- Includes `Retry-After`.
- Uses a bounded in-memory bucket map to avoid unbounded growth.

## Important production limitation
This limiter is per application instance/process. It is useful for local development and single-instance protection, but it is NOT a distributed rate limiter for a multi-instance/serverless production deployment. Before Production on Vercel, replace it with a shared limiter (e.g. platform/Redis-based) or another distributed mechanism.

## Preservation
No database schema or frontend behavior was changed.
