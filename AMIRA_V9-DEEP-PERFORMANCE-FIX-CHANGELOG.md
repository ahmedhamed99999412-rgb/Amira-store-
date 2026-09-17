# Amira Store — V9 Deep Performance / SSR Fix

## Root-cause evidence

Production Neon was inspected directly on the `production` branch. The database itself is small and the representative category product query executes in under 1 ms on Neon; the slow mobile screenshot therefore is not explained by a heavy PostgreSQL plan.

The production Neon compute is currently configured with `suspend_timeout_seconds = 0`, so idle requests can require compute wake-up before server-rendered pages can respond. Account policy currently prevents changing that setting through the available Neon API.

The storefront also had server pages waiting for multiple relational Prisma queries before returning any JSX. That keeps Next.js `loading.tsx` visible until all awaited work finishes.

## V9 changes

### `src/lib/queries.ts`
- Featured product cards now use one SQL projection instead of Prisma relation fan-out.
- Shop/all-product listing now uses one SQL projection, one result set, window-count pagination, direct sale filtering, localized scalar lookups, aggregated stock/review stats, and no separate count query.
- Existing category/product/related raw projections from V8 remain in place.
- Public query cache remains `unstable_cache` with 60-second revalidation.
- Removed the now-unused sale-ID helper.

### `src/lib/db.ts`
- Prisma client is retained on `globalThis` in all runtimes so a warm server runtime reuses the same client instance.

### Category page
- `src/app/[locale]/category/[slug]/page.tsx` no longer blocks the initial route response on the product-grid query.
- Product results stream through React Suspense with a lightweight product-grid fallback.
- Category/header shell can render before the product list finishes.

### Product page
- `src/app/[locale]/product/[slug]/page.tsx` no longer blocks the whole page on related-products loading.
- Related products stream independently through Suspense.

### Header
- Keeps the V8 `useEffect` import fix.

## Safety

- No products, categories, relationships, orders, customers, or user data were deleted or mass-updated.
- No DB migration or destructive SQL was added.
- Neon inspection was read-only. An attempted Neon compute suspend-time update was rejected by account policy and did not modify production.

## Verification performed

- PostgreSQL syntax/execution plans were checked directly against Production Neon.
- Representative category query: ~0.81 ms execution on Neon.
- Representative shop query: ~0.61 ms execution on Neon.
- TypeScript syntax transpilation passed for all V9-changed TS/TSX files.
- Full project `tsc`/`npm ci` could not be completed in the local sandbox because dependency installation timed out; therefore this package does **not** claim a full local typecheck/build pass. GitHub/Vercel must remain the final compile gate.

## V9.1 Build Type Fix — 2026-09-13

- Fixed the Vercel TypeScript build error in `src/app/[locale]/category/[slug]/page.tsx`.
- Root cause: `next-intl`'s `tCommon` translator accepts interpolation values typed as `Record<string, string | number | Date>`, while the streamed `CategoryProductsSection` prop was incorrectly declared with `Record<string, unknown>`.
- Minimal fix: aligned the child prop signature with the actual `next-intl` translator contract.
- No database, product, category, or runtime behavior changes.
