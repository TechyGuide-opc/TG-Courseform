-- TechyGuide bookings: run this ONE file in Supabase (Dashboard -> SQL Editor -> New query -> Run).
-- It is safe to run again any time: it creates the table if missing and upgrades an older one.

-- 1) the table (current columns)
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  child_name      text not null,
  child_grade     text not null,
  phone           text not null,
  email           text not null,
  course_interest text not null,
  preferred_slot  text not null,
  has_laptop      boolean not null default true,
  consent         boolean not null default false,
  utm             jsonb not null default '{}'::jsonb,
  source_url      text,
  user_agent      text,
  status          text not null default 'new'   -- new | contacted | trial_booked | enrolled | not_interested
);

-- 2) upgrade an older table: new column the form sends
alter table public.leads add column if not exists has_laptop boolean not null default true;

-- 3) upgrade an older table: parent_name used to be required, the form no longer sends it
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'leads' and column_name = 'parent_name') then
    alter table public.leads alter column parent_name drop not null;
  end if;
end $$;

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- 4) keep the table private: only the server (using the SECRET key) can read or write it
alter table public.leads enable row level security;

-- 5) OPTIONAL - only if you cannot use the secret key yet.
--    Lets the form save with the PUBLISHABLE key (insert only: the public key still cannot read,
--    change or delete bookings). Trade-off: anyone who knows your project URL + publishable key
--    could add junk rows. The admin page (/admin.html) still needs the SECRET key.
--    To turn it on, remove the two "--" at the start of each line below and run the file again.
--
-- drop policy if exists "public can submit bookings" on public.leads;
-- create policy "public can submit bookings" on public.leads for insert to anon with check (true);
