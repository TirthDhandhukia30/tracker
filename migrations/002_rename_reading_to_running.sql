-- Migration: Add user_id column and fix schema
-- Run date: 2026-01-13
-- This migration adds the missing user_id column for RLS

-- ============================================
-- STEP 0: Drop old date-only constraint (causes 409 conflicts)
-- ============================================
ALTER TABLE public.daily_entries 
DROP CONSTRAINT IF EXISTS daily_entries_date_key;

-- ============================================
-- STEP 1: Add user_id column if missing
-- ============================================
ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- ============================================
-- STEP 2: Add running_note column (for tracking distance/time)
-- ============================================
ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS running_note TEXT;

-- ============================================
-- STEP 3: Add missing columns that exist in TypeScript types
-- ============================================
ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL(3,1);

ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5);

ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- ============================================
-- STEP 4: Create unique constraint on user_id and date
-- ============================================
ALTER TABLE public.daily_entries 
DROP CONSTRAINT IF EXISTS daily_entries_user_id_date_key;

ALTER TABLE public.daily_entries 
ADD CONSTRAINT daily_entries_user_id_date_key UNIQUE(user_id, date);

-- ============================================
-- STEP 5: Enable RLS and create policies
-- ============================================
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Individuals can view their own entries" ON public.daily_entries;
DROP POLICY IF EXISTS "Individuals can insert their own entries" ON public.daily_entries;
DROP POLICY IF EXISTS "Individuals can update their own entries" ON public.daily_entries;
DROP POLICY IF EXISTS "Individuals can delete their own entries" ON public.daily_entries;

CREATE POLICY "Individuals can view their own entries"
ON public.daily_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Individuals can insert their own entries"
ON public.daily_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Individuals can update their own entries"
ON public.daily_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Individuals can delete their own entries"
ON public.daily_entries FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- STEP 6: Create trigger to auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_daily_entries_updated_at ON public.daily_entries;

CREATE TRIGGER update_daily_entries_updated_at
    BEFORE UPDATE ON public.daily_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
