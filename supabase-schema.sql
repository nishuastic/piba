-- =============================================
-- PIBA — Supabase Database Schema
-- =============================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- MEMBERS TABLE
create table if not exists members (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  membership_fee_paid numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- EVENTS TABLE
create table if not exists events (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  time time,
  venue text not null,
  court_cost numeric(10,2) default 0,
  shuttle_cost numeric(10,2) default 0,
  member_price numeric(10,2) default 0,
  non_member_price numeric(10,2) default 0,
  notes text default '',
  created_at timestamptz default now()
);

-- ATTENDEES TABLE
create table if not exists attendees (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  name text not null,
  is_member boolean default false,
  payment_method text not null default 'Meetup',
  amount_paid numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_attendees_event_id on attendees(event_id);
create index if not exists idx_events_date on events(date desc);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
-- Enable RLS so only authenticated users can access data.

alter table members enable row level security;
alter table events enable row level security;
alter table attendees enable row level security;

-- Policies: allow all operations for authenticated users
create policy "Authenticated users can manage members"
  on members for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage events"
  on events for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage attendees"
  on attendees for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- =============================================
-- EXPENSES EXTENSION
-- =============================================
-- See supabase-expenses.sql for the expenses and expense_splits tables.
-- Run that file after this one to enable one-off cost splitting.
