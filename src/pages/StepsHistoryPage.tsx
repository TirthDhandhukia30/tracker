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

export function StepsHistoryPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

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

  // Fetch all steps entries from START_DATE to today
  const { data: stepsEntries, isLoading } = useQuery({
    queryKey: ['stepsHistory', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_entries')
        .select('date, daily_steps')
        .gte('date', format(START_DATE, 'yyyy-MM-dd'))
        .lte('date', todayStr)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as { date: string; daily_steps: number | null }[];
    },
  });

  // Generate all days from START_DATE to today and merge with steps data
  const stepsHistory = useMemo(() => {
    const allDays = eachDayOfInterval({ start: START_DATE, end: today });

    const stepsMap = new Map<string, number | null>();
    stepsEntries?.forEach((entry) => {
      stepsMap.set(entry.date, entry.daily_steps);
    });

    return allDays
      .map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return {
          date: dateStr,
          steps: stepsMap.get(dateStr) ?? null,
        };
      })
      .reverse();
  }, [stepsEntries, today]);

  // Calculate stats
  const stats = useMemo(() => {
    const entriesWithSteps = stepsHistory.filter(e => e.steps !== null && e.steps > 0);
    if (entriesWithSteps.length === 0) {
      return { average: 0, total: 0, best: 0, daysLogged: 0 };
    }

    const total = entriesWithSteps.reduce((sum, e) => sum + (e.steps || 0), 0);
    const average = Math.round(total / entriesWithSteps.length);
    const best = Math.max(...entriesWithSteps.map(e => e.steps || 0));

    return { average, total, best, daysLogged: entriesWithSteps.length };
  }, [stepsHistory]);

  const handleBack = () => {
    haptics.light();
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

  const formatSteps = (steps: number) => {
    if (steps >= 1000) {
      return `${Math.round(steps / 1000)}K`;
    }
    return steps.toString();
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
              Steps History
            </motion.h1>
            <motion.p
              {...fadeInUp}
              transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.05 }}
              className="text-muted-foreground text-sm mt-0.5"
            >
              Track your daily activity
            </motion.p>
          </div>
        </div>
      </header>

      <main className="px-4 max-w-md mx-auto space-y-4">
        {/* Weekly Progress Ring */}
        {!isLoading && stats.daysLogged > 0 && (
          <motion.div
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.05 }}
            className="glass-card rounded-3xl p-6"
          >
            {(() => {
              // Calculate current week's steps
              const getWeekStart = () => {
                const now = new Date();
                const dayOfWeek = now.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const monday = new Date(now);
                monday.setDate(now.getDate() + mondayOffset);
                return monday;
              };

              const weekStart = getWeekStart();
              const weeklyGoal = 70000;

              // Sum steps from this week
              const thisWeekSteps = stepsHistory
                .filter(e => {
                  const entryDate = parseISO(e.date);
                  return entryDate >= weekStart && entryDate <= today;
                })
                .reduce((sum, e) => sum + (e.steps || 0), 0);

              const weeklyPercent = Math.min((thisWeekSteps / weeklyGoal) * 100, 100);
              const isGoalMet = thisWeekSteps >= weeklyGoal;

              const ringColor = isGoalMet ? 'rgb(34, 197, 94)' : 'rgb(6, 182, 212)';
              const ringBgColor = isGoalMet ? 'rgba(34, 197, 94, 0.2)' : 'rgba(6, 182, 212, 0.2)';

              const size = 120;
              const strokeWidth = 12;
              const radius = (size - strokeWidth) / 2;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference - (weeklyPercent / 100) * circumference;

              return (
                <>
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
                          {Math.round(weeklyPercent)}%
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase">Weekly</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-2xl font-bold tabular-nums">
                          {(thisWeekSteps / 1000).toFixed(1)}K
                        </p>
                        <p className="text-xs text-muted-foreground">of 70K goal</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                        <div>
                          <p className="text-sm font-bold tabular-nums">{formatSteps(stats.average)}</p>
                          <p className="text-[10px] text-muted-foreground">Daily avg</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold tabular-nums">{formatSteps(stats.best)}</p>
                          <p className="text-[10px] text-muted-foreground">Best day</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

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
                Steps
              </span>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border/30">
              {stepsHistory.map((entry, index) => {
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
                      {entry.steps !== null && entry.steps > 0 ? (
                        <span className="text-sm font-semibold tabular-nums">
                          {entry.steps.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {stepsHistory.length === 0 && (
              <div className="px-5 py-12 text-center">
                <span className="text-4xl text-muted-foreground/50 block mb-3">👟</span>
                <p className="text-muted-foreground text-sm">No steps data yet</p>
                <p className="text-muted-foreground/70 text-xs mt-1">
                  Start logging your steps in daily entries
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
