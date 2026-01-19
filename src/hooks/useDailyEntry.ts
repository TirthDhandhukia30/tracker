import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { DailyEntry, GymType } from '@/types';

const createDefaultEntry = (date: string): DailyEntry => ({
  id: '',
  date,
  running: false,
  work_done: false,
  streak_check: false,
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

  const hasLoadedRef = useRef(false);
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hasLoadedRef.current = false;
    lastSavedRef.current = '';
    setEntry(createDefaultEntry(dateStr));
    setStatus('loading');
    setErrorMessage(null);
  }, [dateStr]);

  useEffect(() => {
    let cancelled = false;

    const loadEntry = async () => {
      try {
        const { data, error } = await supabase
          .from('daily_entries')
          .select('*')
          .eq('date', dateStr)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }

        if (data) {
          setEntry(data);
          lastSavedRef.current = JSON.stringify(data);
        } else {
          const defaultData = createDefaultEntry(dateStr);
          setEntry(defaultData);
          lastSavedRef.current = JSON.stringify(defaultData);
        }

        hasLoadedRef.current = true;
        setStatus('synced');
      } catch (err: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(err.message || 'Failed to load');
      }
    };

    loadEntry();
    return () => { cancelled = true; };
  }, [dateStr]);

  const saveToSupabase = useCallback(async (entryToSave: DailyEntry) => {
    setStatus('saving');
    setErrorMessage(null);

    try {
      const payload = {
        date: entryToSave.date,
        running: entryToSave.running,
        running_note: entryToSave.running_note || null,
        work_done: entryToSave.work_done,
        work_note: entryToSave.work_note || null,
        streak_check: entryToSave.streak_check || false,
        gym_type: entryToSave.gym_type,
        exercises: entryToSave.exercises,
        current_weight: entryToSave.current_weight || null,
        daily_steps: entryToSave.daily_steps || null,
        sleep_hours: entryToSave.sleep_hours || null,
        energy_level: entryToSave.energy_level || null,
        note: entryToSave.note || null,
        gratitude: entryToSave.gratitude || null,
        is_highlighted: entryToSave.is_highlighted || false,
      };

      const { data, error } = await supabase
        .from('daily_entries')
        .upsert(payload, { onConflict: 'date' })
        .select()
        .single();

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
        return;
      }

      if (data) {
        lastSavedRef.current = JSON.stringify(data);
        setEntry(prev => ({ ...prev, id: data.id }));
      }

      setStatus('synced');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to save');
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (status === 'loading') return;

    const currentJson = JSON.stringify(entry);
    if (currentJson === lastSavedRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToSupabase(entry);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [entry, status, saveToSupabase]);

  const updateEntry = useCallback((updates: Partial<DailyEntry>) => {
    setEntry(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleHabit = useCallback((key: 'running' | 'work_done' | 'streak_check') => {
    setEntry(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setGymType = useCallback((gymType: GymType) => {
    setEntry(prev => ({ ...prev, gym_type: gymType }));
  }, []);

  const copyLastWorkout = useCallback(async (currentGymType: GymType) => {
    if (currentGymType === 'rest') return false;

    try {
      const { data } = await supabase
        .from('daily_entries')
        .select('exercises')
        .eq('gym_type', currentGymType)
        .lt('date', dateStr)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.exercises && Array.isArray(data.exercises) && data.exercises.length > 0) {
        updateEntry({ exercises: data.exercises });
        return true;
      }
      return false;
    } catch {
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

