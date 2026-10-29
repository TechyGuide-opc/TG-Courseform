-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> Run

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

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- Lock the table: no public access at all. Only the server (service-role key,
-- used by /api/lead) can insert; you read leads from the Supabase dashboard.
alter table public.leads enable row level security;
