-- Migration: Rename book_reading to running + Add missing columns
-- This migration preserves all existing data
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Rename the book_reading column to running
-- ============================================
-- This preserves all existing boolean values
ALTER TABLE public.daily_entries 
RENAME COLUMN book_reading TO running;

-- ============================================
-- STEP 2: Add running_note column (for tracking distance/time)
-- ============================================
ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS running_note TEXT;

-- ============================================
-- STEP 3: Add missing columns that exist in TypeScript types
-- ============================================
-- These columns were in the TypeScript types but missing from schema
ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL(3,1);

ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5);

ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- ============================================
-- STEP 4: Create trigger to auto-update updated_at
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

-- ============================================
-- VERIFICATION: Check all columns exist
-- ============================================
-- Run this to verify:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'daily_entries'
-- ORDER BY ordinal_position;
