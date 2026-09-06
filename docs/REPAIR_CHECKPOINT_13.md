# Repair Checkpoint 13 — API Error Sanitization Regression Closure

Scope: only production error response sanitization, plus completion of guest ID hardening in the wishlist route discovered during the audit.

Changes:
- Added `src/lib/api-errors.ts` with a single internal 500 response helper.
- Replaced unexpected `error.message` exposure in API 500 responses with a generic `Internal server error` response.
- Preserved intentional business/validation error messages in order and admin-order routes.
- Replaced remaining `Math.random()` guest ID generation in `/api/wishlist/[productId]` with `crypto.randomUUID()` to make guest-ID hardening consistent across wishlist routes.

Verification:
- Original project files missing in checkpoint: 0
- Raw generic 500 `error.message` response patterns remaining: 0
- Guest `Math.random()` patterns remaining in API routes: 0
- Database business data was not modified by this checkpoint.
- Archive integrity checked after packaging.

Runtime note: full Next.js/Bun build was not executed in this environment because project dependencies/Bun are unavailable here.
