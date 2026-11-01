-- Hisaab schema. Run in the Supabase SQL editor.
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

-- Row-level security: every user sees and changes only their own rows.
alter table public.profiles     enable row level security;
alter table public.parties      enable row level security;
alter table public.transactions enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own parties" on public.parties
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A transaction must belong to the user AND point at one of the user's parties.
create policy "own transactions" on public.transactions
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.parties p where p.id = party_id and p.user_id = auth.uid())
  );
