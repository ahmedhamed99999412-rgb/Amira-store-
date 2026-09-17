# Amira V7 — Performance Optimization

Scope: speed only; no DB migrations, resets, seeds, product/category data changes, pricing changes, stock changes, auth changes, AI behavior changes, or order logic changes.

## Changes

- Cached shared store settings, main navigation categories, hero banners, and promo banners for 60 seconds with Next server cache.
- Reduced translation payloads to the active locale plus Arabic fallback instead of loading all locales.
- Replaced category descendant N+1 queries with a single PostgreSQL recursive CTE query.
- Converted public storefront/home/category/product/info pages from `force-dynamic` to 60-second ISR where safe. Cart/checkout/account/admin/wishlist remain dynamic.
- Added Vercel/CDN `s-maxage` to the DB-backed image endpoint while preserving the existing URL contract and image content.
- Kept all V6 wishlist, hydration, click, lint, and TypeScript fixes intact.

## Explicitly not changed

- No database schema/data mutation.
- No deletion or mass update of products/categories/category relationships.
- No placeholder WhatsApp number.
- No AI disable/fallback changes.
- No migration reset/truncate/seed execution.

## Verification status

This package is not marked production-verified until GitHub CI and Vercel build pass, followed by visual production checks of home, shop, category, product, cart, wishlist, checkout, auth/admin paths and repeat-navigation performance.
