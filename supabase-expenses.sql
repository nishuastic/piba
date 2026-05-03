-- =============================================
-- PIBA — Expenses Schema Extension
-- =============================================
-- Run this in the Supabase SQL Editor AFTER the main schema

-- EXPENSES TABLE — one-off club costs split among members
create table if not exists expenses (
  id uuid default uuid_generate_v4() primary key,
  description text not null,
  total_amount numeric(10,2) not null default 0,
  date date not null default current_date,
  paid_by text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- EXPENSE_SPLITS TABLE — tracks which members share each expense
create table if not exists expense_splits (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references expenses(id) on delete cascade not null,
  member_id uuid references members(id) on delete cascade not null,
  share_amount numeric(10,2) not null default 0,
  settled boolean default false,
  created_at timestamptz default now(),
  unique(expense_id, member_id)
);

-- Indexes
create index if not exists idx_expense_splits_expense_id on expense_splits(expense_id);
create index if not exists idx_expense_splits_member_id on expense_splits(member_id);
create index if not exists idx_expenses_date on expenses(date desc);

-- RLS
alter table expenses enable row level security;
alter table expense_splits enable row level security;

create policy "Authenticated users can manage expenses"
  on expenses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage expense_splits"
  on expense_splits for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
