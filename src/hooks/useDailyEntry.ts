import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { DailyEntry, GymType } from '@/types';

const createDefaultEntry = (date: string): DailyEntry => ({
  id: '',
  date,
  book_reading: false,
  work_done: false,
  gym_type: 'rest',
  exercises: [],
  current_weight: undefined,
  daily_steps: undefined,
  note: '',
  sleep_hours: undefined,
  energy_level: undefined,
  gratitude: '',
  is_highlighted: false,
});

export function useDailyEntry(dateStr: string) {
  const [entry, setEntry] = useState<DailyEntry>(createDefaultEntry(dateStr));
  const [status, setStatus] = useState<'loading' | 'synced' | 'saving' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track if we've done the initial load to prevent saving default values
  const hasLoadedRef = useRef(false);
  // Track the last saved JSON to prevent unnecessary saves
  const lastSavedRef = useRef<string>('');
  // Track pending save timeout
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when date changes
  useEffect(() => {
    hasLoadedRef.current = false;
    lastSavedRef.current = '';
    setEntry(createDefaultEntry(dateStr));
    setStatus('loading');
    setErrorMessage(null);
  }, [dateStr]);

  // Load entry from Supabase
  useEffect(() => {
    let cancelled = false;

    const loadEntry = async () => {
      try {
        console.log(`[useDailyEntry] Loading entry for date: ${dateStr}`);

        const { data, error } = await supabase
          .from('daily_entries')
          .select('*')
          .eq('date', dateStr)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error('[useDailyEntry] Load error:', error);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }

        if (data) {
          console.log('[useDailyEntry] Loaded existing entry:', data);
          setEntry(data);
          lastSavedRef.current = JSON.stringify(data);
        } else {
          console.log('[useDailyEntry] No entry found, using defaults');
          const defaultData = createDefaultEntry(dateStr);
          setEntry(defaultData);
          lastSavedRef.current = JSON.stringify(defaultData);
        }

        hasLoadedRef.current = true;
        setStatus('synced');
      } catch (err: any) {
        if (cancelled) return;
        console.error('[useDailyEntry] Load exception:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Failed to load');
      }
    };

    loadEntry();

    return () => { cancelled = true; };
  }, [dateStr]);

  // Save function
  const saveToSupabase = useCallback(async (entryToSave: DailyEntry) => {
    console.log('[useDailyEntry] Saving entry:', entryToSave);
    setStatus('saving');
    setErrorMessage(null);

    try {
      const payload = {
        date: entryToSave.date,
        book_reading: entryToSave.book_reading,
        reading_note: entryToSave.reading_note || null,
        work_done: entryToSave.work_done,
        work_note: entryToSave.work_note || null,
        gym_type: entryToSave.gym_type,
        exercises: entryToSave.exercises,
        current_weight: entryToSave.current_weight || null,
        daily_steps: entryToSave.daily_steps || null,
        note: entryToSave.note || null,
        gratitude: entryToSave.gratitude || null,
        is_highlighted: entryToSave.is_highlighted || false,
      };

      console.log('[useDailyEntry] Payload:', payload);

      const { data, error } = await supabase
        .from('daily_entries')
        .upsert(payload, { onConflict: 'date' })
        .select()
        .single();

      if (error) {
        console.error('[useDailyEntry] Save error from Supabase:', error);
        setStatus('error');
        setErrorMessage(error.message);
        return;
      }

      console.log('[useDailyEntry] Save successful:', data);

      // Update the ref with saved data so we don't re-save the same thing
      if (data) {
        lastSavedRef.current = JSON.stringify(data);
        // Update entry with server-generated fields (like id)
        setEntry(prev => ({ ...prev, id: data.id }));
      }

      setStatus('synced');
    } catch (err: any) {
      console.error('[useDailyEntry] Save exception:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to save');
    }
  }, []);

  // Watch for changes and trigger save
  useEffect(() => {
    // Don't save if we haven't loaded yet
    if (!hasLoadedRef.current) return;

    // Don't save if we're in loading state
    if (status === 'loading') return;

    const currentJson = JSON.stringify(entry);

    // Don't save if nothing changed
    if (currentJson === lastSavedRef.current) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(() => {
      saveToSupabase(entry);
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [entry, status, saveToSupabase]);

  // Helper to update specific fields
  const updateEntry = useCallback((updates: Partial<DailyEntry>) => {
    setEntry(prev => ({ ...prev, ...updates }));
  }, []);

  // Toggle habit helper
  const toggleHabit = useCallback((key: 'book_reading' | 'work_done') => {
    setEntry(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Set gym type helper
  const setGymType = useCallback((gymType: GymType) => {
    setEntry(prev => ({ ...prev, gym_type: gymType }));
  }, []);
  // Copy last workout helper
  const copyLastWorkout = useCallback(async (currentGymType: GymType) => {
    if (currentGymType === 'rest') return false;

    try {
      // Find the last entry with the same gym type before the current date
      const { data } = await supabase
        .from('daily_entries')
        .select('exercises')
        .eq('gym_type', currentGymType)
        .lt('date', dateStr)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.exercises && Array.isArray(data.exercises) && data.exercises.length > 0) {
        updateEntry({ exercises: data.exercises });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to copy workout', error);
      return false;
    }
  }, [dateStr, updateEntry]);

  return {
    entry,
    setEntry,
    updateEntry,
    status,
    errorMessage,
    toggleHabit,
    setGymType,
    copyLastWorkout,
  };
}
