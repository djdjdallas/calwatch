-- CalWatch Database Schema
-- Run this in Supabase SQL Editor to set up the database

create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ein text,
  type text check (type in ('nonprofit', 'company', 'politician', 'government_agency')),
  city text,
  state text default 'CA',
  created_at timestamptz default now()
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  grantee_entity_id uuid references entities(id),
  program text,
  amount_awarded numeric,
  amount_spent numeric,
  outcomes_reported boolean default false,
  outcome_notes text,
  year int,
  source_url text
);

create table if not exists officers (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id),
  person_name text not null,
  title text
);

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text,
  donor_entity_id uuid references entities(id),
  recipient_name text,
  recipient_entity_id uuid references entities(id),
  amount numeric,
  year int
);

create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid references entities(id),
  to_entity_id uuid references entities(id),
  relationship_type text check (relationship_type in (
    'received_contract',
    'officer_of',
    'donated_to',
    'family_of',
    'board_member_of'
  )),
  amount numeric,
  strength_score numeric default 1.0,
  source_url text,
  year int
);

-- Enable RLS but allow public read
alter table entities enable row level security;
alter table contracts enable row level security;
alter table officers enable row level security;
alter table donations enable row level security;
alter table connections enable row level security;

create policy "Public read entities" on entities for select using (true);
create policy "Public read contracts" on contracts for select using (true);
create policy "Public read officers" on officers for select using (true);
create policy "Public read donations" on donations for select using (true);
create policy "Public read connections" on connections for select using (true);
