# Amira Store - Full Site Functional Audit

Date: 2026-09-06
Production: https://amira-store-zeta.vercel.app
Preview tested: `amira-store-lb6ev9pz6-ahmedhamed99999412-3218.vercel.app`

## Verdict

**VERIFIED WITH DOCUMENTED LIMITATIONS**

The critical storefront, database, authentication, authorization, cart, localization, build, and deployment paths were exercised. No critical or high storefront blocker was found. AI provider availability remains unavailable, but its failure mode is explicit and tested as HTTP 503. Admin CRUD was tested only with isolated fixtures.

## Scope and Method

- Source route discovery from `src/app`, middleware, components, and API route handlers.
- Production HTTP tests for public pages, APIs, error states, images, SEO routes, and protected boundaries.
- Real browser tests on Production and Preview for navigation, language switching, product tabs, wishlist, cart, responsive menu, and console/network behavior.
- Read-only Neon/Prisma checks, reversible Production cart/wishlist mutations, and cleanup-safe customer/admin fixtures.
- No database reset, destructive seed, real-customer mutation, real-order deletion, or real-product deletion was performed.

## Route Inventory

### User-facing page patterns

`/[locale]`, `/[locale]/shop`, `/[locale]/search`, `/[locale]/category/[slug]`, `/[locale]/product/[slug]`, `/[locale]/cart`, `/[locale]/wishlist`, `/[locale]/checkout`, `/[locale]/checkout/success`, `/[locale]/track-order`, `/[locale]/login`, `/[locale]/register`, `/[locale]/account`, `/[locale]/account/addresses`, `/[locale]/account/orders`, `/[locale]/account/settings`, `/[locale]/admin`, `/[locale]/admin/products`, `/[locale]/admin/products/new`, `/[locale]/admin/products/[id]/edit`, `/[locale]/admin/categories`, `/[locale]/admin/orders`, `/[locale]/admin/customers`, `/[locale]/admin/banners`, `/[locale]/admin/settings`.

### API inventory

40 route files were discovered, covering 63 exported methods across:

- Products, product detail, reviews, images, search.
- Cart, wishlist, coupons, orders, order tracking.
- Authentication, profile, password, user addresses, user orders.
- Admin products, categories, banners, customers, orders, settings.
- AI chat, translation, SKU, description, and variant generation.

Middleware: `src/proxy.ts` applies locale handling and injects `x-locale` for API requests.

## Page-by-Page Results

| Area | Routes/actions | Evidence | Result |
| --- | --- | --- | --- |
| Home | `/en`, `/ar`, hero CTA, product sections, images | Browser status 200; rendered Arabic/English content; no console errors | PASS |
| Shop | `/en/shop`, `/ar/shop`, search, sort, pagination, price range | API totals and prices verified for no-results, ascending/descending sort, page 2, and range filters | PASS |
| Categories | Women, Men, Kids, Beauty, Fragrance | Each route returned 200 and category API data was live | PASS |
| Product | `gold-necklace`, title, price, stock, image, breadcrumb | Detail route 200; product ID/data matched live API and Neon | PASS with data finding |
| Product tabs | Description and Reviews | Browser tab switch showed correct panel and review record | PASS |
| Cart | Add, drawer, quantity, totals, refresh, remove | UI add showed item; cart showed `899 x 2 = 1798`; refresh persisted; remove emptied cart | PASS |
| Wishlist | Toggle add/remove | Production UI/API toggle and rollback returned 200 | PASS |
| Auth pages | Login/register/account routes | Public auth pages 200; protected account redirects 307 | PASS |
| Checkout | Page and invalid order submissions | Checkout page 200; empty/invalid order payloads 400 | PASS for validation |
| Track order | Invalid order/phone | Correct 404 for nonexistent order | PASS |
| Admin pages | Direct unauthenticated access | Admin page redirects; admin APIs return 403 | PASS boundary |
| SEO/error | sitemap, robots, invalid localized route | sitemap 200 with 12 URLs; robots 200 with sitemap reference; invalid route 404 | PASS |

## Header, Navigation, Footer, and Links

- Logo, cart, wishlist, account, search, language control, category links, breadcrumbs, and footer category/service links were inspected in browser snapshots.
- Internal footer/category links returned 200 for tested destinations.
- WhatsApp links were present and formed valid `wa.me` targets; external social targets were not followed because they leave the application.
- Back/forward and direct localized URLs were covered for the language and product navigation checks.

## Interactive Controls

- Product quantity increase and disabled decrease at minimum were verified.
- Add-to-cart opened the drawer and updated the cart state.
- Cart removal closed the persistence loop after refresh.
- Product Description/Reviews tabs switched content correctly.
- Wishlist toggle displayed success/removal notifications and persisted through the API.
- Language switching was reproduced as BUG-012, fixed minimally, verified on local, Preview, and Production.
- Mobile menu opened on a 390px viewport on local, Preview, and Production after the final deployment. Browser automation's high-level click helper was timing-sensitive; direct pointer dispatch and the rendered drawer state were verified.
- Full admin create/update/delete button execution was not performed against real Production records to avoid modifying customer/store data.

## API Audit

### Positive and read paths

- `/api/products`: 200; product IDs, prices, inventory totals, sort, pagination, range filters, and zero-result search verified.
- `/api/products/[slug]`: 200 for a real product and 404 for a missing slug.
- `/api/images/[id]`: 200 for real image IDs; 404 for missing IDs.
- `/api/cart`: 200 and database-backed guest cart state.
- `/api/wishlist`: 200 and database-backed state.
- `/api/auth/me`: anonymous response shows `user: null`; authenticated response returned admin role.

### Negative and authorization paths

- Invalid login/register/cart/order/review/AI payloads returned 400.
- Anonymous address and user-order access returned 401.
- Anonymous admin APIs returned 403.
- Invalid order tracking returned 404.
- Invalid coupon monetary values returned 400.
- Wrong HTTP methods returned 405 where the route is POST-only.

## Database and Relationship Audit

- Neon project, `production` branch, and `neondb` were verified.
- PostgreSQL connectivity and `public` schema were verified.
- Prisma PostgreSQL schema is synchronized; no migration directory exists.
- Seed was upsert-based and completed without destructive operations.
- Product-to-category, product-to-image, product-to-variant, cart-to-item, wishlist-to-item, and order-to-item relationships were exercised or inspected.
- Cart/wishlist Production writes were immediately removed after verification.
- No Production customer/order data was used as a mutation test fixture.

## Authentication and Authorization

- Admin login: 200.
- Session role after login: `ADMIN`.
- Logout: 200.
- Post-logout session: unauthenticated.
- Anonymous admin page/API access: redirected/403.
- Protected customer address/order APIs: 401 anonymously.
- All discovered admin API route files contain `requireAdmin()` guards.

## Cart, Price, and Checkout

- Product unit price: EGP 899.
- Quantity 2 line total: EGP 1,798, matching integer-minor-unit calculation.
- Refresh preserved the cart before removal.
- Invalid quantity, negative monetary values, fractional invalid amounts, empty items, and malformed order bodies were rejected.
- A real order was not created because no safe isolated Production customer fixture was available; order creation success and DB persistence remain not tested.

## Localization

- Arabic and English pages rendered real localized content and correct direction/content.
- Raw API UTF-8 decoding contained Arabic correctly; earlier PowerShell mojibake was terminal decoding, not stored data.
- Language switch preserves the current route after BUG-012 fix.

## Responsive and Browser Verification

- Desktop browser pages were exercised with console monitoring; no application console errors were observed.
- 390px mobile viewport: responsive header, mobile search controls, menu drawer, cart, and product interactions were checked.
- Network `ERR_ABORTED` entries were Next.js prefetch cancellations during navigation, not failed application requests.
- A full matrix of every control at desktop/tablet/mobile was not completed; this is a documented coverage limitation, not a PASS claim.

## Bugs and Findings

### BUG-012 - MEDIUM - Language switch discarded current route

- Page/feature: Header language switch.
- Expected: `/en/shop` -> `/ar/shop`; product route remains product route.
- Actual before fix: every switch navigated to `/ar` or `/en` home.
- Root cause: `router.replace('/', { locale })` hardcoded the home pathname.
- Minimal fix: use `usePathname()` and replace the current pathname with the new locale.
- File changed: `src/components/layout/Header.tsx`.
- Verification: typecheck, build, local browser, Preview browser, and Production browser route-preservation checks passed.
- Status: FIXED and deployed in Production deployment `dpl_D393eSVYCiDAhLidYWgyx4pi7WvU`.

### BUG-013 - MEDIUM - Product/category data mismatch

- Products: `gold-necklace` is categorized as `Clutches`; `sunglasses-classic` is categorized as `Handbags`.
- Expected: semantically matching accessory categories.
- Actual: live Neon relationship and product breadcrumb/filter use the mismatched categories.
- Root cause: source seed/data relationship, not a UI query issue.
- Impact: incorrect category navigation and filtering for affected products.
- Minimal fix: confirm intended accessory category, then update only the two product `categoryId` records through an audited admin/data migration. Not changed during this audit because target category ownership needs business confirmation.
- Status: OPEN, data-integrity finding.

### BUG-014 - MEDIUM - AI chat provider unavailable

- Endpoint: `POST /api/ai/chat` with a valid message.
- Expected: provider response or a deliberate unavailable-provider response.
- Actual: HTTP 500 from provider initialization/completion failure.
- Root cause: configured `z-ai-web-dev-sdk` provider is not available in the Production environment.
- Impact: AI assistant chat is unavailable; no fake response is returned.
- Minimal fix: configure and verify an authorized Production provider, or change the route to return an explicit 503 unavailable response. No secret/provider was invented or added.
- Status: OPEN operational limitation.

## Fixes and Regression

- Only BUG-012 was changed during this audit.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- Preview deployment: READY; route switch and mobile drawer verified.
- Production deployment: READY; route switch, mobile drawer, pages, APIs, and auth regression verified.

## Known Limitations / Not Tested

- Real customer registration and order creation were not executed because doing so would create Production records without a dedicated cleanup-safe fixture.
- Full Admin CRUD was not executed against real Production entities.
- AI provider E2E cannot pass until provider availability/credentials are configured; no fake PASS was recorded.
- Browser console coverage is strong for tested pages but not exhaustive for every admin state.
- Prisma has no migration history; future schema evolution needs an explicit migration policy.
- Category mismatch remediation needs business confirmation before changing live data.

## Remaining Risk

- Medium: two product/category relationships affect discoverability.
- Medium: AI feature is unavailable in Production.
- Low: no migration history for future schema changes.
- Low: browser automation click timing can produce false timeouts during Next.js transitions; direct UI state and route results were verified separately.

## Final Quality Gate

| Gate | Status |
| --- | --- |
| All route patterns discovered | PASS |
| Public pages and core links | PASS for tested inventory |
| Core browser interactions | PASS for tested flows |
| API inventory and negative tests | PASS for tested matrix |
| Database relationships | PASS for inspected/exercised flows |
| Authentication/authorization | PASS |
| Admin boundary | PASS; destructive CRUD intentionally not run |
| Cart and price integrity | PASS |
| Localization | PASS after BUG-012 fix |
| Error states | PASS for tested 400/401/403/404 paths |
| Mobile | PASS for tested 390px flows |
| Production regression | PASS |
| Full every-control exhaustive matrix | NOT FULLY VERIFIED |

## Final Decision

**VERIFIED WITH DOCUMENTED LIMITATIONS**

The live storefront and core commerce paths are operational and the only code defect reproduced in the tested critical UI path was fixed minimally. The remaining open findings are the two live data-category mismatches and unavailable AI provider, both explicitly documented and not hidden.

## Follow-up Gap Completion

### Customer and Order E2E

An isolated customer fixture was created with a generated username/phone and removed after verification. Evidence:

- Register: `200`; duplicate registration: `409`; wrong password: `401`.
- Session after register: authenticated; profile update: `200`.
- Address create/read/update: `200`; address was deleted through fixture cleanup.
- Cart add and persistence: `200`; quantity 2 persisted after read.
- Order creation: `200`; idempotency retry returned the existing order.
- Database evidence: order status `PENDING_CONFIRMATION`, item quantity `2`, unit price `199`, subtotal/total `398`, customer relation set to fixture user.
- User orders read and order tracking: `200`.
- Password change: `200`; logout: `200`; post-logout session unauthenticated; login with new password: `200`.
- Cleanup: fixture user/order/address/cart removed; the two reserved stock units were restored under a guarded variant update; final check found zero `auditcustomer_` users and baseline stock.

### Admin Fixture Matrix

- Test category create: `200`; duplicate: `409`; invalid payload: `400`; update: `200`; delete while product attached: `400`.
- Test product create/read/update: `200`; updated price was observed through public product API; soft delete: `200`; storefront product became unavailable.
- Product was reassigned to the real `women` category before cleanup; test category was then deleted: `200`.
- The soft-deleted test product remains only as an `isDeleted=true` archive record, matching the project delete contract; it is absent from storefront lists.
- Banner create/list/update/delete was exercised with a tiny fixture image; final fixture lookup found no audit banners.
- Admin customers, orders, and settings reads returned `200`.
- Real customer, real order, and real product records were not modified.

### BUG-013 Resolution Status

The checked-in `prisma/seed.ts` explicitly assigns `sunglasses-classic` to `women-bags-handbags` and `gold-necklace` to `women-bags-clutches`. Product names/tags prove those relationships are semantically wrong, but the category tree has no dedicated jewelry/sunglasses category. The correct replacement category cannot be inferred safely from source data.

Status: **BLOCKED - Business confirmation required**. No live data was guessed or changed.

### BUG-014 Resolution Status

- Root cause confirmed: `z-ai-web-dev-sdk` is the only configured provider and no provider configuration variables exist in Vercel.
- No fake provider or response was added.
- `AIProviderUnavailableError` now maps provider initialization/completion failures to `{ error: 'AI service unavailable' }` with HTTP `503` across AI routes.
- Production verification: valid `/api/ai/chat` request returned `503`; protected admin AI routes still preserve auth/validation responses.
- Status: **MITIGATED, provider configuration still blocked**.

### BUG-015 - LOW - DB-backed pages queried during build without database URL

- Reproduction: `npm run build` with no `DATABASE_URL` failed while prerendering DB-backed locale pages.
- Root cause: several DB-backed pages were not marked runtime-rendered.
- Minimal fix: added `dynamic = 'force-dynamic'` to DB-backed locale pages, preserving runtime data access and preventing build-time DB queries.
- Verification: build without `DATABASE_URL`: exit code `0`; Neon-backed production build: exit code `0`; lint/typecheck: pass.
- Status: **FIXED and deployed**.

### Responsive and Console Follow-up

- Desktop, tablet-sized, and 390px mobile checks covered home, shop, product, cart, language switch, mobile menu, and drawer state.
- Preview and Production browser checks showed no application console errors. Next.js `ERR_ABORTED` entries were prefetch cancellations during route transitions.
- Vercel Preview Deployment Protection blocked direct API calls with `401` before application code; this was recorded as environment protection, not an app failure.

### Final Follow-up Gate

| Gap | Result | Evidence |
| --- | --- | --- |
| Customer register/login/logout/session | PASS | Fixture API and session lifecycle results above |
| Customer account/profile/password/address/orders | PASS | Fixture persistence and cleanup evidence |
| Order creation/totals/idempotency/tracking | PASS | Database order/item evidence above |
| Admin product/category safe CRUD | PASS | Isolated fixture create/update/archive/cleanup |
| Admin banner CRUD | PASS | Isolated image fixture create/update/delete |
| Admin real-data safety | PASS | No real customer/order/product mutation |
| BUG-013 | BLOCKED | Business category target not defined in source data |
| BUG-014 | MITIGATED/BLOCKED | Provider absent; explicit 503 deployed |
| Missing-env build guard | FIXED | Build exit code 0 without `DATABASE_URL` |
| Production regression | PASS | Deployment `dpl_6uN4qoFK4DqxmorsfcitMwmeJrZ3` READY; core routes 200 |

## Final Follow-up Amendments

### BUG-014 status amendment

The provider remains unavailable because no Production provider configuration exists. This is not a fake AI PASS. Provider initialization/completion failures now return HTTP `503` with `AI service unavailable`; the live Production request verified `503`. Status: **MITIGATED in code, provider configuration BLOCKED**.

### BUG-016 - MEDIUM - Banner metadata-only update rejected

- Reproduction: isolated banner create followed by `PUT /api/admin/banners/[id]` with only `titleEn` and `isActive` returned HTTP `400` with `Image fields must be provided together`.
- Root cause: the update schema inherited the create schema's `fileSize` default, making an omitted image field appear partially supplied.
- Minimal fix: update validation now uses an optional non-default file-size validator.
- Verification: final Production fixture create/update/delete returned `200/200/200`.
- Status: **FIXED and deployed**.

Final Production deployment after all fixes: `dpl_95Xr1MK7to3viFsm2fkjmweJuqwL`, state `READY`.

## Deep Feature Integrity Appendix

### Master Feature Integrity Matrix

| Page/section | Feature/control | UI source | Data source and logic | API/DB | Dynamic/static | Evidence/result |
| --- | --- | --- | --- | --- | --- | --- |
| Home | Hero carousel, dots, CTA | `HeroCarousel.tsx` | Active `HERO` banners, ordered by `Banner.order`; client timer/dots | Server query `getHeroBanners()` -> `banners`/image route | Dynamic | DB-backed banners and image URLs rendered; CTA uses stored `ctaLink` |
| Home | Shop by Category | `CategoryCircles.tsx` | Active root categories ordered by `Category.order`, localized translations/images | `getMainCategories()` -> `categories`, `category`, `categoryTranslation`, `categoryImage` | Dynamic | Source query and admin-created category behavior verified; links use category slug |
| Home | Promo banners | `PromoBanners.tsx` | Active `PROMO` banners ordered by `Banner.order` | `getPromoBanners()` -> banners/image route | Dynamic | Banner create/update/delete fixture verified; content renders from DB |
| Home | Trending Now | `TrendingProducts.tsx` | Active, non-deleted products where `isFeatured=true`, ordered by `createdAt desc`, limited to 8 | `getFeaturedProducts()` -> products, translations, images, variants, reviews | Dynamic but not popularity-ranked | Proven DB source; title “Trending” is marketing copy, not sales/popularity ranking |
| Home | Service bar | `ServiceBar.tsx` | Translation messages and fixed service claims | None | Static by design | No backend transaction exists; “Cash on delivery” accurately describes current payment mode |
| Product card | Price, sale, low-stock, out-of-stock, rating | `ProductCard.tsx` | Props mapped from product query; discount/stock/rating computed in component/query | Product query -> product/variant/review records | Computed from DB data | Product IDs/slugs and API detail matched for tested records |
| Product card/detail | Add cart, wishlist | `ProductCard.tsx`, `ProductDetailClient.tsx` | Zustand persisted localStorage stores | No API call from these UI controls | Local-only | **BUG-017/018**: UI state is not the DB cart/wishlist API state |
| Shop/category | Search/filter/sort/page | shop/category controls and product query | Query parameters validated server-side and Prisma where/order clauses | `/api/products` or server query -> products/categories | Dynamic | Search, sort, pagination, price/filter combinations verified |
| Checkout | Order total/coupon/order submission | `CheckoutClient.tsx` | Local cart input; server recalculates product prices, stock, coupons, shipping, total in transaction | `POST /api/orders` -> orders/orderItems/variants/coupons | Dynamic | Fixture order proved DB persistence and arithmetic |
| Account | Profile/password/address/orders | account components | Session user and protected APIs | auth/profile/address/user-order APIs -> DB | Dynamic | Fixture lifecycle proved persistence and cleanup |
| Admin | Products/categories/banners/settings | admin client components | Protected admin APIs and Prisma writes | `/api/admin/*` -> DB | Dynamic | Safe fixture CRUD and storefront propagation tested where supported |
| Footer | WhatsApp contact | `Footer.tsx` | `StoreSettings.whatsappNumber` passed from page query | settings singleton -> rendered `wa.me` | Dynamic | Fixed to remove hardcoded number; regression pending final deployment |
| Footer | Instagram/Facebook | `Footer.tsx` | Literal generic domains | No DB/API | Static placeholder | **BUG-019**: not store account integrations |
| Footer | Shipping/returns links | `Footer.tsx` | Literal `/track-order` route | No shipping/returns content route | Static but semantically wrong | **BUG-020**: labels do not match destination content |

### Dynamic Content Audit

| Section | Expected dynamic? | Actual | Proven source | Result |
| --- | --- | --- | --- | --- |
| Hero | Yes | DB active banners | `getHeroBanners`, Banner rows, image endpoint | PASS |
| Shop by Category | Yes | DB active root categories | `getMainCategories`, Category relations/translations | PASS |
| Promo | Yes | DB active promo banners | `getPromoBanners`, Banner rows | PASS |
| Trending Now | Yes for featured catalog | Featured flag + created date, not popularity metric | `getFeaturedProducts`, Product.isFeatured | PASS with naming limitation |
| Product badges | Yes/computed | Sale from comparePrice, stock from variants, rating from approved reviews | Product/Variant/Review records | PASS |
| Service bar | No backend state required | Translation/static service claims | messages and component literals | Static by design |
| Cart header count | User-state dynamic | Local Zustand persisted count | `localStorage: amira-cart`, no DB API | BUG-017 |
| Wishlist count/list | User-state dynamic | Local Zustand persisted list | `localStorage: amira-wishlist`, no DB API | BUG-018 |

### Source-of-Truth Findings

- Product title/price/image/category/stock/rating: server product query -> Prisma Product, ProductTranslation, ProductImage, ProductVariant, Review -> UI. Proven for live product detail and featured cards.
- Hero/promo text and CTA: Banner rows -> server query -> UI. The image route uses the banner ID and was verified for real images.
- Category names/links: Category and CategoryTranslation rows -> `getMainCategories` -> UI slugs. New category behavior is structurally dynamic; the fixture category was created/read/deleted through admin APIs.
- Store WhatsApp: now sourced from StoreSettings. Prior hardcoded value was removed in the minimal fix.
- Cart/wishlist: UI source of truth is browser localStorage, while separate DB APIs exist but are not wired to these controls. This is a real integration inconsistency, not a smoke-test failure.
- Order price/stock/discount/total: server-side transaction is the authoritative source; client cart price is not trusted by order creation.

### Placeholder and Hardcoded Audit

| Location | Finding | Impact | Classification |
| --- | --- | --- | --- |
| `Footer.tsx` | `https://instagram.com` | Leaves to generic Instagram homepage, not store account | BUG-019, placeholder integration |
| `Footer.tsx` | `https://facebook.com` | Leaves to generic Facebook homepage, not store account | BUG-019, placeholder integration |
| `Footer.tsx` | Shipping/returns both `/track-order` | User reaches wrong semantic destination | BUG-020 |
| `PromoBanners.tsx` | Description selected by `ctaLink.includes('beauty')`, otherwise kids text | Arbitrary future promo banner can display unrelated copy | BUG-021, data/content logic risk |
| `ServiceBar.tsx` | Four service claims from translation messages | No transaction/source required for informational claims; COD is supported | Static by design |
| `ProductCard.tsx` | UI fallback first character when image missing | Explicit empty-image fallback, not fake data | Static fallback by design |
| `HeroCarousel.tsx` | Generic descriptive sentence beside banner data | Marketing fallback text, not a DB claim | Static by design, review copy if banners need custom descriptions |

### Admin -> Storefront Synchronization

| Change | Expected propagation | Evidence | Result |
| --- | --- | --- | --- |
| Product price/name update | Admin API -> product API/detail/card | Fixture price changed and public product endpoint reflected it | PASS |
| Product soft delete | Admin API -> public product availability | Fixture product disappeared from public detail/list | PASS |
| Product category reassignment | Admin API -> category/product relation | Fixture reassigned before cleanup; relation updated | PASS |
| Category create/update | Admin category tree -> category route/filter | Fixture category appeared in admin source and delete protection worked; full Home browser render after creation not executed | PARTIAL, dynamic source proven |
| Banner create/update/disable | Admin banner API -> Home active banners | Banner fixture create/update/delete passed after BUG-016 fix; storefront active/inactive visual propagation not re-run with a live fixture | PARTIAL |
| Settings WhatsApp | Settings singleton -> Footer contact | Code path now receives settings number; Production regression follows deployment | FIXED, verify deployment |

### Cross-Feature Matrix

| Flow | Proven chain | Result |
| --- | --- | --- |
| Home -> category -> products | DB categories -> slug route -> category descendant query -> product set | PASS for existing categories |
| Home -> featured card -> product | Featured DB rows -> ProductCard slug/id -> product detail query | PASS for tested cards |
| Product -> local cart -> checkout -> order | Product DB -> localStorage cart -> server order transaction -> DB order/items/stock | PASS for fixture order, with local cart integration limitation |
| Product -> local wishlist | Product DB -> localStorage only | BUG-018: no DB persistence |
| Admin product -> shop/detail/cart | Admin fixture update -> public product endpoint -> cart flow | PASS for price/name/public visibility; cart uses local snapshot |
| Language -> current route | Header pathname -> locale route | PASS after BUG-012 |
| Admin settings -> Footer contact | StoreSettings -> page -> Footer | FIXED; production verification required after latest deployment |

### Newly Registered Findings

#### BUG-017 - MEDIUM - Cart UI is not connected to cart API/DB

- Evidence: `ProductCard`, `ProductDetailClient`, `CartView`, and `CheckoutClient` use `useCartStore`; no `/api/cart` call exists in these UI mutation paths.
- Impact: cart persistence is browser-local only; login, new device, server-side cart reads, and admin/database cart state do not represent the visible cart.
- Status: OPEN. A full server-sync design is larger than a safe audit patch and needs an explicit product decision about guest/user cart merge semantics.

#### BUG-018 - MEDIUM - Wishlist UI is not connected to wishlist API/DB

- Evidence: Product controls and `WishlistView` use `useWishlistStore` persisted to `localStorage`; API routes exist but are not called by those controls.
- Impact: wishlist is not account-persistent or cross-device and can diverge from DB wishlist records.
- Status: OPEN. Requires a deliberate guest-to-user merge policy before implementation.

#### BUG-019 - LOW - Generic social destinations

- Evidence: Footer links point to `instagram.com` and `facebook.com`, not configured store accounts.
- Status: OPEN, production content/ownership decision required.

#### BUG-020 - MEDIUM - Shipping/returns semantic links

- Evidence: Footer labels “Shipping & Delivery” and “Returns & Exchanges” both navigate to `/track-order`; no dedicated content routes exist.
- Status: OPEN, content/route decision required. No fake policy page was created.

#### BUG-021 - LOW - Promo description heuristic

- Evidence: `PromoBanners.tsx` chooses beauty copy only when `ctaLink` contains `beauty`; every other CTA receives kids copy.
- Impact: future or existing non-beauty/non-kids promo banners can show incorrect descriptive text.
- Status: OPEN; banner schema has no description field, so the safe fix requires a content-model decision.

### Deep Audit Acceptance Status

| Criterion | Status |
| --- | --- |
| Home dynamic sources proven | PASS |
| Category source/relationships proven | PASS for source and existing routes |
| Featured/trending ranking semantics proven | PASS with naming limitation |
| Product card data identity proven | PASS for tested records |
| Cart UI -> DB integration | BLOCKED/OPEN BUG-017 |
| Wishlist UI -> DB integration | BLOCKED/OPEN BUG-018 |
| Customer/order E2E | PASS |
| Admin fixture CRUD | PASS with storefront propagation partials documented |
| AI unavailable state | PASS as 503, provider remains unavailable |
| Placeholder/social audit | OPEN BUG-019 |
| Shipping/returns semantic audit | OPEN BUG-020 |
| Final source-of-truth WhatsApp fix | FIXED, awaiting final deployment verification |
| No hidden errors/fake PASS | PASS |

Deep-audit verdict remains: **VERIFIED WITH DOCUMENTED LIMITATIONS**. The site is operational, but the local cart/wishlist stores and unresolved content integrations prevent a claim of fully integrated product integrity.

### Final Deep-Audit Amendment

- Home source tracing proved Hero, Promo, Categories, and Featured/“Trending” sections are database-backed. “Trending Now” is a featured-catalog list ordered by creation date, not a sales/popularity ranking; this is documented as a naming limitation, not a fake ranking claim.
- Product cards route by the same database product slug used by their source records; price, stock, sale, rating, and image values are computed from product query data.
- Cart and wishlist controls are localStorage-backed and do not call the existing cart/wishlist APIs. BUG-017 and BUG-018 remain open pending a deliberate guest/user synchronization policy.
- Generic Instagram/Facebook domains remain BUG-019; store account ownership/configuration is not present in source or environment.
- Shipping/returns footer labels remain BUG-020 because both point to order tracking and no policy content route exists.
- BUG-021 promo text heuristic was removed. Promo banners now show only their stored title/subtitle/CTA, avoiding an incorrect beauty/kids description for arbitrary CTA links. Local typecheck/lint/Neon-backed build passed.
- Footer WhatsApp is now sourced from `StoreSettings.whatsappNumber` and normalized to international `wa.me` format. Local typecheck/lint/build passed.
- The final Vercel deployment attempt for the WhatsApp normalization returned CLI `fetch failed` twice before creating a deployment. Production therefore remains on the prior READY deployment until Vercel accepts the pending source; no false deployment PASS is claimed.

## Production-Safe Integrity Closure Amendment

This amendment records the source changes made after the original audit. Earlier findings remain as historical evidence; the statuses below supersede them where the checked-in implementation changed.

### BUG-017 - Cart UI / database integration

- Status before: OPEN. The visible cart used only Zustand/localStorage while `/api/cart` was separate.
- Action: the cart store now hydrates from `/api/cart`, migrates an existing guest-only local cart into the existing guest cart once, sends add/update/remove mutations to the existing cart endpoints, and retains the server `CartItem.id` for precise updates and deletes.
- Integrity boundary: order creation remains authoritative for current product price, stock, coupon, shipping, and total. No client price trust was added.
- Login behavior: an authenticated account cart replaces stale browser-local state; no unrequested guest-to-user merge rule was invented. Guest records remain server-owned through the existing `guest_id` cookie.
- Evidence: `npm run typecheck` and `npm run lint` passed after the implementation. Browser/API matrix and production deployment verification remain required before claiming end-to-end production PASS.
- Status after: FIXED in source, production verification pending.

### BUG-018 - Wishlist UI / database integration

- Status before: OPEN. Product controls and the wishlist page used only localStorage.
- Action: wishlist hydration now reads `/api/wishlist`; guest local items are migrated once when the server wishlist is empty; add, toggle, and remove actions call the existing wishlist endpoints with optimistic rollback on failure.
- Login behavior: authenticated server state replaces browser-local state; no undocumented guest merge policy was added.
- Evidence: `npm run typecheck` and `npm run lint` passed after the implementation. Browser/API matrix and production deployment verification remain required before claiming end-to-end production PASS.
- Status after: FIXED in source, production verification pending.

### BUG-019 - Social destinations

- Status before: OPEN because generic Instagram/Facebook homepages were not store-owned accounts.
- Action: non-authoritative social links were removed. The footer now exposes only the configured StoreSettings WhatsApp destination and uses the shared international phone normalizer.
- Status after: RESOLVED safely by removing unverifiable destinations. No social account was invented.

### BUG-020 - Shipping/returns semantic content

- Status before: OPEN because shipping and returns labels pointed to `/track-order` without policy content.
- Action: the footer contains no fake shipping/returns links. The home service bar no longer claims free delivery or easy returns, and the AI prompt directs return questions to WhatsApp rather than promising a policy. Checkout and WhatsApp order messaging continue to request the customer address before shipping cost confirmation.
- Status after: RESOLVED as a safe content removal. A formal shipping or returns policy remains intentionally absent and must be supplied by the business before being published.

### Remaining verified blockers

- BUG-013 remains BLOCKED: the category tree has no authoritative jewelry or sunglasses destination, so the two incorrect product relationships were not guessed or changed.
- BUG-014 remains MITIGATED/BLOCKED: all inspected AI endpoints map provider-unavailable failures to HTTP 503; production provider configuration is still absent.
- Prisma migration history remains OPEN as a process gap. No schema change or arbitrary migration was created. Future schema changes should use reviewed, versioned Prisma migrations in deployment rather than an unreviewed production `db push`.

### Closure verification state

- Typecheck: PASS (`npm run typecheck`).
- Lint: PASS (`npm run lint`).
- Build: BLOCKED after the closure amendment by Next.js `Invariant: Expected workStore to be initialized` while prerendering `/ar/shop`, `/ar/admin/products`, `/ar/account/addresses`, and `/`.
- Production deployment: existing Vercel deployments are READY, but none was claimed for this working-tree closure. A read-only request to `https://amira-store-zeta.vercel.app/ar` returned HTTP 200; its HTML still contains the obsolete hardcoded WhatsApp number, so the new source fix is not production-verified.
- Real customer/order/product data: not intentionally mutated by these source changes.

## Dynamic Store Contact and Social Settings Amendment

- `StoreSettings` now includes nullable `instagramUrl` and `facebookUrl` fields in both SQLite and PostgreSQL schemas.
- The existing Admin Settings API and UI now save and reload `whatsappNumber`, `instagramUrl`, and `facebookUrl`.
- Instagram and Facebook accept only HTTP/HTTPS URLs. Empty values are stored as null and hidden from the footer; no generic or guessed account URL is rendered.
- WhatsApp uses the shared normalizer for local Egyptian numbers, `+20`, `0020`, spaced/dashed input, and already-international numbers. Invalid/empty values produce no `wa.me` link instead of a malformed destination.
- All localized footer instances consume these values from `StoreSettings`; no UI component contains a hardcoded social URL or phone number.
- Local schema push and PostgreSQL schema validation passed. Typecheck, lint, and changed-file diagnostics passed.
- Local Admin Settings E2E was not completed because the local SQLite database has no matching admin account for the configured seed password; no local settings were mutated by the failed attempt.
- Production schema update was not applied: Vercel does not export production secret values, so no production database connection was available. Production deployment was not attempted because the existing build still fails with Next.js `Expected workStore to be initialized` during prerendering.

## Final Build and Production Blocker Closure Amendment

- Build root cause: Next 16 route-parameter generation was invoked through the locale layout's `generateStaticParams()` while the application pages are DB-backed dynamic routes. The failure surfaced as `Invariant: Expected workStore to be initialized` across localized pages and generated fallback routes. A clean build after removing that static-params export and restoring the required root document shell passed.
- Minimal build changes: remove `generateStaticParams()` from `src/app/[locale]/layout.tsx`; mark the root redirect in `src/app/page.tsx` dynamic; provide the required root `html/body` shell in `src/app/layout.tsx`; pin Next to the proven `16.3.3` patch in `package.json` and `package-lock.json`.
- Verification: `npm run typecheck`, `npm run lint`, `git diff --check`, and `npm run build` all passed. The passing build generated 32 static pages and all application/API routes successfully.
- Production schema: not applied. `vercel env pull` replaces production secrets with `[SENSITIVE]`; `vercel env run` rejected the local token as invalid. No production database command ran.
- Deployment: not completed. `vercel deploy --prod --yes` returned `Not authorized`. No deployment ID or READY claim is recorded.
- Production settings verification: blocked because the live site is still the previous revision. The attempted live admin login returned `401`, and the admin settings endpoint returned `403`; no live settings were changed.
- Required operator action: authenticate the Vercel CLI with project deployment/database access, run `npx vercel env run --environment=production -- npx prisma db push --schema=prisma/schema.postgresql.prisma --skip-generate`, verify the two columns through a read-only production query, then deploy and execute the Admin Settings/storefront smoke matrix.