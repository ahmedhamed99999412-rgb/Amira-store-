# Task 2.3 — Variant Linking Root-Cause Fix

Base state: rollback to commit `c2e101c`, on top of the earlier
`TASK_2.3` CTA/Suspense/DB-safety pass.

## The actual bug, in one sentence

`Product.hasVariants` is a column that is set once from an admin form
checkbox and never automatically kept in sync with the product's real
variant rows, and five independent code paths (the product card, the
cart API's own server-side guard, the wishlist API, and both admin
write routes) were each trusting that stale column — or an even less
reliable signal, raw variant *count* — instead of checking whether a
variant actually carries a real size or color.

## Why "variant count > 0" is not a valid signal either

Every product — including plain "simple" products with no selectable
options — gets **one placeholder `ProductVariant` row** created for
stock tracking (`src/app/api/admin/products/route.ts`, the
`variants.length > 0 ? {...} : { create: [{ stock: 0 }] }` branch).
That row has `size: null, color: null`. So `variants.length > 0` is
true for *every* product, and can't be used to decide whether a picker
is needed. The only signal that can't drift or false-positive is:
*does at least one variant have a non-null `size` or `color`?*

A correct, well-documented helper for exactly this
(`productNeedsVariantSelection`) already existed in
`src/lib/product-variants.ts` — but it was only used by the SQL-level
`hasSizeVariants`/`hasColorVariants` computation inside the listing
queries. It was **not** used by the product card's own gating logic,
the cart API's validation, the wishlist API, or either admin write
route. This patch wires it through every one of those places.

## Exact chain of symptoms this explains

1. Admin adds a product, then edits it afterward to add SIZE variants.
   The edit form doesn't necessarily resend the top-level "has
   variants" checkbox, so `PUT /api/admin/products/[id]` left the
   stored `hasVariants` column at `false` (`existing.hasVariants` was
   the fallback — see `src/app/api/admin/products/[id]/route.ts` line
   65 in the pre-patch version).
2. The product card (`ProductCard.tsx`) trusted that same stale
   `false` and rendered a plain "Add to Cart" button instead of
   "Choose Size", for a product that actually needs a size choice.
3. Clicking it called `POST /api/cart/items` with `variantId: null`.
   The route's *own* guard (`if (product.hasVariants && !variantId)`)
   also trusted the same stale column, so it let the request through
   instead of rejecting it.
4. The cart item was persisted with no variant attached. On the next
   sync, price is resolved as `variant?.regularPrice ?? product.price`
   — with `variant` null, it falls back to the base `Product.price`
   column, which is not the authoritative price for a product whose
   real pricing lives on its variants. That is the exact "٠ ج.م" line
   seen in the cart.
5. Separately, `GET /api/wishlist` computed
   `hasVariants: p.hasVariants || p.variants.length > 0` — which, per
   the placeholder-row fact above, is `true` for **every** product,
   real variants or not — and never sent `hasSizeVariants`/
   `hasColorVariants` at all. So every wishlist card fell into the
   generic `viewOptions` fallback text regardless of whether the
   product actually had variants, which is why the wishlist page
   looked completely disconnected from the fix applied to the card
   everywhere else.
6. The product detail page defaulted to
   `variants.find(v => v.stock > 0)?.id` — the first in-stock variant
   in array order, not the cheapest one. So the price shown on the
   card (always the cheapest variant, via
   `getLowestVariantCardPricing`) could visibly change the instant the
   customer opened the product page and landed on a different,
   more expensive, arbitrarily-ordered variant.

## Fixes applied

**`src/lib/product-variants.ts`**
- Added `pickDefaultVariantId()`: deterministically picks the same
  variant that determines the card's displayed price (cheapest
  effective price — sale price if set, else regular price, plus any
  adjustment — among in-stock variants, falling back to all variants
  if none are in stock). Ties keep the earlier variant, so the result
  is stable, never random.

**`src/components/product/ProductCard.tsx`**
- The variant-selection gate (both the click handler that decides
  "add directly" vs. "go choose a variant", and the CTA text) now
  reads `product.hasSizeVariants || product.hasColorVariants`
  exclusively. `product.hasVariants` is no longer read anywhere in
  this component.
- The wishlist toggle payload now carries `hasSizeVariants`,
  `hasColorVariants`, `minVariantRegularPrice`, and
  `minVariantSalePrice`, so the wishlist store has the same data a
  listing card has from the moment an item is added (before the next
  server sync overwrites it with authoritative data anyway).

**`src/lib/queries.ts`**
- `getFeaturedProducts`, `getProductsByCategory`, `getAllProducts`,
  `getRelatedProducts`: `hasVariants` is now
  `Boolean(hasSizeVariants || hasColorVariants)` — both of which were
  already being computed correctly and live via `EXISTS` subqueries
  against `product_variants` in every one of these functions. The raw
  `p."hasVariants"` column is no longer read into the returned shape
  by any of them.
- `getProductBySlug`: `hasVariants` is now derived from the product's
  own returned `variants` array via `productNeedsVariantSelection`,
  instead of the raw column.

**`src/app/api/cart/items/route.ts`** — the critical server-side fix
- The variant-required guard now calls
  `productNeedsVariantSelection(product.variants)` (the full variant
  rows are already loaded via `include: { variants: true }`) instead
  of trusting `product.hasVariants`. This is what actually stops a
  $0/variant-less cart line from ever being created again, regardless
  of what any other stale flag says.

**`src/app/api/wishlist/route.ts`**
- `hasVariants` is now derived the same way as everywhere else
  (`productNeedsVariantSelection`), and the response now also includes
  `hasSizeVariants` / `hasColorVariants` per item, computed live from
  each product's loaded variants.

**`src/store/wishlist-store.ts`**
- `WishlistItem` type and `normalizeWishlistItems()` now carry
  `hasSizeVariants`, `hasColorVariants`, `minVariantRegularPrice`, and
  `minVariantSalePrice` through the store instead of dropping them.

**`src/components/wishlist/WishlistView.tsx`**
- Passes the new fields through when reconstructing the
  `ProductCardData` it hands to the shared `ProductCard` component, so
  wishlist cards render identically to listing cards for the same
  product — same CTA, same logic, nothing wishlist-specific left over.

**`src/components/product/ProductDetailClient.tsx`**
- The initial `selectedVariantId` is now computed by
  `pickDefaultVariantId(product.variants)`, matching the cheapest
  price already shown on the card, instead of the first in-stock
  variant in array order.

**`src/app/api/admin/products/route.ts`** (create)
- `hasVariants` is now derived with `productNeedsVariantSelection`
  from the same `variants` array being saved in the same request,
  instead of trusting a separate, independently-submitted form
  boolean that could disagree with the actual variants payload.

**`src/app/api/admin/products/[id]/route.ts`** (update / delete)
- Removed the line that set `hasVariants` from
  `input.hasVariants ?? existing.hasVariants` (the exact mechanism
  that let the flag go stale the moment an edit didn't resend that
  checkbox).
- Added a recompute step at the end of the update transaction: after
  any variant creates/updates/deletes for this request are applied
  (or, if this request didn't touch variants at all, using whatever
  variants currently exist), it re-queries the product's actual
  variant rows and writes `hasVariants` from
  `productNeedsVariantSelection(...)`. This makes the stored column
  self-healing on every save from now on, closing the root cause for
  any other code that might still read it directly in the future.
- Added the missing `revalidateTag('amira-products')` call after both
  the update transaction and the soft-delete. The create route already
  had this; the update/delete routes only had `revalidatePath`, which
  invalidates the Next.js route cache but **not** the separate
  `unstable_cache` Data Cache entries that `getFeaturedProducts` /
  `getAllProducts` / etc. are tagged with. Without this, an admin edit
  could take up to the cache's `revalidate` window (or longer, on a
  distributed/serverless deployment where each instance's cache
  expires independently) to become visible on the storefront — which
  is the most likely explanation for the same product appearing to
  have two different states within roughly a minute of each other.

## Known limitation carried over, not introduced by this patch

`PUT /api/admin/products/[id]` only touches variants when
`input.variants !== undefined && input.variants.length > 0`. Sending
an explicitly empty `variants: []` to convert a variant product back
into a simple one is a no-op today — existing variants are neither
deleted nor cleared. The `hasVariants` recompute added by this patch
does not make this worse (it simply reflects whatever variants exist
after that block runs, unchanged, in that case) but it also does not
fix it. Flagged here rather than fixed silently, since it's a distinct
piece of scope from the linking bug this task targeted.

## Verification performed

- No `node_modules` / no network in the environment this patch was
  produced in, so `npm install && npm run typecheck && npm run build`
  could **not** be executed directly — this remains the authoritative
  gate and should be run before deploying.
- A global `tsc` (v6.0.3) was used to run `--noEmit` across every
  `.ts`/`.tsx` file in `src/`, twice: once with generic strict
  settings, once with flags matched to this project's actual
  `tsconfig.json` (notably `noImplicitAny: false`). Zero parser-level
  (`TS1xxx`) syntax errors anywhere in the project. Every remaining
  reported error, without exception, is attributable to type
  declarations this sandbox doesn't have installed (`@types/node`
  for `Buffer`/`process`, `@types/react`, `@prisma/client`'s generated
  types, `next/server`, etc.) — none are in a file this patch touched,
  and all were cross-checked against the project's real
  `tsconfig.json` settings to rule out false positives from a
  mismatched manual invocation.
- Brace/paren balance verified at 0 for every one of the 12 touched
  `.ts`/`.tsx` files, plus a full manual re-read of every edited block.
- Both `messages/ar.json` and `messages/en.json` re-validated as
  parseable JSON after the earlier CTA-label edits from the prior
  pass.

## What this patch cannot fix: data already on your live database

This is a code fix. It cannot reach into your production database.
Two things almost certainly need manual cleanup there, independent of
this patch:

1. **The "أميرة" product's stored `hasVariants` flag is very likely
   still `false` today.** It will self-heal automatically the *next
   time you save that product* from the admin panel (even a no-op
   save), because of the recompute step added to the update route
   above. Until you do that, the old value stays in the database
   exactly as this patch found it — this patch changes what future
   writes and every read path do with that column, not the row that's
   already sitting there.
2. **The existing $0 cart line** (and any other cart lines created the
   same way, for any product) was already written to your database
   before this fix. It will not repair itself. It should be removed
   directly (via the admin panel's order/cart tooling if one exists,
   or a one-off database query) rather than left for a customer to
   discover at checkout.
