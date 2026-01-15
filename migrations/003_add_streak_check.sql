-- Add streak_check column for streak tracking
-- Created: 2026-01-15

ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS streak_check boolean DEFAULT false;
