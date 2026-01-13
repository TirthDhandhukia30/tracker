-- Migration: Fix schema for non-auth setup
-- Run date: 2026-01-13
-- This app doesn't use Supabase Auth, so we need simple date-based constraint

-- ============================================
-- STEP 1: Disable RLS (no auth)
-- ============================================
ALTER TABLE public.daily_entries DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop user_id-based constraint
-- ============================================
ALTER TABLE public.daily_entries 
DROP CONSTRAINT IF EXISTS daily_entries_user_id_date_key;

-- ============================================
-- STEP 3: Drop old date constraint if exists
-- ============================================
ALTER TABLE public.daily_entries 
DROP CONSTRAINT IF EXISTS daily_entries_date_key;

-- ============================================
-- STEP 4: Cleanup duplicate entries (keep only most recent per date)
-- ============================================
DELETE FROM public.daily_entries a
USING public.daily_entries b
WHERE a.id < b.id
  AND a.date = b.date;

-- ============================================
-- STEP 5: Add simple date constraint
-- ============================================
ALTER TABLE public.daily_entries 
ADD CONSTRAINT daily_entries_date_key UNIQUE(date);

-- ============================================
-- STEP 6: Ensure all required columns exist
-- ============================================
ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS running_note TEXT;

ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL(3,1);

ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5);

-- ============================================
-- STEP 7: Create trigger to auto-update updated_at
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
