# Amira Store — Phase 1 Build Fix

Scope: Fix the Vercel TS5097 build failure only.

Changed files:
- tsconfig.json: enabled `allowImportingTsExtensions: true`.
- tests/money.test.ts: unchanged import behavior; `.ts` extension preserved.
- tests/order-stock.test.ts: unchanged import behavior; `.ts` extension preserved.

Reason:
TypeScript was rejecting explicit `.ts` import extensions during `next build`.
The tests run directly under Node's native ESM loader, so removing `.ts` would break the test runner.
Enabling the TypeScript option fixes the build-time error without changing application runtime behavior.

No database, Prisma schema, migrations, seed, application pages, APIs, pricing, categories, products, or Vercel settings were changed.
