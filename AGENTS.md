# AGENTS.md

## Commands

- `npm run lint` — Run ESLint on the entire project
- `npm run typecheck` — Run TypeScript type checking (`tsc --noEmit`)
- `npm test` — Run Node.js test suite (`tests/`)
- `npm run dev` — Start Next.js dev server on port 3000
- `npm run build` — Build the Next.js production bundle

## Project Overview

This is an e-commerce store application built with Next.js. The codebase follows a modular structure with:

- **UI Components**: `src/components/` — React components organized by domain (product, layout, cart, etc.)
- **API Routes**: `src/app/api/` — Next.js API endpoints for cart, wishlist, search, checkout
- **Database**: `src/lib/db.ts` — Prisma client instance (SQLite)
- **Queries**: `src/lib/queries.ts` — Raw SQL queries for product data (price ranges, filters, search)
- **Product Variants**: `src/lib/product-variants.ts` — Pricing helper functions for variant-based products
- **Money Helpers**: `src/lib/money.ts` — Decimal-safe arithmetic utilities
- **Stores**: `src/store/` — Zustand stores for cart, wishlist, and product filters
- **Tests**: `tests/` — Node.js test suite covering money helpers and product variant pricing

## Pricing Architecture

Products can have base prices or variant-level pricing. The pricing resolution strategy is:

1. **Display Price**: `product.displayPrice` (precomputed SQL) → `product.minVariantSalePrice` → `product.minVariantRegularPrice` → `product.price`
2. **Display Compare Price**: `product.displayComparePrice` (precomputed SQL) → `product.comparePrice`
3. **Discount Detection**: Only show discount badge when `displayPrice < displayComparePrice` and both are non-null

Variant pricing helpers (`getLowestVariantCardPricing`) compute these values at the application level when variant data is available, ensuring consistency across API routes and client-side operations.

## Conventions

- Run lint and typecheck before committing
- Add test coverage for pricing logic changes
- Use 4-space indentation in TypeScript files
- Prefer named exports over default exports for utility modules
