# Checkpoint 30 — Product Query Input Guards

## Change
Added server-side bounds/type validation to GET /api/products for page, pageSize, minPrice, maxPrice, and sort.

## Scope
Only `src/app/api/products/route.ts` changed for application behavior. No schema or data changes.

## Expected behavior
- page: integer 1..10000
- pageSize: integer 1..100
- prices: finite and >= 0
- minPrice <= maxPrice
- sort: newest | price-asc | price-desc | rating

## Verification
- custom.db: 21 tables / 543 rows
- No database records changed.
- Source file delimiter balance: 0 mismatches.
