-- Daily Entries Table Schema
-- Updated: 2026-01-13 - Renamed book_reading to running

create table if not exists public.daily_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  date date not null,
  
  -- Habits
  running boolean default false,
  running_note text, -- Distance, time, or notes about the run
  work_done boolean default false,
  work_note text, -- What did you work on?
  
  -- Workout
  gym_type text check (gym_type in ('rest', 'push', 'pull', 'legs', 'cardio')),
  exercises jsonb default '[]'::jsonb, -- Array of {name, sets: [{reps, weight}], unit: 'kg'|'lbs'}
  
  -- Health metrics
  current_weight decimal(5,2),
  daily_steps integer,
  sleep_hours decimal(3,1), -- Hours of sleep (e.g., 7.5)
  energy_level integer check (energy_level >= 1 and energy_level <= 5), -- 1-5 scale
  
  -- Reflection
  note text,
  gratitude text,
  is_highlighted boolean default false,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
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
