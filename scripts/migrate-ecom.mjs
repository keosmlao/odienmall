// Creates the ISOLATED `ecom` schema for storefront orders.
// Safe & idempotent: only CREATE ... IF NOT EXISTS inside the new `ecom` schema.
// It never reads, alters, or drops any existing ERP table.
//   run:  node --env-file=.env scripts/migrate-ecom.mjs
import pg from "pg";

const DDL = `
create schema if not exists ecom;

create table if not exists ecom.orders (
  id            bigint generated always as identity primary key,
  order_no      text        not null unique,
  customer_code text,
  customer_name text        not null,
  phone         text        not null,
  address       text,
  note          text,
  subtotal      numeric(18,2) not null default 0,
  status        text        not null default 'pending',
  created_at    timestamptz not null default now()
);

create table if not exists ecom.order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint      not null references ecom.orders(id) on delete cascade,
  product_code text        not null,
  product_name text        not null,
  unit         text,
  unit_price   numeric(18,2),
  qty          integer     not null check (qty > 0),
  line_total   numeric(18,2) not null
);

create index if not exists order_items_order_id_idx on ecom.order_items(order_id);
create index if not exists orders_created_at_idx     on ecom.orders(created_at desc);

-- Customers created by admin/affiliate while placing an assisted order.
-- Kept app-side because public.ar_customer is ERP-owned and read-only.
create table if not exists ecom.assisted_customers (
  id         bigint generated always as identity primary key,
  name       text        not null,
  phone      text        not null,
  email      text,
  address    text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assisted_customers_phone_idx
  on ecom.assisted_customers(phone);
create index if not exists assisted_customers_name_idx
  on ecom.assisted_customers(lower(name));

create table if not exists ecom.reviews (
  id            bigint generated always as identity primary key,
  product_code  text        not null,
  customer_code text        not null,
  customer_name text        not null,
  rating        smallint    not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  unique (product_code, customer_code)
);

create index if not exists reviews_product_idx on ecom.reviews(product_code);

-- App-owned brand logo override. ERP ic_brand remains read-only.
create table if not exists ecom.brand_overlays (
  brand_code text primary key,
  logo_url   text,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Homepage promotional banner slider. All content is app-owned and editable
-- from /admin/banners; no ERP table is touched.
create table if not exists ecom.home_banners (
  id              bigint      generated always as identity primary key,
  enabled         boolean     not null default true,
  eyebrow         text        not null default '',
  title           text        not null,
  description     text        not null default '',
  button_text     text        not null default 'ເບິ່ງສິນຄ້າ',
  link            text        not null default '/products',
  image_url       text,
  background_from text        not null default '#ff5f20',
  background_to   text        not null default '#ffb21c',
  sort_order      int         not null default 0,
  updated_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists home_banners_order_idx
  on ecom.home_banners(enabled desc, sort_order, id);
insert into ecom.home_banners
  (enabled,eyebrow,title,description,button_text,link,
   background_from,background_to,sort_order)
select *
  from (values
    (true,'ODIENMALL · OFFICIAL STORE','ເຄື່ອງໃຊ້ໄຟຟ້າຄຸນນະພາບ',
     'ເລືອກຊື້ສິນຄ້າຈາກ ODG ພ້ອມຈັດສົ່ງທົ່ວປະເທດລາວ',
     'ຊ໊ອບດຽວນີ້','/products','#ff5f20','#ffb21c',0),
    (true,'SMART HOME','ສະດວກສະບາຍສຳລັບທຸກຄອບຄົວ',
     'ອັບເກຣດເຮືອນຂອງທ່ານດ້ວຍສິນຄ້າ Smart Home ແລະເຄື່ອງໃຊ້ຮຸ່ນໃໝ່',
     'ເບິ່ງສິນຄ້າ','/brand/SMART%20HOME','#5d2eea','#cf5cff',1),
    (true,'BRANDS YOU LOVE','ແບຣນດັງ ລາຄາດີ',
     'Samsung, Hitachi, Midea, Sharp, LG ແລະອີກຫຼາຍແບຣນໃຫ້ເລືອກ',
     'ເບິ່ງທຸກແບຣນ','/brands','#0067c8','#22b8cf',2)
  ) as seed(enabled,eyebrow,title,description,button_text,link,
            background_from,background_to,sort_order)
 where not exists (select 1 from ecom.home_banners);

-- ── Affiliate program (all app-owned, schema ecom only) ──────────────────────
create table if not exists ecom.affiliates (
  id            bigint generated always as identity primary key,
  code          text        not null unique,          -- referral code (share link)
  customer_code text        not null unique,           -- ties to public.ar_customer
  name          text        not null,
  phone         text,
  status        text        not null default 'pending', -- pending|active|suspended
  created_at    timestamptz not null default now(),
  approved_at   timestamptz
);
alter table ecom.affiliates add column if not exists email text;
alter table ecom.affiliates add column if not exists email_verified_at timestamptz;
alter table ecom.affiliates add column if not exists bank_code text;
alter table ecom.affiliates add column if not exists bank_name text;
alter table ecom.affiliates add column if not exists account_name text;
alter table ecom.affiliates add column if not exists account_no text;
create unique index if not exists affiliates_verified_email_uniq
  on ecom.affiliates(lower(email))
  where email_verified_at is not null and email is not null;

-- Short-lived email OTP used before an affiliate application is created.
-- The code is HMAC-hashed; bank details are held only until successful verify.
create table if not exists ecom.affiliate_email_verifications (
  customer_code text primary key,
  email         text        not null,
  code_hash     text        not null,
  bank_code     text        not null,
  bank_name     text        not null,
  account_name  text        not null,
  account_no    text        not null,
  attempts      smallint    not null default 0,
  sent_at       timestamptz not null default now(),
  expires_at    timestamptz not null
);

create table if not exists ecom.commission_rates (
  id         bigint generated always as identity primary key,
  scope      text          not null,        -- 'default' | 'category' | 'product'
  ref_key    text,                          -- category/product code; null for default
  rate_pct   numeric(6,3)  not null,
  updated_at timestamptz   not null default now()
);
create unique index if not exists comm_rate_default_uniq on ecom.commission_rates (scope) where scope = 'default';
create unique index if not exists comm_rate_key_uniq     on ecom.commission_rates (scope, ref_key) where ref_key is not null;
-- seed a single default rate (5%) once; admin changes it later
insert into ecom.commission_rates (scope, ref_key, rate_pct)
  select 'default', null, 5
  where not exists (select 1 from ecom.commission_rates where scope = 'default');

create table if not exists ecom.payouts (
  id           bigint generated always as identity primary key,
  affiliate_id bigint        not null references ecom.affiliates(id),
  amount       numeric(18,2) not null,
  note         text,
  created_at   timestamptz   not null default now()
);

create table if not exists ecom.commissions (
  id           bigint        generated always as identity primary key,
  order_id     bigint        unique references ecom.orders(id) on delete cascade,
  order_no     text,                          -- current OnePay temp order_no
  affiliate_id bigint        not null references ecom.affiliates(id),
  base_amount  numeric(18,2) not null default 0,  -- order subtotal at earn time
  amount       numeric(18,2) not null default 0,  -- computed commission
  status       text          not null default 'earned', -- earned|paid
  created_at   timestamptz   not null default now(),
  paid_at      timestamptz,
  payout_id    bigint        references ecom.payouts(id)
);
create index if not exists commissions_aff_idx on ecom.commissions(affiliate_id);
alter table ecom.commissions add column if not exists order_no text;
alter table ecom.commissions alter column order_id drop not null;
create unique index if not exists commissions_order_no_uniq
  on ecom.commissions(order_no) where order_no is not null;

create table if not exists ecom.affiliate_clicks (
  id           bigint      generated always as identity primary key,
  affiliate_id bigint      not null references ecom.affiliates(id),
  path         text,
  created_at   timestamptz not null default now()
);
create index if not exists aff_clicks_idx on ecom.affiliate_clicks(affiliate_id);

-- attribution column on the existing orders table (ecom-owned, safe to alter)
alter table ecom.orders add column if not exists affiliate_id bigint references ecom.affiliates(id);

-- ── Product overlays (app-owned data layered over the READ-ONLY ERP catalog) ──
-- Keyed by ERP ic_inventory.code. Lets admin add an image, hide an item from the
-- shop, or mark it featured — WITHOUT ever touching public.ic_inventory.
create table if not exists ecom.product_overlays (
  product_code text        primary key,         -- ERP ic_inventory.code
  image_url    text,                            -- overlay image (ERP has none)
  is_hidden    boolean     not null default false, -- hide from storefront
  is_featured  boolean     not null default false, -- float to "ສິນຄ້າແນະນຳ"
  updated_at   timestamptz not null default now(),
  updated_by   text                             -- employee_code who last edited
);
create index if not exists product_overlays_featured_idx on ecom.product_overlays(is_featured) where is_featured;
create index if not exists product_overlays_hidden_idx   on ecom.product_overlays(is_hidden)   where is_hidden;

-- Product image gallery (multiple images per product, ordered). Files live under
-- public/uploads/products/<code>/; this table holds their URLs. The primary
-- image (thumbnail / card) is the lowest (sort_order, id).
create table if not exists ecom.product_images (
  id           bigint      generated always as identity primary key,
  product_code text        not null,
  url          text        not null,
  sort_order   int         not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists product_images_code_idx on ecom.product_images(product_code, sort_order, id);

-- ── Site settings: the "dev notice" warning modal (singleton row id = 1) ──────
-- Shown on the home page on every visit while the site is under development.
-- Admin toggles it on/off and edits the text at /admin/settings.
create table if not exists ecom.dev_notice (
  id         smallint    primary key default 1 check (id = 1),
  enabled    boolean     not null default false,
  title      text        not null default 'ເວັບໄຊຢູ່ໃນລະຫວ່າງການພັດທະນາ',
  message    text        not null default 'ຂະນະນີ້ເວັບໄຊກຳລັງຢູ່ໃນລະຫວ່າງການພັດທະນາ — ຂໍ້ມູນສິນຄ້າ ແລະ ລາຄາ ອາດຍັງບໍ່ສົມບູນ ຫຼື ປ່ຽນແປງໄດ້.',
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into ecom.dev_notice (id, enabled) values (1, false) on conflict (id) do nothing;

-- ── Reviews moderation: app-owned hide flag on the existing reviews table ─────
alter table ecom.reviews add column if not exists is_hidden boolean not null default false;

-- ── Announcement bar: a thin notice across the storefront (singleton id = 1) ──
-- Distinct from the dev-notice modal: this is a persistent top bar (e.g. promo /
-- shipping notice), edited at /admin/settings.
create table if not exists ecom.announcement (
  id         smallint    primary key default 1 check (id = 1),
  enabled    boolean     not null default false,
  message    text        not null default '',
  link       text,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into ecom.announcement (id, enabled, message) values (1, false, '') on conflict (id) do nothing;

-- ── Homepage Flash Sale configuration (singleton id = 1) ────────────────────
-- Controls whether the ERP promo-item rail is shown and gives its countdown a
-- real, admin-defined end time instead of a browser-relative timer.
create table if not exists ecom.home_promotion (
  id         smallint    primary key default 1 check (id = 1),
  enabled    boolean     not null default false,
  title      text        not null default 'FLASH SALE',
  ends_at    timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into ecom.home_promotion (id) values (1) on conflict (id) do nothing;

-- ── Product description overlay: app-owned override for the sparse ERP text ───
alter table ecom.product_overlays add column if not exists description text;

-- ── Payment + shipping method on orders + editable bank-transfer details ──────
alter table ecom.orders add column if not exists payment_method  text not null default 'cod';
alter table ecom.orders add column if not exists shipping_method text not null default 'odien';
alter table ecom.orders add column if not exists shipping_fee    numeric(18,2) not null default 0;

create table if not exists ecom.bank_transfer (
  id           smallint    primary key default 1 check (id = 1),
  bank_name    text        not null default '',
  account_name text        not null default '',
  account_no   text        not null default '',
  note         text,
  updated_at   timestamptz not null default now(),
  updated_by   text
);
insert into ecom.bank_transfer (id) values (1) on conflict (id) do nothing;
-- BCEL / bank QR image (uploaded to public/uploads/bank) shown on transfer orders
alter table ecom.bank_transfer add column if not exists qr_url text;

-- ── Audit log: who changed what in the admin (best-effort; app-owned) ─────────
create table if not exists ecom.audit_log (
  id         bigint      generated always as identity primary key,
  actor_code text,
  actor_name text,
  action     text        not null,   -- e.g. 'order.status', 'product.bulk.hide'
  entity     text,                   -- the affected id/code (order_no, product_code, …)
  detail     text,                   -- short human note
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on ecom.audit_log(created_at desc);

-- ── SML cash-bill export queue (app-owned). On admin "confirm" we enqueue a ────
-- snapshot here; the SML/ERP side imports it into a cash sale (ບິນສົດ). The app
-- NEVER writes to public.* (SML) — this is the read-only-safe hand-off.
create table if not exists ecom.erp_cash_bill_queue (
  id          bigint      generated always as identity primary key,
  order_id    bigint      not null references ecom.orders(id) on delete cascade,
  order_no    text        not null,
  status      text        not null default 'pending',  -- pending|exported|failed
  payload     jsonb,                                    -- order snapshot for the importer
  sml_doc_no  text,                                     -- SML bill no, set when exported
  error       text,
  created_at  timestamptz not null default now(),
  exported_at timestamptz,
  unique (order_id)
);
create index if not exists erp_cb_queue_status_idx on ecom.erp_cash_bill_queue(status, created_at);

-- Warehouse/location selected by staff after payment verification. One source
-- location per order line; the selected codes are snapshotted into the SML
-- export payload and used as ic_trans_detail.wh_code/shelf_code.
create table if not exists ecom.order_item_allocations (
  order_item_id bigint      primary key references ecom.order_items(id) on delete cascade,
  wh_code       text        not null,
  wh_name       text        not null default '',
  shelf_code    text        not null,
  shelf_name    text        not null default '',
  qty           numeric(18,4) not null check (qty > 0),
  selected_by   text,
  selected_at   timestamptz not null default now()
);
create index if not exists order_item_allocations_wh_idx
  on ecom.order_item_allocations(wh_code, shelf_code);

-- The live CAE flow stores order lines directly in public.ic_trans_detail.
-- order_item_id therefore holds ic_trans_detail.roworder (a globally unique
-- sequence value), not ecom.order_items.id. PostgreSQL cannot enforce a cross-
-- ownership FK without granting writes to public.*, so validation is performed
-- transactionally by order-warehouse.ts before each allocation.
alter table ecom.order_item_allocations
  drop constraint if exists order_item_allocations_order_item_id_fkey;

-- Customer address book. A logged-in customer may save many addresses; each
-- order ships to exactly one (snapshotted into ecom.orders.address at checkout).
create table if not exists ecom.customer_addresses (
  id            bigint      generated always as identity primary key,
  customer_code text        not null,                  -- ties to public.ar_customer.code
  recipient     text,                                  -- recipient name (optional)
  phone         text,                                  -- delivery phone (optional)
  province      text        not null,                  -- ແຂວງ
  district      text        not null,                  -- ເມືອງ
  village       text,                                  -- ບ້ານ
  detail        text,                                  -- house no. / road / landmark
  is_default    boolean     not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists customer_addresses_code_idx
  on ecom.customer_addresses(customer_code, is_default desc, id desc);

-- BCEL OnePay dynamic QR + payment status per order (one QR per order).
create table if not exists ecom.onepay_payments (
  id          bigint      generated always as identity primary key,
  order_no    text        not null unique,            -- ties to ecom.orders.order_no
  uuid        text        not null,                   -- unique tx id sent to OnePay
  invoice_id  text,
  amount      numeric(18,2) not null default 0,
  qrc         text        not null,                   -- EMVco QR payload string
  status      text        not null default 'generated', -- generated|scanned|submitted|paid|notfound
  ticket      text,                                   -- BCEL ticket (when paid)
  fcc_ref     text,                                   -- BCEL FCC reference (when paid)
  payer_name  text,
  paid_at     timestamptz,
  checked_at  timestamptz,
  created_at  timestamptz not null default now()
);
-- QR validity window (3-minute countdown on the confirmation page).
alter table ecom.onepay_payments add column if not exists expires_at timestamptz;

-- SML online cash-sale invoice (CAE) doc no for this order: created as ic_trans
-- flag 34 at checkout, updated to flag 44 when the admin issues the bill.
alter table ecom.orders add column if not exists sml_doc_no text;

-- Manager-controlled OnePay test mode. When enabled, newly generated QR codes
-- use test_amount (normally 1 LAK); order totals remain unchanged.
create table if not exists ecom.onepay_config (
  id          smallint    primary key default 1 check (id = 1),
  test_mode   boolean     not null default false,
  test_amount numeric(18,2) not null default 1 check (test_amount > 0),
  updated_at  timestamptz not null default now(),
  updated_by  text
);
insert into ecom.onepay_config (id) values (1) on conflict (id) do nothing;
-- Manager toggle: offer cash-on-delivery (COD) at checkout (default on).
alter table ecom.onepay_config add column if not exists cod_enabled boolean not null default true;

-- Pending-order snapshot. Orders are NOT written to SML (public.ic_trans, CAE
-- flag 34) until the customer PAYS. Until then the order lives here as a snapshot
-- attached to the QR row (keyed by the temp order_no). On payment the snapshot is
-- materialised into ic_trans and sml_doc_no is stamped with the CAE doc_no.
alter table ecom.onepay_payments add column if not exists cust_code     text;
alter table ecom.onepay_payments add column if not exists cust_name     text;
alter table ecom.onepay_payments add column if not exists phone         text;
alter table ecom.onepay_payments add column if not exists address       text;
alter table ecom.onepay_payments add column if not exists note          text;
alter table ecom.onepay_payments add column if not exists referral_code text;
alter table ecom.onepay_payments add column if not exists items         jsonb;
alter table ecom.onepay_payments add column if not exists subtotal      numeric(18,2);
alter table ecom.onepay_payments add column if not exists shipping_fee  numeric(18,2);
alter table ecom.onepay_payments add column if not exists sml_doc_no    text;

-- ── Live chat (customer ↔ admin), app-owned ──────────────────────────────────
-- One thread per customer (logged-in: customer_code; guest: a cookie token).
-- Realtime is short-polling on both sides (no external service needed).
create table if not exists ecom.chat_threads (
  id              bigint      generated always as identity primary key,
  cust_key        text        not null unique,   -- customer_code OR 'guest:<token>'
  customer_code   text,                           -- set when logged in
  name            text        not null default 'ລູກຄ້າ',
  phone           text,
  last_message_at timestamptz not null default now(),
  last_sender     text,                           -- 'customer' | 'admin'
  created_at      timestamptz not null default now()
);
create index if not exists chat_threads_recent_idx on ecom.chat_threads(last_message_at desc);

create table if not exists ecom.chat_messages (
  id               bigint      generated always as identity primary key,
  thread_id        bigint      not null references ecom.chat_threads(id) on delete cascade,
  sender           text        not null check (sender in ('customer','admin')),
  body             text        not null,
  created_at       timestamptz not null default now(),
  read_by_admin    boolean     not null default false,
  read_by_customer boolean     not null default false
);
create index if not exists chat_messages_thread_idx on ecom.chat_messages(thread_id, id);

-- ── Vouchers / discount codes (app-owned) ────────────────────────────────────
-- Applied at checkout: reduces the QR/charged amount AND the SML bill total
-- (ic_trans.total_discount). Redemption is recorded on PAYMENT, not checkout.
create table if not exists ecom.vouchers (
  id                 bigint      generated always as identity primary key,
  code               text        not null unique,
  kind               text        not null check (kind in ('percent','amount')),
  value              numeric(18,2) not null check (value > 0),  -- % or LAK
  min_subtotal       numeric(18,2) not null default 0,
  max_discount       numeric(18,2),                              -- cap for percent
  starts_at          timestamptz,
  expires_at         timestamptz,
  usage_limit        int,                                        -- null = unlimited
  used_count         int         not null default 0,
  per_customer_limit int         not null default 1,             -- 0 = unlimited
  active             boolean     not null default true,
  note               text,
  created_by         text,
  created_at         timestamptz not null default now()
);

create table if not exists ecom.voucher_redemptions (
  id            bigint      generated always as identity primary key,
  voucher_id    bigint      not null references ecom.vouchers(id) on delete cascade,
  code          text        not null,
  order_no      text        not null,           -- temp or CAE doc_no
  customer_code text,
  discount      numeric(18,2) not null,
  created_at    timestamptz not null default now()
);
create index if not exists voucher_redemptions_voucher_idx on ecom.voucher_redemptions(voucher_id);
create unique index if not exists voucher_redemptions_order_uniq on ecom.voucher_redemptions(order_no);

-- Voucher applied to a pending order (stored until payment, then redeemed).
alter table ecom.onepay_payments add column if not exists voucher_code text;
alter table ecom.onepay_payments add column if not exists discount     numeric(18,2) not null default 0;
-- Loyalty points redeemed on this order (deducted on payment) + delivery-notify state.
alter table ecom.onepay_payments add column if not exists points_used  int not null default 0;
alter table ecom.onepay_payments add column if not exists notified_status text;

-- ── In-app notifications (customer-facing bell) ──────────────────────────────
create table if not exists ecom.notifications (
  id            bigint      generated always as identity primary key,
  customer_code text        not null,            -- recipient (ar_customer.code)
  type          text        not null,            -- order|loyalty|stock|price|promo
  title         text        not null,
  body          text,
  link          text,
  read          boolean     not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_cust_idx on ecom.notifications(customer_code, id desc);

-- ── Loyalty points ledger (sum = balance). Logged-in customers only. ─────────
create table if not exists ecom.loyalty_ledger (
  id            bigint      generated always as identity primary key,
  customer_code text        not null,
  delta         int         not null,            -- + earn / − redeem
  reason        text        not null,            -- earn|redeem|adjust
  order_no      text,
  created_at    timestamptz not null default now()
);
create index if not exists loyalty_cust_idx on ecom.loyalty_ledger(customer_code, id desc);

-- ── Back-in-stock / price-drop alerts (subscribe from product page) ──────────
create table if not exists ecom.product_alerts (
  id            bigint      generated always as identity primary key,
  customer_code text        not null,
  product_code  text        not null,
  base_price    numeric(18,2),                   -- price when subscribed
  base_in_stock boolean,                         -- stock state when subscribed
  notified_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (customer_code, product_code)
);
create index if not exists product_alerts_code_idx on ecom.product_alerts(product_code);

-- ── Web Push subscriptions (optional; needs VAPID keys to actually send) ─────
create table if not exists ecom.push_subscriptions (
  id            bigint      generated always as identity primary key,
  customer_key  text        not null,            -- customer_code or 'guest:<token>'
  endpoint      text        not null unique,
  p256dh        text        not null,
  auth          text        not null,
  created_at    timestamptz not null default now()
);
create index if not exists push_subs_key_idx on ecom.push_subscriptions(customer_key);

-- ── Returns / refunds (ຄືນສິນຄ້າ / ຄືນເງິນ), app-owned ───────────────────────
-- A logged-in customer requests a return on a paid order; admin reviews and sets
-- the outcome. Refund money handling is done ERP-side (credit note) — this just
-- tracks the request + status.
create table if not exists ecom.return_requests (
  id            bigint      generated always as identity primary key,
  order_no      text        not null,            -- storefront order no (temp or CAE)
  customer_code text,
  reason        text        not null,            -- short reason code/label
  detail        text,                            -- free description
  status        text        not null default 'pending', -- pending|approved|rejected|refunded
  admin_note    text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   text
);
create index if not exists return_requests_order_idx on ecom.return_requests(order_no);
create index if not exists return_requests_status_idx on ecom.return_requests(status, created_at desc);

-- ── Member tier assignment (app-owned) ───────────────────────────────────────
-- Discount % per tier is defined in the READ-ONLY ERP public.ar_group_sub
-- (e.g. gold 3% / platinum 4% / black 5%). Customer→tier assignment lives here
-- (admin assigns), and the discount auto-applies at checkout for that customer.
create table if not exists ecom.customer_tier (
  customer_code  text        primary key,        -- ar_customer.code
  group_sub_code text        not null,           -- ar_group_sub.code
  updated_by     text,
  updated_at     timestamptz not null default now()
);

-- Member-tier discount applied to a pending order (carried until payment).
alter table ecom.onepay_payments add column if not exists member_discount numeric(18,2) not null default 0;

-- ── Flash sale / time-limited deals (app-owned) ──────────────────────────────
-- A product is "on flash" while now() is within [starts_at, ends_at] and active.
-- The deal price overrides the retail price on the storefront AND at checkout
-- (re-priced server-side). Keyed by ERP ic_inventory.code.
create table if not exists ecom.flash_deals (
  product_code text        primary key,
  sale_price   numeric(18,2) not null check (sale_price > 0),
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz not null,
  active       boolean     not null default true,
  created_by   text,
  created_at   timestamptz not null default now()
);
create index if not exists flash_deals_window_idx on ecom.flash_deals(active, ends_at);

-- ── Product Q&A (ask the seller) ─────────────────────────────────────────────
create table if not exists ecom.product_questions (
  id            bigint      generated always as identity primary key,
  product_code  text        not null,
  customer_code text,
  customer_name text        not null default 'ລູກຄ້າ',
  question      text        not null,
  answer        text,
  answered_by   text,
  answered_at   timestamptz,
  is_hidden     boolean     not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists product_questions_code_idx on ecom.product_questions(product_code, id desc);
create index if not exists product_questions_open_idx on ecom.product_questions(answer) where answer is null;

-- ── Abandoned cart recovery (logged-in customers) ────────────────────────────
-- The cart is client-side localStorage; logged-in customers also sync a snapshot
-- here so a reminder can be sent if they don't check out. Cleared on order.
create table if not exists ecom.saved_cart (
  customer_code text        primary key,
  items         jsonb       not null,
  item_count    int         not null default 0,
  updated_at    timestamptz not null default now(),
  notified_at   timestamptz
);
create index if not exists saved_cart_idle_idx on ecom.saved_cart(updated_at) where notified_at is null;

-- Payment method on the order snapshot ('transfer' = BCEL QR, 'cod' = cash on
-- delivery). COD orders materialise to ic_trans (flag 34) immediately at checkout.
alter table ecom.onepay_payments add column if not exists payment_method text not null default 'transfer';
alter table ecom.onepay_payments add column if not exists shipping_method text not null default 'odien';
-- Transfer slip uploaded by staff (proof the customer paid) for assisted orders.
alter table ecom.onepay_payments add column if not exists slip_url text;

-- ── Web visit analytics ──────────────────────────────────────────────────────
-- Anonymous visitor id (client-generated, stored in localStorage). visit_events
-- logs one row per page view (history → daily/monthly stats); visit_pings keeps
-- the latest heartbeat per visitor (→ "online now", upsert keeps it small).
create table if not exists ecom.visit_events (
  id         bigserial   primary key,
  visitor_id text        not null,
  path       text,
  created_at timestamptz not null default now()
);
create index if not exists visit_events_created_idx on ecom.visit_events(created_at);
create index if not exists visit_events_vid_created_idx on ecom.visit_events(visitor_id, created_at);

create table if not exists ecom.visit_pings (
  visitor_id text        primary key,
  path       text,
  last_seen  timestamptz not null default now()
);
create index if not exists visit_pings_seen_idx on ecom.visit_pings(last_seen);
`;

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  connectionTimeoutMillis: 20000,
});
try {
  await c.connect();
  await c.query(DDL);
  const tabs = await c.query(
    `select table_name from information_schema.tables where table_schema='ecom' order by 1`,
  );
  console.log("✓ ecom schema ready. Tables:", tabs.rows.map((r) => r.table_name).join(", "));
} catch (e) {
  console.error("Migration error:", e.message);
  process.exitCode = 1;
} finally {
  await c.end().catch(() => {});
}
