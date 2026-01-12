import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { START_DATE } from '@/lib/constants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function WeightHistoryPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  // Memoize today to avoid recreating on every render
  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, 'yyyy-MM-dd');

  const fadeInUp = prefersReducedMotion
    ? { initial: {}, animate: {} }
    : {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
    };

  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 30 };

  // Fetch all weight entries from START_DATE to today
  const { data: weightEntries, isLoading } = useQuery({
    queryKey: ['weightHistory', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_entries')
        .select('date, current_weight')
        .gte('date', format(START_DATE, 'yyyy-MM-dd'))
        .lte('date', todayStr)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as { date: string; current_weight: number | null }[];
    },
  });

  // Generate all days from START_DATE to today and merge with weight data
  const weightHistory = useMemo(() => {
    const allDays = eachDayOfInterval({ start: START_DATE, end: today });

    // Create a map of date -> weight for quick lookup
    const weightMap = new Map<string, number | null>();
    weightEntries?.forEach((entry) => {
      weightMap.set(entry.date, entry.current_weight);
    });

    // Map each day to its weight (or null if missing)
    return allDays
      .map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return {
          date: dateStr,
          weight: weightMap.get(dateStr) ?? null,
        };
      })
      .reverse(); // Most recent first
  }, [weightEntries, today]);

  const handleBack = () => {
    haptics.light();
    // If there's history, go back; otherwise go to home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleDayClick = (dateStr: string) => {
    haptics.light();
    navigate(`/date/${dateStr}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <motion.button
            {...fadeInUp}
            transition={springTransition}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={handleBack}
            className="h-10 w-10 rounded-xl glass-card flex items-center justify-center hover:bg-secondary/50 transition-colors text-lg"
            aria-label="Go back"
          >
            ←
          </motion.button>
          <div>
            <motion.h1
              {...fadeInUp}
              transition={springTransition}
              className="text-2xl font-bold tracking-tight"
            >
              Weight History
            </motion.h1>
            <motion.p
              {...fadeInUp}
              transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.05 }}
              className="text-muted-foreground text-sm mt-0.5"
            >
              Track your progress over time
            </motion.p>
          </div>
        </div>
      </header>

      <main className="px-4 max-w-md mx-auto space-y-4">
        {/* Weight Progress Ring */}
        {!isLoading && weightHistory.length > 0 && (() => {
          // Find first and last recorded weights
          const entriesWithWeight = weightHistory.filter(e => e.weight !== null);
          if (entriesWithWeight.length < 1) return null;

          const latestWeight = entriesWithWeight[0]?.weight || 0;
          const startWeight = entriesWithWeight[entriesWithWeight.length - 1]?.weight || latestWeight;
          const weightChange = startWeight - latestWeight;
          const isLosingWeight = weightChange > 0;

          // Calculate progress (assume goal is 10kg loss from start, adjust as needed)
          const goalChange = 10; // kg to lose
          const progress = goalChange > 0 ? Math.min(Math.max((weightChange / goalChange) * 100, 0), 100) : 0;

          const ringColor = isLosingWeight ? 'rgb(34, 197, 94)' : 'rgb(249, 115, 22)';
          const ringBgColor = isLosingWeight ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.2)';

          const size = 120;
          const strokeWidth = 12;
          const radius = (size - strokeWidth) / 2;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (progress / 100) * circumference;

          return (
            <motion.div
              {...fadeInUp}
              transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.05 }}
              className="glass-card rounded-3xl p-6"
            >
              <div className="flex items-center gap-6">
                {/* Ring */}
                <div className="relative" style={{ width: size, height: size }}>
                  <svg
                    className="-rotate-90"
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                  >
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={ringBgColor}
                      strokeWidth={strokeWidth}
                    />
                    <motion.circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: offset }}
                      transition={prefersReducedMotion ? { duration: 0 } : {
                        type: 'spring',
                        stiffness: 50,
                        damping: 20
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold tabular-nums">
                      {latestWeight.toFixed(1)}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase">kg</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-2xl font-bold tabular-nums",
                      isLosingWeight ? "text-green-500" : "text-orange-500"
                    )}>
                      {isLosingWeight ? '-' : '+'}{Math.abs(weightChange).toFixed(1)} kg
                    </span>
                    {isLosingWeight && (
                      <svg className="w-4 h-4 text-green-500" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2L6 10M6 10L2 6M6 10L10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {!isLosingWeight && weightChange !== 0 && (
                      <svg className="w-4 h-4 text-orange-500" viewBox="0 0 12 12" fill="none">
                        <path d="M6 10L6 2M6 2L2 6M6 2L10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">from {startWeight.toFixed(1)} kg</p>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                    <div>
                      <p className="text-sm font-bold tabular-nums">{startWeight.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground">Start</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold tabular-nums">{entriesWithWeight.length}</p>
                      <p className="text-[10px] text-muted-foreground">Days logged</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <motion.div
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.1 }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            {/* Table Header */}
            <div className="flex items-center px-5 py-3 border-b border-border/50 bg-secondary/30">
              <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Date
              </span>
              <span className="w-24 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Weight
              </span>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border/30">
              {weightHistory.map((entry, index) => {
                const date = parseISO(entry.date);
                const isToday = format(today, 'yyyy-MM-dd') === entry.date;

                return (
                  <motion.button
                    key={entry.date}
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                    animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                    transition={{
                      ...springTransition,
                      delay: prefersReducedMotion ? 0 : Math.min(index * 0.02, 0.3),
                    }}
                    onClick={() => handleDayClick(entry.date)}
                    className={cn(
                      "w-full flex items-center px-5 py-4 hover:bg-secondary/30 transition-colors text-left",
                      isToday && "bg-primary/5"
                    )}
                  >
                    <div className="flex-1">
                      <span className={cn(
                        "text-sm font-medium",
                        isToday && "text-primary"
                      )}>
                        {format(date, 'dd-MM-yy')}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(date, 'EEE')}
                      </span>
                      {isToday && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="w-24 text-right">
                      {entry.weight !== null ? (
                        <span className="text-sm font-semibold tabular-nums">
                          {entry.weight} kg
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {weightHistory.length === 0 && (
              <div className="px-5 py-12 text-center">
                <span className="text-4xl text-muted-foreground/50 block mb-3">⚖</span>
                <p className="text-muted-foreground text-sm">No weight data yet</p>
                <p className="text-muted-foreground/70 text-xs mt-1">
                  Start logging your weight in daily entries
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
