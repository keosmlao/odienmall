// Creates the ISOLATED `odg_ecom` schema for storefront/app data.
// Safe & idempotent: only CREATE ... IF NOT EXISTS inside the new `odg_ecom` schema.
// It never reads, alters, or drops any existing ERP table.
//   run:  node --env-file=.env scripts/migrate-ecom.mjs
import pg from "pg";

const DDL = `
create schema if not exists odg_ecom;

-- Customers created by admin/affiliate while placing an assisted order.
-- Kept app-side because public.ar_customer is ERP-owned and read-only.
create table if not exists odg_ecom.assisted_customers (
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
  on odg_ecom.assisted_customers(phone);
create index if not exists assisted_customers_name_idx
  on odg_ecom.assisted_customers(lower(name));

create table if not exists odg_ecom.reviews (
  id            bigint generated always as identity primary key,
  product_code  text        not null,
  customer_code text        not null,
  customer_name text        not null,
  rating        smallint    not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  unique (product_code, customer_code)
);

create index if not exists reviews_product_idx on odg_ecom.reviews(product_code);

-- App-owned brand logo override. ERP ic_brand remains read-only.
create table if not exists odg_ecom.brand_overlays (
  brand_code text primary key,
  logo_url   text,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Homepage promotional banner slider. All content is app-owned and editable
-- from /admin/banners; no ERP table is touched.
create table if not exists odg_ecom.home_banners (
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
  on odg_ecom.home_banners(enabled desc, sort_order, id);
insert into odg_ecom.home_banners
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
 where not exists (select 1 from odg_ecom.home_banners);

-- ── Affiliate program (all app-owned, schema ecom only) ──────────────────────
create table if not exists odg_ecom.affiliates (
  id            bigint generated always as identity primary key,
  code          text        not null unique,          -- referral code (share link)
  customer_code text        not null unique,           -- ties to public.ar_customer
  name          text        not null,
  phone         text,
  status        text        not null default 'pending', -- pending|active|suspended
  created_at    timestamptz not null default now(),
  approved_at   timestamptz
);
alter table odg_ecom.affiliates add column if not exists email text;
alter table odg_ecom.affiliates add column if not exists email_verified_at timestamptz;
alter table odg_ecom.affiliates add column if not exists bank_code text;
alter table odg_ecom.affiliates add column if not exists bank_name text;
alter table odg_ecom.affiliates add column if not exists account_name text;
alter table odg_ecom.affiliates add column if not exists account_no text;
create unique index if not exists affiliates_verified_email_uniq
  on odg_ecom.affiliates(lower(email))
  where email_verified_at is not null and email is not null;

-- Short-lived email OTP used before an affiliate application is created.
-- The code is HMAC-hashed; bank details are held only until successful verify.
create table if not exists odg_ecom.affiliate_email_verifications (
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

create table if not exists odg_ecom.commission_rates (
  id         bigint generated always as identity primary key,
  scope      text          not null,        -- 'default' | 'category' | 'product'
  ref_key    text,                          -- category/product code; null for default
  rate_pct   numeric(6,3)  not null,
  updated_at timestamptz   not null default now()
);
create unique index if not exists comm_rate_default_uniq on odg_ecom.commission_rates (scope) where scope = 'default';
create unique index if not exists comm_rate_key_uniq     on odg_ecom.commission_rates (scope, ref_key) where ref_key is not null;
-- seed a single default rate (5%) once; admin changes it later
insert into odg_ecom.commission_rates (scope, ref_key, rate_pct)
  select 'default', null, 5
  where not exists (select 1 from odg_ecom.commission_rates where scope = 'default');

create table if not exists odg_ecom.payouts (
  id           bigint generated always as identity primary key,
  affiliate_id bigint        not null references odg_ecom.affiliates(id),
  amount       numeric(18,2) not null,
  note         text,
  created_at   timestamptz   not null default now()
);

create table if not exists odg_ecom.commissions (
  id           bigint        generated always as identity primary key,
  order_id     bigint        unique,                  -- legacy nullable id, no odg_ecom.orders FK
  order_no     text,                          -- current OnePay temp order_no
  affiliate_id bigint        not null references odg_ecom.affiliates(id),
  base_amount  numeric(18,2) not null default 0,  -- order subtotal at earn time
  amount       numeric(18,2) not null default 0,  -- computed commission
  status       text          not null default 'earned', -- earned|paid
  created_at   timestamptz   not null default now(),
  paid_at      timestamptz,
  payout_id    bigint        references odg_ecom.payouts(id)
);
create index if not exists commissions_aff_idx on odg_ecom.commissions(affiliate_id);
alter table odg_ecom.commissions add column if not exists order_no text;
alter table odg_ecom.commissions alter column order_id drop not null;
create unique index if not exists commissions_order_no_uniq
  on odg_ecom.commissions(order_no) where order_no is not null;

create table if not exists odg_ecom.affiliate_clicks (
  id           bigint      generated always as identity primary key,
  affiliate_id bigint      not null references odg_ecom.affiliates(id),
  path         text,
  created_at   timestamptz not null default now()
);
create index if not exists aff_clicks_idx on odg_ecom.affiliate_clicks(affiliate_id);

-- ── Product overlays (app-owned data layered over the READ-ONLY ERP catalog) ──
-- Keyed by ERP ic_inventory.code. Lets admin add an image, hide an item from the
-- shop, or mark it featured — WITHOUT ever touching public.ic_inventory.
create table if not exists odg_ecom.product_overlays (
  product_code text        primary key,         -- ERP ic_inventory.code
  image_url    text,                            -- overlay image (ERP has none)
  is_hidden    boolean     not null default false, -- hide from storefront
  is_featured  boolean     not null default false, -- float to "ສິນຄ້າແນະນຳ"
  updated_at   timestamptz not null default now(),
  updated_by   text                             -- employee_code who last edited
);
create index if not exists product_overlays_featured_idx on odg_ecom.product_overlays(is_featured) where is_featured;
create index if not exists product_overlays_hidden_idx   on odg_ecom.product_overlays(is_hidden)   where is_hidden;

-- Upload blobs (app-owned binary storage). New uploads are stored here as bytea
-- and served through /api/uploads/<id>/<filename>. Existing /uploads/... URLs
-- remain valid for legacy files already on disk.
create table if not exists odg_ecom.upload_blobs (
  id           text        primary key,
  subdir       text        not null,
  filename     text        not null,
  content_type text        not null,
  size_bytes   int         not null,
  data         bytea       not null,
  created_at   timestamptz not null default now()
);
create index if not exists upload_blobs_created_idx on odg_ecom.upload_blobs(created_at desc);

-- Product image gallery (multiple images per product, ordered). URLs may point
-- to legacy /uploads/... files or DB-backed /api/uploads/... blobs. The primary
-- image (thumbnail / card) is the lowest (sort_order, id).
create table if not exists odg_ecom.product_images (
  id           bigint      generated always as identity primary key,
  product_code text        not null,
  url          text        not null,
  sort_order   int         not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists product_images_code_idx on odg_ecom.product_images(product_code, sort_order, id);

-- ── Site settings: the "dev notice" warning modal (singleton row id = 1) ──────
-- Shown on the home page on every visit while the site is under development.
-- Admin toggles it on/off and edits the text at /admin/settings.
create table if not exists odg_ecom.dev_notice (
  id         smallint    primary key default 1 check (id = 1),
  enabled    boolean     not null default false,
  title      text        not null default 'ເວັບໄຊຢູ່ໃນລະຫວ່າງການພັດທະນາ',
  message    text        not null default 'ຂະນະນີ້ເວັບໄຊກຳລັງຢູ່ໃນລະຫວ່າງການພັດທະນາ — ຂໍ້ມູນສິນຄ້າ ແລະ ລາຄາ ອາດຍັງບໍ່ສົມບູນ ຫຼື ປ່ຽນແປງໄດ້.',
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into odg_ecom.dev_notice (id, enabled) values (1, false) on conflict (id) do nothing;

-- ── Reviews moderation: app-owned hide flag on the existing reviews table ─────
alter table odg_ecom.reviews add column if not exists is_hidden boolean not null default false;

-- ── Announcement bar: a thin notice across the storefront (singleton id = 1) ──
-- Distinct from the dev-notice modal: this is a persistent top bar (e.g. promo /
-- shipping notice), edited at /admin/settings.
create table if not exists odg_ecom.announcement (
  id         smallint    primary key default 1 check (id = 1),
  enabled    boolean     not null default false,
  message    text        not null default '',
  link       text,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into odg_ecom.announcement (id, enabled, message) values (1, false, '') on conflict (id) do nothing;

-- ── Homepage Flash Sale configuration (singleton id = 1) ────────────────────
-- Controls whether the ERP promo-item rail is shown and gives its countdown a
-- real, admin-defined end time instead of a browser-relative timer.
create table if not exists odg_ecom.home_promotion (
  id         smallint    primary key default 1 check (id = 1),
  enabled    boolean     not null default false,
  title      text        not null default 'FLASH SALE',
  ends_at    timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into odg_ecom.home_promotion (id) values (1) on conflict (id) do nothing;

-- ── Product description overlay: app-owned override for the sparse ERP text ───
alter table odg_ecom.product_overlays add column if not exists description text;
alter table odg_ecom.product_overlays add column if not exists short_description text;

-- ── Editable bank-transfer details ─────────────────────────────────────────
create table if not exists odg_ecom.bank_transfer (
  id           smallint    primary key default 1 check (id = 1),
  bank_name    text        not null default '',
  account_name text        not null default '',
  account_no   text        not null default '',
  note         text,
  updated_at   timestamptz not null default now(),
  updated_by   text
);
insert into odg_ecom.bank_transfer (id) values (1) on conflict (id) do nothing;
-- BCEL / bank QR image (uploaded to public/uploads/bank) shown on transfer orders
alter table odg_ecom.bank_transfer add column if not exists qr_url text;

-- ── Audit log: who changed what in the admin (best-effort; app-owned) ─────────
create table if not exists odg_ecom.audit_log (
  id         bigint      generated always as identity primary key,
  actor_code text,
  actor_name text,
  action     text        not null,   -- e.g. 'order.status', 'product.bulk.hide'
  entity     text,                   -- the affected id/code (order_no, product_code, …)
  detail     text,                   -- short human note
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on odg_ecom.audit_log(created_at desc);

-- Warehouse/location selected by staff after payment verification. One source
-- location per order line; the selected codes are snapshotted into the SML
-- export payload and used as ic_trans_detail.wh_code/shelf_code.
create table if not exists odg_ecom.order_item_allocations (
  order_item_id bigint      primary key,
  wh_code       text        not null,
  wh_name       text        not null default '',
  shelf_code    text        not null,
  shelf_name    text        not null default '',
  qty           numeric(18,4) not null check (qty > 0),
  selected_by   text,
  selected_at   timestamptz not null default now()
);
create index if not exists order_item_allocations_wh_idx
  on odg_ecom.order_item_allocations(wh_code, shelf_code);

-- The live CAE flow stores order lines directly in public.ic_trans_detail.
-- order_item_id therefore holds ic_trans_detail.roworder (a globally unique
-- sequence value). PostgreSQL cannot enforce a cross-
-- ownership FK without granting writes to public.*, so validation is performed
-- transactionally by order-warehouse.ts before each allocation.
alter table odg_ecom.order_item_allocations
  drop constraint if exists order_item_allocations_order_item_id_fkey;

-- Customer address book. A logged-in customer may save many addresses; each
-- web order snapshots the selected address into the CAE / OnePay record.
create table if not exists odg_ecom.customer_addresses (
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
  on odg_ecom.customer_addresses(customer_code, is_default desc, id desc);

-- LINE Login account links for storefront customers. The ERP customer table
-- remains read-only; this table only maps a LINE user id to an existing
-- public.ar_customer.code after email match / prior link.
create table if not exists odg_ecom.customer_line_accounts (
  line_user_id text primary key,
  customer_code text not null unique,
  display_name text,
  picture_url text,
  email text,
  linked_at timestamptz not null default now(),
  last_login_at timestamptz
);
create index if not exists customer_line_accounts_customer_idx
  on odg_ecom.customer_line_accounts(customer_code);
create index if not exists customer_line_accounts_email_idx
  on odg_ecom.customer_line_accounts(lower(email))
  where email is not null;

-- BCEL OnePay dynamic QR + payment status per order (one QR per order).
create table if not exists odg_ecom.onepay_payments (
  id          bigint      generated always as identity primary key,
  order_no    text        not null unique,            -- temporary web/OnePay order number
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
alter table odg_ecom.onepay_payments add column if not exists expires_at timestamptz;

-- Manager-controlled OnePay test mode. When enabled, newly generated QR codes
-- use test_amount (normally 1 LAK); order totals remain unchanged.
create table if not exists odg_ecom.onepay_config (
  id          smallint    primary key default 1 check (id = 1),
  test_mode   boolean     not null default false,
  test_amount numeric(18,2) not null default 1 check (test_amount > 0),
  updated_at  timestamptz not null default now(),
  updated_by  text
);
insert into odg_ecom.onepay_config (id) values (1) on conflict (id) do nothing;
-- Manager toggle: offer cash-on-delivery (COD) at checkout (default on).
alter table odg_ecom.onepay_config add column if not exists cod_enabled boolean not null default true;

-- Pending-order snapshot. Orders are NOT written to SML (public.ic_trans, CAE
-- flag 34) until the customer PAYS. Until then the order lives here as a snapshot
-- attached to the QR row (keyed by the temp order_no). On payment the snapshot is
-- materialised into ic_trans and sml_doc_no is stamped with the CAE doc_no.
alter table odg_ecom.onepay_payments add column if not exists cust_code     text;
alter table odg_ecom.onepay_payments add column if not exists cust_name     text;
alter table odg_ecom.onepay_payments add column if not exists phone         text;
alter table odg_ecom.onepay_payments add column if not exists address       text;
alter table odg_ecom.onepay_payments add column if not exists note          text;
alter table odg_ecom.onepay_payments add column if not exists referral_code text;
alter table odg_ecom.onepay_payments add column if not exists items         jsonb;
alter table odg_ecom.onepay_payments add column if not exists subtotal      numeric(18,2);
alter table odg_ecom.onepay_payments add column if not exists shipping_fee  numeric(18,2);
alter table odg_ecom.onepay_payments add column if not exists sml_doc_no    text;

-- ── Live chat (customer ↔ admin), app-owned ──────────────────────────────────
-- One thread per customer (logged-in: customer_code; guest: a cookie token).
-- Realtime is short-polling on both sides (no external service needed).
create table if not exists odg_ecom.chat_threads (
  id              bigint      generated always as identity primary key,
  cust_key        text        not null unique,   -- customer_code OR 'guest:<token>'
  customer_code   text,                           -- set when logged in
  name            text        not null default 'ລູກຄ້າ',
  phone           text,
  last_message_at timestamptz not null default now(),
  last_sender     text,                           -- 'customer' | 'admin'
  created_at      timestamptz not null default now()
);
create index if not exists chat_threads_recent_idx on odg_ecom.chat_threads(last_message_at desc);

create table if not exists odg_ecom.chat_messages (
  id               bigint      generated always as identity primary key,
  thread_id        bigint      not null references odg_ecom.chat_threads(id) on delete cascade,
  sender           text        not null check (sender in ('customer','admin')),
  body             text        not null,
  created_at       timestamptz not null default now(),
  read_by_admin    boolean     not null default false,
  read_by_customer boolean     not null default false
);
create index if not exists chat_messages_thread_idx on odg_ecom.chat_messages(thread_id, id);

-- ── Vouchers / discount codes (app-owned) ────────────────────────────────────
-- Applied at checkout: reduces the QR/charged amount AND the SML bill total
-- (ic_trans.total_discount). Redemption is recorded on PAYMENT, not checkout.
create table if not exists odg_ecom.vouchers (
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

create table if not exists odg_ecom.voucher_redemptions (
  id            bigint      generated always as identity primary key,
  voucher_id    bigint      not null references odg_ecom.vouchers(id) on delete cascade,
  code          text        not null,
  order_no      text        not null,           -- temp or CAE doc_no
  customer_code text,
  discount      numeric(18,2) not null,
  created_at    timestamptz not null default now()
);
create index if not exists voucher_redemptions_voucher_idx on odg_ecom.voucher_redemptions(voucher_id);
create unique index if not exists voucher_redemptions_order_uniq on odg_ecom.voucher_redemptions(order_no);

-- Voucher applied to a pending order (stored until payment, then redeemed).
alter table odg_ecom.onepay_payments add column if not exists voucher_code text;
alter table odg_ecom.onepay_payments add column if not exists discount     numeric(18,2) not null default 0;
-- Loyalty points redeemed on this order (deducted on payment) + delivery-notify state.
alter table odg_ecom.onepay_payments add column if not exists points_used  int not null default 0;
alter table odg_ecom.onepay_payments add column if not exists notified_status text;

-- ── In-app notifications (customer-facing bell) ──────────────────────────────
create table if not exists odg_ecom.notifications (
  id            bigint      generated always as identity primary key,
  customer_code text        not null,            -- recipient (ar_customer.code)
  type          text        not null,            -- order|loyalty|stock|price|promo
  title         text        not null,
  body          text,
  link          text,
  read          boolean     not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_cust_idx on odg_ecom.notifications(customer_code, id desc);

-- ── Loyalty points ledger (sum = balance). Logged-in customers only. ─────────
create table if not exists odg_ecom.loyalty_ledger (
  id            bigint      generated always as identity primary key,
  customer_code text        not null,
  delta         int         not null,            -- + earn / − redeem
  reason        text        not null,            -- earn|redeem|adjust
  order_no      text,
  created_at    timestamptz not null default now()
);
create index if not exists loyalty_cust_idx on odg_ecom.loyalty_ledger(customer_code, id desc);

-- ── Back-in-stock / price-drop alerts (subscribe from product page) ──────────
create table if not exists odg_ecom.product_alerts (
  id            bigint      generated always as identity primary key,
  customer_code text        not null,
  product_code  text        not null,
  base_price    numeric(18,2),                   -- price when subscribed
  base_in_stock boolean,                         -- stock state when subscribed
  notified_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (customer_code, product_code)
);
create index if not exists product_alerts_code_idx on odg_ecom.product_alerts(product_code);

-- ── Web Push subscriptions (optional; needs VAPID keys to actually send) ─────
create table if not exists odg_ecom.push_subscriptions (
  id            bigint      generated always as identity primary key,
  customer_key  text        not null,            -- customer_code or 'guest:<token>'
  endpoint      text        not null unique,
  p256dh        text        not null,
  auth          text        not null,
  created_at    timestamptz not null default now()
);
create index if not exists push_subs_key_idx on odg_ecom.push_subscriptions(customer_key);

-- ── Returns / refunds (ຄືນສິນຄ້າ / ຄືນເງິນ), app-owned ───────────────────────
-- A logged-in customer requests a return on a paid order; admin reviews and sets
-- the outcome. Refund money handling is done ERP-side (credit note) — this just
-- tracks the request + status.
create table if not exists odg_ecom.return_requests (
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
create index if not exists return_requests_order_idx on odg_ecom.return_requests(order_no);
create index if not exists return_requests_status_idx on odg_ecom.return_requests(status, created_at desc);

-- ── Member tier assignment (app-owned) ───────────────────────────────────────
-- Discount % per tier is defined in the READ-ONLY ERP public.ar_group_sub
-- (e.g. gold 3% / platinum 4% / black 5%). Customer→tier assignment lives here
-- (admin assigns), and the discount auto-applies at checkout for that customer.
create table if not exists odg_ecom.customer_tier (
  customer_code  text        primary key,        -- ar_customer.code
  group_sub_code text        not null,           -- ar_group_sub.code
  updated_by     text,
  updated_at     timestamptz not null default now()
);

-- Member-tier discount applied to a pending order (carried until payment).
alter table odg_ecom.onepay_payments add column if not exists member_discount numeric(18,2) not null default 0;

-- ── Flash sale / time-limited deals (app-owned) ──────────────────────────────
-- A product is "on flash" while now() is within [starts_at, ends_at] and active.
-- The deal price overrides the retail price on the storefront AND at checkout
-- (re-priced server-side). Keyed by ERP ic_inventory.code.
create table if not exists odg_ecom.flash_deals (
  product_code text        primary key,
  sale_price   numeric(18,2) not null check (sale_price > 0),
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz not null,
  active       boolean     not null default true,
  created_by   text,
  created_at   timestamptz not null default now()
);
create index if not exists flash_deals_window_idx on odg_ecom.flash_deals(active, ends_at);

-- ── Product Q&A (ask the seller) ─────────────────────────────────────────────
create table if not exists odg_ecom.product_questions (
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
create index if not exists product_questions_code_idx on odg_ecom.product_questions(product_code, id desc);
create index if not exists product_questions_open_idx on odg_ecom.product_questions(answer) where answer is null;

-- ── Abandoned cart recovery (logged-in customers) ────────────────────────────
-- The cart is client-side localStorage; logged-in customers also sync a snapshot
-- here so a reminder can be sent if they don't check out. Cleared on order.
create table if not exists odg_ecom.saved_cart (
  customer_code text        primary key,
  items         jsonb       not null,
  item_count    int         not null default 0,
  updated_at    timestamptz not null default now(),
  notified_at   timestamptz
);
create index if not exists saved_cart_idle_idx on odg_ecom.saved_cart(updated_at) where notified_at is null;

-- Payment method on the order snapshot ('transfer' = BCEL QR, 'cod' = cash on
-- delivery). COD orders materialise to ic_trans (flag 34) immediately at checkout.
alter table odg_ecom.onepay_payments add column if not exists payment_method text not null default 'transfer';
alter table odg_ecom.onepay_payments add column if not exists shipping_method text not null default 'odien';
-- Transfer slip uploaded by staff (proof the customer paid) for assisted orders.
alter table odg_ecom.onepay_payments add column if not exists slip_url text;
-- Who created the order: null = customer self-checkout, else staff/admin code.
alter table odg_ecom.onepay_payments add column if not exists created_by text;
-- SML transport branch chosen when a staff order is created (used at ອອກບິນ).
alter table odg_ecom.onepay_payments add column if not exists transport_code text;
-- Salesperson (ພະນັກງານຂາຍ) attributed to the order — an odg_employee code.
-- Set from the /s/<code> sales link, or chosen/defaulted by the admin who saves
-- the order; written through to SML ic_trans.sale_code on materialise.
alter table odg_ecom.onepay_payments add column if not exists sale_code text;

-- Clicks on a salesperson's share link (/s/<employee_code>). Lets a salesperson
-- see how many customers opened their link (engagement → conversion).
create table if not exists odg_ecom.sales_link_clicks (
  id          bigint      generated always as identity primary key,
  sale_code   text        not null,
  path        text,
  created_at  timestamptz not null default now()
);
create index if not exists sales_link_clicks_idx on odg_ecom.sales_link_clicks(sale_code, created_at);

-- Monthly sales target (ເປົ້າຍອດຂາຍ) per salesperson. One standing goal per
-- employee; managers edit it, the salesperson sees progress vs this month's sales.
create table if not exists odg_ecom.sales_targets (
  sale_code       text         primary key,
  monthly_target  numeric(18,2) not null default 0,
  updated_by      text,
  updated_at      timestamptz  not null default now()
);
-- Targets are per-month: key on (sale_code, month 'YYYY-MM'). Migrate the old
-- single-target-per-person shape to a composite key.
alter table odg_ecom.sales_targets add column if not exists month text;
update odg_ecom.sales_targets set month = to_char(now(),'YYYY-MM') where coalesce(month,'') = '';
alter table odg_ecom.sales_targets alter column month set not null;
alter table odg_ecom.sales_targets drop constraint if exists sales_targets_pkey;
alter table odg_ecom.sales_targets add constraint sales_targets_pkey primary key (sale_code, month);

-- Salesperson commission rate (%). Row sale_code='__default__' is the global
-- default; any other row overrides it for that employee. Commission is earned on
-- COMPLETED (delivered) orders attributed to the salesperson.
create table if not exists odg_ecom.sales_commission_rates (
  sale_code   text          primary key,
  pct         numeric(6,2)  not null default 0,
  updated_by  text,
  updated_at  timestamptz   not null default now()
);
insert into odg_ecom.sales_commission_rates (sale_code, pct) values ('__default__', 0)
  on conflict (sale_code) do nothing;

-- Commission payouts to salespeople (a manager records each payment). Earned −
-- paid = outstanding. Mirrors the affiliate payout ledger.
create table if not exists odg_ecom.sales_commission_payouts (
  id          bigint       generated always as identity primary key,
  sale_code   text         not null,
  amount      numeric(18,2) not null,
  note        text,
  paid_by     text,
  created_at  timestamptz  not null default now()
);
create index if not exists sales_comm_payouts_idx on odg_ecom.sales_commission_payouts(sale_code, created_at);

-- Which ERP product groups (ic_inventory.group_main) are sold on the web. The
-- storefront + admin product list filter on this set instead of a hardcoded list,
-- so a manager can open/close whole groups. Seeded with the defaults (11–14) only
-- when empty, so manager edits persist across migrations.
create table if not exists odg_ecom.web_groups (
  group_main text primary key
);
insert into odg_ecom.web_groups (group_main)
select x from (values ('11'),('12'),('13'),('14')) v(x)
where not exists (select 1 from odg_ecom.web_groups);

-- AI chat assistant: once a HUMAN admin replies in a thread, the bot stops
-- auto-answering (human has taken over). Default false = bot may answer.
alter table odg_ecom.chat_threads add column if not exists human_taken boolean not null default false;
-- Flag messages authored by the AI assistant (vs a human admin) for UI labelling
-- + per-thread rate limiting.
alter table odg_ecom.chat_messages add column if not exists is_bot boolean not null default false;
-- Singleton chat config: manager can switch the AI assistant off without removing
-- the API key.
create table if not exists odg_ecom.chat_config (
  id          int          primary key default 1,
  bot_enabled boolean      not null default true,
  updated_by  text,
  updated_at  timestamptz  not null default now()
);
insert into odg_ecom.chat_config (id) values (1) on conflict (id) do nothing;

-- AI diagnostics: every attempted bot reply/test can write a small non-secret
-- trace row so admins can debug "bot is on but not answering" without shell
-- access. Does NOT store API keys.
create table if not exists odg_ecom.ai_chat_logs (
  id             bigint      generated always as identity primary key,
  thread_id      bigint,
  event          text        not null,
  provider       text,
  model          text,
  ok             boolean     not null default false,
  has_db_context boolean     not null default false,
  latency_ms     int,
  prompt         text,
  reply          text,
  error          text,
  created_at     timestamptz not null default now()
);
create index if not exists ai_chat_logs_created_idx on odg_ecom.ai_chat_logs(created_at desc);
create index if not exists ai_chat_logs_thread_idx on odg_ecom.ai_chat_logs(thread_id, created_at desc);

-- Manager-editable extra knowledge injected into the AI prompt. Use for
-- temporary policies, delivery notes, warranty notes, promo wording, etc.
create table if not exists odg_ecom.ai_knowledge (
  id          int          primary key default 1,
  enabled     boolean      not null default true,
  content     text         not null default '',
  updated_by  text,
  updated_at  timestamptz  not null default now()
);
insert into odg_ecom.ai_knowledge (id) values (1) on conflict (id) do nothing;

-- Review photo (one image URL per review; uploaded to public/uploads/reviews).
alter table odg_ecom.reviews add column if not exists photo_url text;

-- ── Web visit analytics ──────────────────────────────────────────────────────
-- Anonymous visitor id (client-generated, stored in localStorage). visit_events
-- logs one row per page view (history → daily/monthly stats); visit_pings keeps
-- the latest heartbeat per visitor (→ "online now", upsert keeps it small).
create table if not exists odg_ecom.visit_events (
  id         bigserial   primary key,
  visitor_id text        not null,
  path       text,
  created_at timestamptz not null default now()
);
create index if not exists visit_events_created_idx on odg_ecom.visit_events(created_at);
create index if not exists visit_events_vid_created_idx on odg_ecom.visit_events(visitor_id, created_at);

create table if not exists odg_ecom.visit_pings (
  visitor_id text        primary key,
  path       text,
  last_seen  timestamptz not null default now()
);
create index if not exists visit_pings_seen_idx on odg_ecom.visit_pings(last_seen);

-- ── Product specifications: admin-managed label/value pairs per product ────────
create table if not exists odg_ecom.product_specs (
  id           bigint      generated always as identity primary key,
  product_code text        not null,
  label        text        not null,
  value        text        not null,
  sort_order   int         not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists product_specs_code_idx on odg_ecom.product_specs(product_code, sort_order, id);

-- ── AC sets: pairs an indoor [C] code with its outdoor [H] code ─────────────
-- Storefront shows only [C] items for group 12, with combined price & stock.
create table if not exists odg_ecom.ac_sets (
  id       bigint generated always as identity primary key,
  code_c   text not null unique,  -- indoor unit code
  code_h   text not null unique,  -- outdoor unit code
  created_at timestamptz not null default now()
);

-- ── Abandoned QR reminder tracking ──────────────────────────────────────────
alter table odg_ecom.onepay_payments add column if not exists reminded_at timestamptz;

-- ── Product price_note override (per-product "ສອບຖາມລາຄາ" text) ────────────
alter table odg_ecom.product_overlays add column if not exists price_note text;

-- ── Product page views ────────────────────────────────────────────────────────
-- One row per page load (client fires POST /api/views on mount).
-- Used for the "most viewed products" stat in /admin/report.
create table if not exists odg_ecom.product_views (
  id           bigint generated always as identity primary key,
  product_code text        not null,
  viewed_at    timestamptz not null default now()
);
create index if not exists product_views_code_idx on odg_ecom.product_views(product_code);
create index if not exists product_views_at_idx   on odg_ecom.product_views(viewed_at);
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
    `select table_name from information_schema.tables where table_schema='odg_ecom' order by 1`,
  );
  console.log("✓ odg_ecom schema ready. Tables:", tabs.rows.map((r) => r.table_name).join(", "));
} catch (e) {
  console.error("Migration error:", e.message);
  process.exitCode = 1;
} finally {
  await c.end().catch(() => {});
}
