-- Create the table if it doesn't exist
create table if not exists public.daily_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  date date not null,
  book_reading boolean default false,
  work_done boolean default false,
  gym_type text check (gym_type in ('rest', 'push', 'pull', 'legs')),
  exercises jsonb default '[]'::jsonb,
  current_weight decimal(5,2),
  daily_steps integer,
  note text,
  gratitude text,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- RLS Policies
alter table public.daily_entries enable row level security;

create policy "Individuals can view their own entries"
on public.daily_entries for select
using (auth.uid() = user_id);

create policy "Individuals can insert their own entries"
on public.daily_entries for insert
with check (auth.uid() = user_id);

create policy "Individuals can update their own entries"
on public.daily_entries for update
using (auth.uid() = user_id);

create policy "Individuals can delete their own entries"
on public.daily_entries for delete
using (auth.uid() = user_id);
