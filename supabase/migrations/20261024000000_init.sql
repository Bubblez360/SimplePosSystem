-- TindaPOS backend schema. Paste into Supabase > SQL Editor > Run (safe to re-run).
--
-- Security model: these tables are ONLY touched by the Edge Functions, which use
-- the service-role key (it bypasses RLS). The app ships the public "anon" key,
-- so RLS is ON with NO policies: the anon key can read/write nothing directly.
-- Without this, anyone with the anon key could list every license key.

create table if not exists public.licenses (
  id          bigint generated always as identity primary key,
  license_key text        not null unique,
  active      boolean     not null default true,
  expires_at  timestamptz,
  email       text,
  payment_id  text unique,             -- PayMongo payment id: makes webhook re-delivery idempotent
  plan        text        not null default 'monthly' check (plan in ('trial', 'monthly', 'annual')),
  created_at  timestamptz not null default now()
);
create index if not exists licenses_email_idx on public.licenses (email);

create table if not exists public.rate_limits (
  id          bigint generated always as identity primary key,
  identifier  text        not null,
  action      text        not null,
  created_at  timestamptz not null default now()
);
create index if not exists rate_limits_lookup_idx on public.rate_limits (identifier, action, created_at);

create table if not exists public.vendor_backups (
  vendor_key  text        not null,    -- the license key that owns the backup
  store_name  text        not null,    -- items | categories | sales | expenses
  record_id   text        not null,
  data        jsonb       not null,
  synced_at   timestamptz not null default now(),
  primary key (vendor_key, store_name, record_id)
);

alter table public.licenses       enable row level security;
alter table public.rate_limits    enable row level security;
alter table public.vendor_backups enable row level security;

revoke all on public.licenses, public.rate_limits, public.vendor_backups from anon, authenticated;
