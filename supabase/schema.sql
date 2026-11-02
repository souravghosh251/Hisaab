-- Hisaab schema. Run in the Supabase SQL editor.
-- Safe to re-run: it creates what is missing and adds v2 columns to existing tables.
-- Balances are never stored: they are computed from transactions.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  business_name text not null default '',
  phone         text not null default '',
  upi_id        text not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists public.parties (
  id         uuid primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  phone      text not null default '',
  note       text not null default '',
  type       text not null default 'customer' check (type in ('customer','supplier')),
  due_date   date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists parties_user_idx on public.parties(user_id);

-- v2 (Kirana PRD): aliases for search (F24) and pinned customers on Home (F23).
alter table public.parties add column if not exists alias  text    not null default '';
alter table public.parties add column if not exists pinned boolean not null default false;

create table if not exists public.transactions (
  id         uuid primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  party_id   uuid not null references public.parties(id) on delete cascade,
  type       text not null check (type in ('gave','got')),
  amount     bigint not null check (amount > 0 and amount <= 100000000), -- paise, max Rs 10,00,000
  note       text not null default '',
  txn_date   date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists txns_party_idx on public.transactions(party_id);
create index if not exists txns_user_idx on public.transactions(user_id);

-- v2: where the entry was recorded from (F22 metrics).
alter table public.transactions add column if not exists source text not null default 'ledger'
  check (source in ('ledger','quick','repeat','settle','opening'));

-- v2: first-party usage events (F22). No names or phone numbers, only the user id and small props.
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_user_idx on public.events(user_id, created_at);

-- Row-level security: every user sees and changes only their own rows.
alter table public.profiles     enable row level security;
alter table public.parties      enable row level security;
alter table public.transactions enable row level security;
alter table public.events       enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own parties" on public.parties;
create policy "own parties" on public.parties
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A transaction must belong to the user AND point at one of the user's parties.
drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.parties p where p.id = party_id and p.user_id = auth.uid())
  );

-- Events are write-only from the app; read them in the dashboard (service role bypasses RLS).
drop policy if exists "insert own events" on public.events;
create policy "insert own events" on public.events
  for insert with check (user_id = auth.uid());
