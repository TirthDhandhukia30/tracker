import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';

interface StreakData {
  currentStreak: number;
  lastCheckedDate: string | null;
  isCheckedToday: boolean;
  canRestore: boolean; // True if can restore a broken streak (missed 1-2 days)
  missedDays: number; // Days missed if restoration is possible
}

export function useStreak() {
  const queryClient = useQueryClient();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['streak', todayStr],
    queryFn: async (): Promise<StreakData> => {
      // Fetch all entries with streak_check, ordered by date desc
      const { data: entries, error } = await supabase
        .from('daily_entries')
        .select('date, streak_check')
        .eq('streak_check', true)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!entries || entries.length === 0) {
        return {
          currentStreak: 0,
          lastCheckedDate: null,
          isCheckedToday: false,
          canRestore: false,
          missedDays: 0,
        };
      }

      const checkedDates = entries.map(e => e.date);
      const isCheckedToday = checkedDates.includes(todayStr);

      // Calculate current streak
      let streak = 0;
      let checkDate = today;

      // If not checked today, start from yesterday
      if (!isCheckedToday) {
        checkDate = subDays(today, 1);
      }

      // Count consecutive days
      while (true) {
        const checkStr = format(checkDate, 'yyyy-MM-dd');
        if (checkedDates.includes(checkStr)) {
          streak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      }

      // If not checked today and streak > 0, the streak is from previous days
      // Determine if restoration is possible
      let canRestore = false;
      let missedDays = 0;

      if (!isCheckedToday && entries.length > 0) {
        const lastCheckedDate = parseISO(entries[0].date);
        const daysDiff = differenceInDays(today, lastCheckedDate);

        // Allow restoration if missed 1-2 days
        if (daysDiff >= 2 && daysDiff <= 3) {
          canRestore = true;
          missedDays = daysDiff - 1; // Days between last check and today
        }
      }

      // If today is not checked and last check was yesterday, streak is still valid
      // Just needs to be checked today
      const lastCheckedDate = entries.length > 0 ? entries[0].date : null;

      return {
        currentStreak: streak,
        lastCheckedDate,
        isCheckedToday,
        canRestore,
        missedDays,
      };
    },
    staleTime: 30000,
  });

  // Mutation to restore streak by filling in missed days
  const restoreStreak = useMutation({
    mutationFn: async () => {
      if (!data?.canRestore || !data?.lastCheckedDate) {
        throw new Error('Cannot restore streak');
      }

      const lastDate = parseISO(data.lastCheckedDate);
      const missedDates: string[] = [];

      // Find all dates between lastCheckedDate and today (exclusive of both)
      for (let i = 1; i <= data.missedDays; i++) {
        const missedDate = subDays(today, data.missedDays - i + 1);
        if (missedDate > lastDate && missedDate < today) {
          missedDates.push(format(missedDate, 'yyyy-MM-dd'));
        }
      }

      // Upsert entries for missed dates with streak_check = true
      for (const date of missedDates) {
        await supabase
          .from('daily_entries')
          .upsert(
            { date, streak_check: true },
            { onConflict: 'date' }
          );
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streak'] });
      queryClient.invalidateQueries({ queryKey: ['homeData'] });
    },
  });

  return {
    streak: data?.currentStreak ?? 0,
    lastCheckedDate: data?.lastCheckedDate ?? null,
    isCheckedToday: data?.isCheckedToday ?? false,
    canRestore: data?.canRestore ?? false,
    missedDays: data?.missedDays ?? 0,
    isLoading,
    restoreStreak: restoreStreak.mutate,
    isRestoring: restoreStreak.isPending,
  };
}
