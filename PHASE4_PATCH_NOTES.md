# Amira Store — Phase 4 Patch Notes

Baseline: GitHub `main` at `abcfaaa7d98492f1ae77d4bbb45b4c656e791f52`

## Scope

This is a changed-files-only patch for Phase 4 (Catalog / Admin / Settings / Data / SEO).
No Neon data rows are modified by this patch, and `DATABASE_URL` is untouched.

## Repairs included

### 1. Admin Store Settings data integrity
File: `src/app/api/admin/settings/route.ts`

- Removed the hardcoded WhatsApp fallback number from the settings singleton creation path.
- First-time settings creation now persists the submitted `addressAr` and `addressEn` values instead of silently dropping them.
- Admin settings updates can now intentionally clear `announcementAr` / `announcementEn` by saving an empty string.
- Required settings fields are persisted from validated input without `|| undefined` converting legitimate values to implicit no-ops.
- Existing HTTP/HTTPS validation and admin-only access are preserved.

### 2. Product detail query efficiency
File: `src/app/[locale]/product/[slug]/page.tsx`

- Removed an unused `getRelatedProducts('', locale, 4)` database query.
- The product page now performs only the settings/categories/product queries needed before rendering, then loads related products once for the actual product.
- No visible storefront behavior was intentionally changed.

### 3. SEO sitemap now includes live catalog URLs
File: `src/app/sitemap.ts`

- Converted the sitemap to runtime generation with a DB-safe fallback.
- Includes active category URLs for Arabic and English.
- Includes active, non-deleted product URLs for Arabic and English.
- Uses `updatedAt` for catalog URL `lastModified` values.
- Keeps a small static fallback if the database is temporarily unavailable.
- Excludes private/account/cart/admin routes from the sitemap.

### 4. Shipping content no longer makes unsupported operational promises
File: `src/app/[locale]/shipping/page.tsx`

- Removed unsupported fixed delivery times, international-shipping claim, and implied fixed service availability.
- Explains the actual current flow: address review, shipping-cost confirmation, then preparation.
- WhatsApp contact is generated from StoreSettings and is shown only when a usable number exists.
- No Free Shipping claim was added.

### 5. Returns content no longer publishes unverified policy terms
File: `src/app/[locale]/returns/page.tsx`

- Removed unsupported fixed return window, refund timing, payment-method, 24-hour, and guaranteed replacement/refund claims.
- The page now states that eligibility and procedure are confirmed with customer service before the customer ships anything.
- WhatsApp contact is generated from StoreSettings and is shown only when a usable number exists.

## Intentionally NOT changed

- BUG-013 product/category mismatches were not guessed or rewritten. The category tree lacks authoritative jewelry/sunglasses destinations, so changing live data without business confirmation would be unsafe.
- BUG-014 AI provider configuration remains an operational item; no provider credentials or fake provider were invented.
- Cart/wishlist server synchronization from earlier work is not duplicated here.
- Prisma money type migration remains Phase 5.
- No destructive seed, `db push`, or live data mutation is included.

## Verification target after upload

Run:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Then smoke-test:

- `/ar/sitemap.xml` and `/en/sitemap.xml` equivalent catalog URLs
- one category URL
- one product URL
- Admin Settings save/clear/reload
- Shipping and Returns pages in both locales

This patch does not claim production verification until those checks are run on the uploaded revision.
