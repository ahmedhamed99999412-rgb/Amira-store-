Amira Store — Task 21 Build Repair (exact Vercel errors)

Apply/overwrite these 3 files on branch main:
- src/store/wishlist-store.ts
- src/components/product/ProductDetailClient.tsx
- src/lib/queries.ts

These are the only files changed in this patch.

Root cause verified against Vercel commit 784a1b3:
1) WishlistItem was missing variantMode while ProductCard passes it.
2) ProductDetailClient compared a variantMode union that excludes 'none' against 'none'.
3) getFeaturedProducts SQL returns variantMode but the TypeScript row type did not declare it.

Do not remove the existing Task 21 ProductCard changes.
