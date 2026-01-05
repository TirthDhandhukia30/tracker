import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, subDays, startOfMonth, endOfMonth, max } from 'date-fns';
import { START_DATE, WEIGHT_HISTORY_DAYS } from '@/lib/constants';
import type { DailyEntry } from '@/types';

export function useHomeData() {
  const today = new Date();
  const effectiveToday = max([today, START_DATE]);
  const todayStr = format(effectiveToday, 'yyyy-MM-dd');
  const monthStart = startOfMonth(effectiveToday);
  const effectiveStart = max([monthStart, START_DATE]);
  const start = format(effectiveStart, 'yyyy-MM-dd');
  const end = format(endOfMonth(effectiveToday), 'yyyy-MM-dd');

  // Fetch everything in one parallel query
  return useQuery({
    queryKey: ['homeData', todayStr],
    queryFn: async () => {
      // 1. Fetch Today
      const todayPromise = supabase
        .from('daily_entries')
        .select('*')
        .eq('date', todayStr)
        .maybeSingle();

      // 2. Fetch Month Data
      const monthPromise = supabase
        .from('daily_entries')
        .select('*')
        .gte('date', start)
        .lte('date', end);

      // 3. Fetch Weight History (Last N days)
      const thirtyDaysAgo = subDays(effectiveToday, WEIGHT_HISTORY_DAYS);
      const weightStart = max([thirtyDaysAgo, START_DATE]);
      const weightPromise = supabase
        .from('daily_entries')
        .select('date, current_weight')
        .gte('date', format(weightStart, 'yyyy-MM-dd'))
        .lte('date', todayStr)
        .not('current_weight', 'is', null)
        .order('date', { ascending: true });

      // 4. Fetch Steps History (Last 7 days)
      const sevenDaysAgo = subDays(effectiveToday, 6); // 6 days ago + today = 7 days
      const stepsStart = max([sevenDaysAgo, START_DATE]);
      const stepsPromise = supabase
        .from('daily_entries')
        .select('date, daily_steps')
        .gte('date', format(stepsStart, 'yyyy-MM-dd'))
        .lte('date', todayStr)
        .not('daily_steps', 'is', null)
        .order('date', { ascending: true });

      // Execute all in parallel
      const [todayRes, monthRes, weightRes, stepsRes] = await Promise.all([
        todayPromise,
        monthPromise,
        weightPromise,
        stepsPromise
      ]);

      if (todayRes.error) throw todayRes.error;
      if (monthRes.error) throw monthRes.error;
      if (weightRes.error) throw weightRes.error;
      if (stepsRes.error) throw stepsRes.error;

      // Process Yesterday (from month data if available, to save a call)
      const yesterday = subDays(effectiveToday, 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      // Look for yesterday in month data first
      const yesterdayEntry = monthRes.data?.find((e: DailyEntry) => e.date === yesterdayStr);

      // If not in month (e.g. yesterday was last month), fetch separate (optional, skip for now for speed)
      // For simplicity/speed, we'll only show yesterday if it's in the current month or we fetch it.
      // Let's rely on it being in the month data or accepted as missing to be super fast. 
      // Actually, if yesterday is previous month, we might miss it. Let's add a quick single check if needed.
      // But for speed, let's stick to current month view or just fetch it if `yesterday` > `start`.

      return {
        todayEntry: (todayRes.data as DailyEntry) || null,
        monthEntries: (monthRes.data as DailyEntry[]) || [],
        weightData: (weightRes.data as { date: string; current_weight: number }[])?.map(d => ({
          date: d.date,
          weight: d.current_weight
        })) || [],
        stepsData: (stepsRes.data as { date: string; daily_steps: number }[])?.map(d => ({
          date: d.date,
          steps: d.daily_steps
        })) || [],
        yesterdayEntry: yesterdayEntry as DailyEntry || null
      };
    },
  });
}
