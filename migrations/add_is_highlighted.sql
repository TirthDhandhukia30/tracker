-- Migration: Add is_highlighted column to daily_entries
-- Run this in your Supabase SQL editor

ALTER TABLE public.daily_entries 
ADD COLUMN IF NOT EXISTS is_highlighted boolean DEFAULT false;

-- Create an index for faster queries on highlighted entries
CREATE INDEX IF NOT EXISTS idx_daily_entries_highlighted 
ON public.daily_entries(is_highlighted) 
WHERE is_highlighted = true;
