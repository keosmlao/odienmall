<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OdienMall — project notes

Lazada-style storefront (Next.js 16 App Router, TS, Tailwind v4) for **ODG**, built on
top of an existing production **PostgreSQL 11 ERP** (`db.odienmall.com` / db `odg`, 1850
tables). Primary UI language is **Lao**.

## Hard rule: ERP tables (schema `public`) are READ-ONLY
Never write/alter/drop anything in `public.*`. All ERP queries are SELECTs. App data
(orders) lives in a SEPARATE **`ecom`** schema — see below. Creating new objects there is
fine; touching `public.*` is not.

## Orders / checkout — `ecom` schema (writable, app-owned)
- `ecom.orders`, `ecom.order_items`, `ecom.reviews`. Created idempotently by
  `scripts/migrate-ecom.mjs` (`node --env-file=.env scripts/migrate-ecom.mjs`).
- Write path: `src/lib/orders.ts` (`createOrder` re-prices server-side from the ERP —
  never trusts client prices), server action `src/app/checkout/actions.ts`, pages
  `/checkout` and `/order/[orderNo]`. Guest checkout (name/phone/address).
- **Payment + shipping method** (`ecom.orders.payment_method` default `'cod'`,
  `shipping_method` default `'odien'`): checkout offers **COD / bank transfer** and
  **ໂອດ້ຽນຂົນສົ່ງ / ຂົນສົ່ງທັນໃຈ** via radios. Client-safe enums + Lao labels in
  `src/lib/payment-constants.ts` and `src/lib/shipping-constants.ts` (`toPaymentMethod` /
  `toShippingMethod` validate server-side in `createOrder` — never trust the client). On a
  `transfer` order the confirmation page shows the editable bank-transfer block (see Site
  settings) — **BCEL QR image** + bank/account + amount + order-no as reference. Both methods
  show on admin order detail / print / CSV.
- BCEL callback endpoint is `/callbackpos`. It verifies the `Signature` header against
  the exact raw request body using BCEL's RSA-2048 public key (SHA-256 + PKCS#1 v1.5)
  before parsing the payload. In live API mode it additionally calls `/checkonepayqr`
  and verifies the exact amount. When the API is unavailable, only this RSA-verified
  callback may advance payment; browser/PubNub events alone cannot mark an order paid.
  `/api/payments/onepay/callback` remains a server-to-server-check callback alternative
  for deployments configured with the live OnePay API.
- Live API mode accepts either `ONEPAY_USERNAME` + `ONEPAY_PASSWORD` (JWT fetched and
  cached through `/authen`) or a directly supplied `ONEPAY_JWT`. With live mode enabled,
  the payment modal polls `/checkonepayqr` every 2 seconds for up to 3 minutes as a fallback
  when callback delivery is delayed. Both callback and polling verify the BCEL amount
  against `ecom.onepay_payments.amount` before marking the order paid.
- **OnePay test mode** — manager-controlled at `/admin/settings`, stored in singleton
  `ecom.onepay_config`. When enabled, newly generated QR codes use `test_amount`
  (default **1 LAK**) while the real order subtotal/total remains unchanged. Existing unpaid
  QR records are regenerated automatically when their stored amount differs from the current
  runtime amount. The UI labels the override as TEST. Test payments still require a real
  BCEL callback or successful `/checkonepayqr` response; test mode never fakes `paid`.
- **Delivery fee** (`ecom.orders.shipping_fee`): `computeShippingFee(method, subtotal)` in
  `shipping-constants.ts` (per-method `SHIPPING_FEE`, optional `FREE_SHIPPING_OVER`).
  Current business rule: both offered shipping methods have a fee of **0 LAK**.
  `createOrder` re-computes it server-side. `subtotal` = items only; **grand total =
  subtotal + shipping_fee** — used in the checkout summary, order/QR amount (the QR shows the
  TOTAL, not just items), admin detail/print/CSV, and the ERP payload / SML `transport_value`.
- **SML online cash-sale (CAE), flag 34 → 44** (`src/lib/sml-sale-order.ts`) — the ERP `odg`
  is **SML** (`ic_`/`ar_` tables). This mirrors the existing CAE flow
  (ໃບຂາຍສິນຄ້າ-ເງິນສົດ-ອອນລາຍ): the app writes the order DIRECTLY into `public.ic_trans`,
  there is **no queue / no "wait for SML to pull"**.
  - **On order placement** (`createOrder`, best-effort, never blocks checkout):
    `createSmlSaleOrder(orderNo)` INSERTs `ic_trans` + `ic_trans_detail` with
    **`trans_flag = 34`** (ໃບສັ່ງຊື້), `doc_no` = **`CAE@YY######`** (running, generated from
    `max(ic_trans.doc_no)`), `branch_code` **99**, `wh_code='0000'`/`shelf_code='000000'`
    (no warehouse yet), **no VAT** (`vat_rate=0`), `remark_5='web'`, currency **02** with the
    live `erp_currency.exchange_rate_present` (base columns = LAK×rate, `_2` columns = raw LAK),
    cost from `ic_inventory.average_cost`, PK from the `*_roworder_seq`. Stores the CAE doc on
    **`ecom.orders.sml_doc_no`**. Idempotent (skips if `sml_doc_no` already set).
  - **On admin ອອກບິນ** (`saveOrderWarehouse` → `confirmSmlSaleOrder`, atomic): UPDATEs the
    same rows **flag 34 → 44** (ບິນສົດ), stamps the chosen **real `wh_code`/`shelf_code`** onto
    each line (from `ecom.order_item_allocations`, replacing `0000`/`000000`), and INSERTs
    `cb_trans` + `cb_trans_detail` (money received, BCEL **transfer** — `tranfer_amount`,
    `SML_CB_TRANSFER_ACCOUNT`/`_BANK`, no cash). The ecom order advances to `confirmed` only on
    a successful commit. NOTE: cancelling a confirmed order does not auto-reverse the SML
    bill — handle credit notes ERP-side.
- **Warehouse allocation before ອອກບິນ** — after an order is `paid`, admin order detail reads
  current sellable stock via the `sml_ic_function_stock_balance_warehouse_location` SRF joined
  to `ic_warehouse`/`ic_shelf`; staff pick ONE warehouse (best shelf auto-chosen per line).
  Selections live in writable `ecom.order_item_allocations`; `confirmSmlSaleOrder` reads them to
  set each `ic_trans_detail` line's warehouse/shelf at flag-44 time.
- **GATING / safety**: both writers throw unless **`SML_DIRECT_WRITE=1`**; default (gate off) =
  the app only sets `ecom.orders.status`, no `public.*` write. ⚠️ NOT production-verified —
  `ic_trans` fires triggers, but the CAE flow is structured to AVOID the dangerous ones —
  it never alters production triggers:
  - `vatpassthai` (force VAT 7%) fires only `WHEN vat_type=0 AND branch_code='05' AND
    trans_flag IN (2,4,6,8,12)`. Our rows are `vat_type=2`, branch `99`, flag `34/44` → it
    NEVER fires. (CAE bills carry `vat_rate=10` with `total_value==total_amount`, i.e. NO VAT
    added to the price, exactly like the real `CAE26010001` template.)
  - The flag-44 INSERT triggers (`check_side_isnull`, `create_odg_chatbot_line_noti`,
    `pp_send`) fire on INSERT of flag 44 only. We INSERT flag 34 then UPDATE 34→44, so these
    never fire either — no side/dept requirement, no LINE noti, no pp_send for web orders.
  The app sandbox BLOCKS all `public.*` writes, so the SML team should still validate on a
  TEST/copy DB first:
  `node --env-file=.env scripts/sml-cae-test.mjs` runs the full **34 → 44 + cb_trans** flow and
  always **ROLLS BACK** (nothing persists). Config: `SML_CAE_BRANCH` (99), `SML_CAE_DOC_FORMAT`
  (CAE), `SML_CAE_CURRENCY` (02), reusing `SML_WALKIN_CUST`/`SML_CASHIER_CODE`/
  `SML_CB_TRANSFER_ACCOUNT`/`SML_CB_TRANSFER_BANK`.
- **Legacy (superseded, still on disk, unused):** the `ecom.erp_cash_bill_queue` hand-off
  (`src/lib/erp-export.ts`) and the flag-44-insert `src/lib/sml-cash-sale.ts`
  (`createSmlCashSale`, validated by `scripts/sml-test-insert.mjs`). Replaced by the flag
  34→44 flow above — kept only for reference.

## Admin order management (`/admin`)
- Login = **`odg_employee`** (ERP, READ-ONLY): username `employee_code`, password verified
  format-agnostically (plaintext/md5/sha/bcrypt), ACTIVE only — `authenticateAdmin` in
  `src/lib/auth.ts`. Optional `ADMIN_PASSCODE` env = break-glass master login (manager).
  Separate signed cookie `om_admin` stores `{code,name,role}`; `isAdmin()` = valid token,
  `getAdminSession()` = identity (shown in `AdminNav`). Login form takes username+password
  (`/admin/login`). Every admin page + action re-checks `isAdmin()`. Login is IP
  rate-limited (8 fails → 15-min lockout, `src/lib/rate-limit.ts` — in-memory, per-process).
  `SESSION_SECRET` is REQUIRED in production: `session.ts` THROWS rather than sign/verify
  with a missing or default secret (a known secret = forgeable admin cookie).
- **Roles** (ERP `app_role` is unset, so configured via env in `auth.ts`):
  `ADMIN_EMPLOYEE_CODES` = access allowlist (EMPTY ⇒ any ACTIVE employee may sign in —
  unchanged default; SET ⇒ only listed codes + break-glass). `ADMIN_MANAGER_CODES` =
  manager set (EMPTY ⇒ every admin is a manager — non-breaking; SET ⇒ only listed codes
  are managers, the rest are `staff`). `isManager()` gates money/config — affiliates,
  rates, payouts, `/admin/report`, `/admin/settings` (pages redirect staff to `/admin`,
  actions return DENIED); `AdminNav` hides those links for staff. Legacy tokens (no role)
  and break-glass count as manager. Staff keep orders + products + reviews.
- Pages: `/admin/login`, `/admin` (order list + stats + status filter + **search/date
  filter + CSV export**), `/admin/orders/[orderNo]` (detail + status control + **print**),
  `/admin/orders/[orderNo]/print` (letterhead invoice; admin chrome `print:hidden`).
- Data: `getAllOrders` (status + search + date-range filters), `getOrderStats`,
  `updateOrderStatus`, `getSalesReport` in `src/lib/orders.ts` (writes `ecom.orders.status`
  only). CSV at `/admin/orders/export/route.ts` (UTF-8 BOM for Excel; same filters via query
  string; `isAdmin`-gated). Sales report at `/admin/report` (14-day revenue, top products,
  status breakdown; revenue excludes cancelled). Status enum + Lao labels live in
  `src/lib/order-constants.ts` (NO db/server-only imports — safe for client components;
  `orders.ts` re-exports them for server use).

## Audit log (`/admin/audit`, manager-only) — `ecom` schema
- Records who changed what in the admin. Table `ecom.audit_log` (`actor_code`, `actor_name`,
  `action` like `order.status` / `product.bulk.hide`, `entity`, `detail`, `created_at`).
- `src/lib/audit.ts` (server-only): `logAudit({action, entity, detail})` — BEST-EFFORT
  (wrapped in try/catch; pulls the actor from `getAdminSession` if not passed; NEVER throws,
  so it can't break the action it logs). `getAuditLog` (paginated; search + action-prefix
  filter), `getAuditActions`. Call `logAudit` from admin actions AFTER the mutation succeeds.
- Instrumented: order status, product flags/description/bulk, review hide/show/delete,
  affiliate status/payout/rate(+delete), settings dev-notice/announcement.
- Page `/admin/audit` + `AuditFilters`. AdminNav "ບັນທຶກ" link (manager-only).

## Admin customers (`/admin/customers`, any admin)
- View of storefront shoppers who placed ≥1 order (registered only — `ecom.orders` with a
  non-null `customer_code`; guests excluded). Profile from READ-ONLY `ar_customer`, spend
  totals from `ecom.orders`.
- `src/lib/customers-admin.ts` (server-only): `getAdminCustomers` (paginated; search by
  code/name/phone; per-customer order count, total spent excl. cancelled, last-order date —
  grouped by `customer_code`, left-joined to `ar_customer`). Detail page reuses
  `getCustomerProfile` (auth.ts) + `getOrdersByCustomer` (orders.ts), no new query.
- Pages: `/admin/customers` (list + `CustomerSearch`), `/admin/customers/[code]` (profile +
  spend + order history linking to `/admin/orders/[orderNo]`). AdminNav "ລູກຄ້າ" link.

## Affiliate program (ນາຍໜ້າ) — `ecom` schema
- **Who**: logged-in customers self-apply (`/affiliate`, status `pending`), admin approves
  to `active`. Tables: `ecom.affiliates` (1:1 with `ar_customer` via `customer_code`,
  unique referral `code`), `ecom.commission_rates`, `ecom.commissions`, `ecom.payouts`,
  `ecom.affiliate_clicks`; plus `ecom.orders.affiliate_id` (added by migration). All in the
  app-owned `ecom` schema — `public.*` stays READ-ONLY (read only for category/product
  names + per-line `item_category`).
- **Attribution**: `/r/[code]` route handler (`src/app/r/[code]/route.ts`) sets the
  `om_ref` cookie (30-day, httpOnly, last-click) for an *active* affiliate, logs a click,
  redirects to a validated internal path (`?to=/product/X`). At checkout
  (`checkout/actions.ts`) the cookie is read server-side and passed to `createOrder`, which
  resolves+validates it (`resolveActiveAffiliate`) and stamps `affiliate_id` (no
  self-referral). Never trusted from the client.
- **Commission**: earned when an order hits `completed`, voided (if still unpaid) when it
  leaves `completed` — both fired inside `updateOrderStatus`. Rate per line =
  product override → category override → default (`ecom.commission_rates`, seeded 5%).
- **Code**: all data access in `src/lib/affiliates.ts` (server-only); status/label enums in
  `src/lib/affiliate-constants.ts` (NO server/db imports — client-safe, mirrors
  `order-constants.ts`). Customer UI `/affiliate` (apply + dashboard + link builder).
  Admin `/admin/affiliates` (list+approve/suspend), `/[code]` (ledger + mark-paid payout),
  `/rates` (manage %). Manager-only — every page + action re-checks `isManager()`.

## Site settings (`/admin/settings`, manager-only) — `ecom` schema
Two singleton settings, both edited at `/admin/settings` (page redirects staff;
`actions.ts` re-checks `isManager()`). Data access `src/lib/settings.ts` (server-only;
both getters error-safe — OFF default if the table is missing, so the storefront never
500s).
- **Dev-notice modal** — warning modal on the home page on EVERY visit while under
  development. Table `ecom.dev_notice` (singleton `id = 1`: `enabled`, `title`, `message`,
  …). Home page (`(shop)/page.tsx`) renders `components/DevNoticeModal.tsx` (client;
  dismissible per visit, no "don't show again") only when `enabled`. Form `DevNoticeForm.tsx`,
  `saveDevNotice` revalidates `/`.
- **Announcement bar** — thin persistent notice across the WHOLE storefront (promo /
  shipping notice). Table `ecom.announcement` (singleton `id = 1`: `enabled`, `message`,
  `link`, …). Shop layout (`(shop)/layout.tsx`, now `async`) fetches `getAnnouncement` and
  renders `components/AnnouncementBar.tsx` (client; optional internal `link`, dismiss-per-view)
  above the header when `enabled`. Form `AnnouncementForm.tsx`, `saveAnnouncement` validates
  the link is internal (`/…`) and `revalidatePath("/", "layout")`.
- **Bank-transfer details** — shown on a `transfer` order's confirmation page. Table
  `ecom.bank_transfer` (singleton `id = 1`: `bank_name`, `account_name`, `account_no`,
  `note`, `qr_url`). `getBankTransfer`/`setBankTransfer`/`setBankQr` + `bankConfigured`
  (displays when a QR OR bank+account is set). Form `BankTransferForm.tsx` (text +
  **QR image upload** → `public/uploads/bank/`, gitignored — `uploadBankQr`/`removeBankQr`
  mirror the product-image upload; move to object storage before serverless deploy).

## Images (configurable)
`src/components/ProductImage.tsx` loads a real image if an `imageUrl` prop is given
(app overlay — see below), else `NEXT_PUBLIC_PRODUCT_IMAGE_PATTERN` /
`NEXT_PUBLIC_PRODUCT_IMAGE_BASE` (keyed by product code), else a placeholder. The ERP
has no product images, so the overlay gallery is the real image source.

## Admin product management (`/admin/products`) — `ecom` schema
- **Purpose**: app-owned overlay layered over the READ-ONLY ERP catalog — staff add
  images, hide items, and mark them featured WITHOUT ever touching `public.ic_inventory`.
- **Tables** (created by `scripts/migrate-ecom.mjs`): `ecom.product_overlays`
  (`product_code` PK, `image_url` fallback, `is_hidden`, `is_featured`, `description`
  override, `updated_by`) and `ecom.product_images` (gallery: `product_code`, `url`,
  `sort_order`; primary = lowest `(sort_order,id)`). Both keyed by ERP `ic_inventory.code`.
- **Uploads**: multi-file upload server action writes to `public/uploads/products/<code>/`
  (gitignored) and inserts gallery rows; also add-by-URL, delete, set-primary. NOTE: files
  on local/self-hosted FS persist; on ephemeral/serverless FS they do NOT — move to object
  storage before deploying there.
- **Storefront wiring** (`src/lib/catalog.ts`): `WEB_ITEM` excludes `is_hidden` everywhere
  (correlated `NOT EXISTS`, like the stock filter); `PRODUCT_SELECT` resolves
  `imageUrl` = primary gallery image → overlay `image_url`, and `description` = overlay
  `description` → ERP `i.description`; `getFeaturedProducts` floats `is_featured` to the top
  of the home "ສິນຄ້າແນະນຳ" rail; `getProductImageList(code)` feeds
  `components/ProductGallery.tsx` (main + thumbnails) on the product page. Hidden items 404
  on their detail page and drop from the sitemap.
- **Code**: data access `src/lib/products-admin.ts` (server-only; list/stats/get + gallery
  + flag/description setters; `bulkSetFlag` unnest-upsert; `LOW_STOCK_MAX = 5`). Pages
  `/admin/products` (list rendered by client `ProductBulkList` — row checkboxes + sticky
  **bulk bar** hide/show/feature/unfeature; stats incl. a clickable **low-stock** card +
  inline star/eye toggles + `ProductFilters`: search, group, category, brand, "include
  out-of-stock" and "low-stock ≤5" toggles — list hides out-of-stock by DEFAULT like the
  storefront), `/admin/products/[code]` (read-only ERP info + gallery manager +
  **description override** + flags). Server actions `src/app/admin/products/actions.ts`
  (every one re-checks `isAdmin()`; `bulkUpdateProducts` for the bulk bar; writes hit ONLY
  `ecom.*` + `public/uploads`). AdminNav has a "ສິນຄ້າ" link.

## Login / customer accounts (built)
- Auth against `ar_customer` by code / telephone / sms_phonenumber / email.
- `src/lib/password.ts` `verifyPassword` is FORMAT-AGNOSTIC: detects bcrypt / MD5 /
  SHA-1 / SHA-256 / plaintext per-account. If the ERP uses a bespoke scheme, add it
  there (login will reject until then — get a real account's hash format to confirm).
- `src/lib/session.ts` stateless HMAC cookie (`om_session`, signed with `SESSION_SECRET`,
  30d). `src/lib/auth.ts` wires cookies (`getSession`) + the `ar_customer` query. NO DB
  writes for sessions.
- Pages/actions: `/login` (+ `login`/`logout` actions), `/account` (profile + order
  history from `ecom.orders`). Checkout prefills from session and stamps
  `customer_code` server-side (never trusted from client).
- Pure modules (`password.ts`, `session.ts`) are unit-tested; verifier covers all
  common hash formats.
- CONFIRMED WORKING with a real account: a logged-in customer placed an order
  (`ecom.orders` row with non-null `customer_code`), so the ERP's password format is
  handled by the format-agnostic verifier.
- Order status timeline: `components/OrderTimeline.tsx` (pending→confirmed→shipped→
  completed + cancelled) on the customer order page; status driven by admin updates.

## Data mapping (the only ERP tables used, all in schema `public`)
- `ic_inventory` — product master. Web items: **`is_eordershow = 1`** (~202 items).
  - name: `name_1` (Lao) → fallback `name_2` / `name_eng_1` (Thai). stock: `balance_qty`.
  - flags: `is_new_item`, `item_promote`. joins: `item_category`→`ic_category.code`,
    `item_brand`→`ic_brand.code`.
- `ic_category` — categories. Web: `onweb = 1`. name `name_1`.
- `ic_brand` — brands. Web: `onweb = 1`. logo filename in `url_logo` (no public base URL yet).
- **Retail price** = `ic_inventory_barcode.price` (POS price, LAK), lowest positive value
  per item. Verified realistic (e.g. fridge 25,990,000 ₭). ~130/202 items have it; the
  rest show "ສອບຖາມລາຄາ" (price null). See `PRICE_LATERAL` in `src/lib/catalog.ts`.
  - T use `ic_inventory_price` for display — it holds wholesale/cost tiers that look
    ~1000× too low for appliances. (Kept here only as a documented non-source.)

## Open business decisions (ask user before assuming)
- The 72 items with no POS price show "ສອບຖາມລາຄາ". User may prefer to hide them instead.
- Product **images**: none exist in the ERP (`erp_images`/`ic_inventory_pictures` empty).
  Placeholders used (`src/components/ProductImage.tsx`).
- v1 scope: catalog + browser cart only. No checkout, no login.

## Reviews & ratings
`ecom.reviews` (one per customer per product, upsert; `is_hidden` flag added by migration).
`src/lib/reviews.ts` (`getProductReviews`, `createReview`). Login-gated submit via
`src/app/product/[code]/review-actions.ts`. `getProductByCode`/`getProducts` expose
`rating`+`reviewCount` (lateral on `ecom.reviews`). UI: `StarRating` (display),
`ReviewForm` (client), `ProductReviews` (detail section); stars also on `ProductCard`.
**Hidden reviews drop out everywhere on the storefront** — both the rating/`reviewCount`
lateral in `catalog.ts` (`and not rv.is_hidden`) and the `getProductReviews` list exclude
them.
- **Moderation** (`/admin/reviews`, any admin) — `src/lib/reviews-admin.ts` (server-only):
  `getAdminReviews` (paginated; search + rating + visibility filters; joins ERP name),
  `getAdminReviewStats`, `setReviewHidden`, `deleteReview`. Page + `ReviewFilters` +
  `ReviewRowControls` (hide/show, delete) + `actions.ts` (`isAdmin()`-gated; revalidates
  the affected `/product/[code]` + `/`). AdminNav has a "ຣີວິວ" link.

## Listing filters
`/products`, `/category/[code]`, `/search` support filters via query params, handled in
`getProducts`: `brand`, `group` (group_main, e.g. '11'), `instock=1`, `pmin`, `pmax`
(price uses `PRICE_SUBQUERY` = min positive `ic_inventory_barcode.price`, matching
display). `FilterSidebar.tsx` (client) drives them; `ProductListing` lays out
sidebar+grid and preserves all params across sort/pagination. `/products` shows a
"ກຸ່ມສິນຄ້າ" group facet from `getGroupMenu()` (the 4 web group_mains 11–14, only those
with stock). Brand facet: `getCategoryBrands(categoryCode)` (category) / `getWebBrands`
(/products). PERF: `getProducts` fires its count + page queries in parallel (one
ERP round-trip, not two); `getGroupMenu` is wrapped in React `cache()` so the nav +
group filter share a single per-request DB call.

## SEO
`src/app/sitemap.ts` (dynamic; home + products + brands + every web category/brand/product,
~241 urls) and `src/app/robots.ts` (disallow /admin /account /checkout /cart). Base URL =
`SITE_URL` in `src/lib/config.ts` (`NEXT_PUBLIC_SITE_URL`, default https://odienmall.com).
Root layout sets `metadataBase` + title template `%s — OdienMall` + OpenGraph; product/
category/brand pages have `generateMetadata` (title, description, canonical).
JSON-LD via `components/JsonLd.tsx`: product pages emit Product (offer/price LAK/
availability/aggregateRating/brand) + BreadcrumbList; homepage emits Organization +
WebSite (SearchAction).

## Route groups & layouts
- Root `app/layout.tsx` is minimal (`<html><body>` + fonts + metadata only).
- `app/(shop)/` — all storefront routes (home, products, category, brand(s), product,
  search, cart, checkout, order, login, account, wishlist) under `(shop)/layout.tsx`
  which renders the storefront chrome (Header/CategoryBar/Footer/MobileNav). Route group →
  URLs unchanged.
- `app/admin/` — its OWN `layout.tsx`: bare centered wrapper for the login page, else an
  admin shell (`components/admin/AdminNav.tsx` sidebar + mobile top bar, dark slate, active
  states, logout). NO storefront chrome. Logo = `/odm.png`.
- Brand logo `public/odm.png` is used in storefront Header/Footer, admin nav, favicon, og:image.
  Footer contact: +856 20 5992 9992 · Ban Khua Luang, Chanthabouly, Vientiane.

## Layout
- `src/lib/db.ts` pooled pg client (env `DATABASE_URL`, in `.env`, gitignored).
- `src/lib/catalog.ts` all read queries · `src/lib/cart-context.tsx` cart and
  `src/lib/wishlist.ts` favourites — both via `useSyncExternalStore` + localStorage
  (no provider, cross-tab). Wishlist: `WishlistButton` (heart) on cards + detail, page
  at `/wishlist`, counts in header + mobile nav. Recently-viewed: `src/lib/recently-viewed.ts`
  (`recordView`, cap 12), `TrackView` records on the product page, `RecentlyViewed` rail
  on home + product detail. Listing sort includes `rating` ("top rated", `rt.rating desc`).
- Pages: `/`, `/products`, `/category/[code]`, `/brand/[code]`, `/brands`,
  `/product/[code]`, `/search`, `/cart`.
