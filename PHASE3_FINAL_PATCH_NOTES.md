# Amira Store — Phase 3 Complete Repair Patch

## Finalized distributed rate limiting
- Replaced the process-local rate-limit Map with an Upstash Redis REST-backed atomic Lua limiter suitable for Vercel/serverless deployments.
- Preserved fixed-window semantics and `Retry-After` behavior. The Redis-side Lua script performs the counter check/increment atomically, preventing concurrent requests from racing the limit check.
- Added explicit `identifier` support so authenticated account mutations use a global per-user bucket instead of a user+IP bucket.
- Generic public/unauthenticated scopes continue to use the client IP as their identity.
- Production fails closed when Upstash credentials are missing or the Redis backend fails; it never silently falls back to local memory.
- Development keeps a bounded in-memory fallback only when Upstash is not configured, so local setup can still run without Redis.
- Added `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.example`.

## Existing Phase 3 repairs retained
- Auth login/register/password-change/profile mutations keep rate limits and localized API responses.
- Address create/update/delete mutations are rate-limited per authenticated user.
- AI admin endpoints authenticate before rate-limit accounting.
- AI endpoints use the centralized localized API error contract for invalid requests, throttling, provider outage, and server failures.
- AI chat validation caps aggregate prompt/history size at 20,000 characters.
- AI SKU collision fallback is bounded at 10,000 candidates.
- Order tracking and smart search rate-limit calls are asynchronous and use the same centralized error contract.
- No storefront/order/cart business behavior was intentionally changed beyond the existing Phase 2/3 fixes.

## Required production configuration
The production Vercel project must define both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without them, protected API endpoints intentionally fail closed instead of exposing an unbounded production endpoint.

## Verification performed locally on the patch source
- TypeScript source was updated so every `rateLimit(...)` call is awaited.
- The limiter uses one atomic Redis EVAL operation for check + increment + TTL.
- The rate-limit helper remains bounded in development and does not grow an unbounded process-local Map.
- Existing Phase 3 files were preserved and only the remaining distributed-limiter gap was completed.
