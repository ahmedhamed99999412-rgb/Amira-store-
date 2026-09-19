# Task 2.3 — Universal Variant-Aware Product Cards & Quick Actions

Base state: rollback to commit `c2e101c`.

## 1. Variant-aware Add-to-Cart CTA (`src/components/product/ProductCard.tsx`)

Fixed a priority bug: products with **both** size and color variants were
falling through to the size-only label. CTA now resolves in this order:

| Variant state              | CTA key              | AR                        | EN                    |
|-----------------------------|-----------------------|---------------------------|------------------------|
| Size + Color                | `chooseSizeAndColor` | اختار المقاس واللون       | Choose size & color   |
| Size only                   | `chooseSize`         | اختار المقاس              | Choose size            |
| Color only                  | `chooseColor`        | اختار اللون               | Choose color           |
| No variants (simple product)| `addToCart`          | (existing key)            | (existing key)         |

All keys are resolved via `next-intl`'s `useTranslations()` — no hardcoded
strings. `chooseSizeAndColor` was added to `messages/ar.json` and
`messages/en.json`.

## 2. Suspense boundaries around `useSearchParams()`

`Header.tsx` is rendered **unwrapped** on every page (home, shop, category,
product, etc.), but it has two independent `useSearchParams()` consumers.
Both are now isolated into small leaf components, each wrapped in its own
`<Suspense fallback={null}>`, so no call site needs to change:

- `HeaderRouteChangeWatcher` — closes the mobile menu/search panel on route
  change. Renders `null`, so its fallback has zero visual impact.
- `SaleNavLink` — highlights the "Sale" nav link when `?sale=true` is
  active. Its fallback (`SaleNavLinkFallback`) renders the **same link
  markup**, just without the active class, so there is no layout shift
  while it resolves.

`ShopFilters`, `SortSelect`, and `PaginationWrapper` already had proper
`<Suspense>` wrapping at every call site; `shop/page.tsx`'s existing bare
`<Suspense>` tags were made explicit (`fallback={null}`) for consistency.

## 3. DB safety guards (`src/lib/queries.ts`)

Added a `safeQuery()` helper and wrapped every product-card-relevant data
fetcher in try/catch with a typed fallback, so a transient DB error (pool
exhaustion, timeout, connection drop) degrades gracefully instead of
throwing out of a Server Component (which Next.js turns into an HTTP 500):

- `getStoreSettings` → falls back to a hardcoded default settings object
- `getMainCategories`, `getHeroBanners`, `getPromoBanners` → `[]`
- `getFeaturedProducts`, `getRelatedProducts` → `[]`
- `getCategoryBySlug`, `getProductBySlug` → `null` (existing not-found path
  already handles this via `notFound()`)
- `getProductsByCategory`, `getAllProducts` → zeroed pagination shape
  (`{ products: [], total: 0, page, pageSize, totalPages: 0 }`)

## Verification performed

- No `node_modules` / no network available in the environment this patch
  was produced in, so `npm run typecheck && npm run build` could **not**
  be executed directly.
- A global `tsc` (v6.0.3) was used to run a best-effort `--noEmit` pass
  across every `.ts`/`.tsx` file in `src/`. After filtering out errors
  caused purely by missing dependencies (`@types/node`, `@types/react`,
  `@prisma/client`, etc. — not installed in that sandbox), **zero
  parser-level (`TS1xxx`) syntax errors** were found anywhere in the
  project, including the files touched by this task.
- Manual brace/paren balance checks and full re-reads of every edited
  block in `queries.ts`, `Header.tsx`, `ProductCard.tsx`, and
  `shop/page.tsx`.
- This project's `eslint.config.mjs` has `no-unused-vars` and
  `@typescript-eslint/no-unused-vars` both set to `"off"`, and
  `tsconfig.json` does not set `noUnusedLocals`/`noUnusedParameters`, so
  unused imports are not build-breaking in this repo's configuration
  either way.

**Before deploying, run the real toolchain** (`npm install && npm run
typecheck && npm run build`) in an environment with network access — this
is a substitute for, not a replacement of, an actual compiler/build pass.
