-- =============================================
-- SHUTTLE CLUB — Admin Transfers Schema
-- =============================================
-- Tracks money sent between organizers to settle balances

create table if not exists transfers (
  id uuid default uuid_generate_v4() primary key,
  from_admin text not null,
  to_admin text not null,
  amount numeric(10,2) not null default 0,
  date date not null default current_date,
  notes text default '',
  created_at timestamptz default now()
);

-- Enable RLS
alter table transfers enable row level security;

create policy "Authenticated users can manage transfers"
  on transfers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
