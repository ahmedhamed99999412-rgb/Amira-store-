# Phase 5 Wishlist Fix V2

## Why V1 was insufficient

The first fix repaired the server/client identifier contract, but the wishlist page still performed a second network fetch for every wishlist item. That left the feature dependent on a chain of client requests after the wishlist API had already returned complete product data and could still leave the page stuck in loading or surface a runtime error when any product request failed.

## Minimal V2 scope

- Keep the `productId` contract in `/api/wishlist`.
- Normalize and preserve the complete product fields already returned by the wishlist API.
- Render `ProductCard` directly from the normalized wishlist items.
- Remove the per-item `/api/products/[slug]` fetch waterfall from `WishlistView`.
- Preserve local wishlist data if a background sync request fails instead of turning a recoverable network issue into an unusable page.
- No product/category/user/order data changes.
