import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameWeek, isBefore } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { START_DATE } from '@/lib/constants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown01Icon, ArrowRight01Icon, ArrowLeft01Icon } from 'hugeicons-react';

interface DayEntry {
  date: string;
  steps: number | null;
}

interface WeekGroup {
  type: 'week';
  weekStart: Date;
  weekEnd: Date;
  label: string;
  totalSteps: number;
  days: DayEntry[];
  isComplete: boolean;
}

interface MonthGroup {
  type: 'month';
  monthStart: Date;
  monthEnd: Date;
  label: string;
  totalSteps: number;
  weeks: WeekGroup[];
  isComplete: boolean;
}



export function StepsHistoryPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

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

  // Generate grouped data structure
  const { groupedHistory, stats } = useMemo(() => {
    const allDays = eachDayOfInterval({ start: START_DATE, end: today });

    const stepsMap = new Map<string, number | null>();
    stepsEntries?.forEach((entry) => {
      stepsMap.set(entry.date, entry.daily_steps);
    });

    const dayEntries: DayEntry[] = allDays.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: dateStr,
        steps: stepsMap.get(dateStr) ?? null,
      };
    });

    // Group days into weeks
    const weekGroups: WeekGroup[] = [];
    let currentWeekDays: DayEntry[] = [];
    let currentWeekStart: Date | null = null;

    for (const dayEntry of dayEntries) {
      const entryDate = parseISO(dayEntry.date);
      const weekStart = startOfWeek(entryDate, { weekStartsOn: 1 }); // Monday

      if (!currentWeekStart || format(weekStart, 'yyyy-MM-dd') !== format(currentWeekStart, 'yyyy-MM-dd')) {
        // Save previous week if exists
        if (currentWeekDays.length > 0 && currentWeekStart) {
          const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
          weekGroups.push({
            type: 'week',
            weekStart: currentWeekStart,
            weekEnd,
            label: `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
            totalSteps: currentWeekDays.reduce((sum, d) => sum + (d.steps || 0), 0),
            days: [...currentWeekDays],
            isComplete: isBefore(weekEnd, today), // Complete if week end is before today
          });
        }
        currentWeekStart = weekStart;
        currentWeekDays = [];
      }
      currentWeekDays.push(dayEntry);
    }

    // Don't forget the last week
    if (currentWeekDays.length > 0 && currentWeekStart) {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      weekGroups.push({
        type: 'week',
        weekStart: currentWeekStart,
        weekEnd,
        label: `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
        totalSteps: currentWeekDays.reduce((sum, d) => sum + (d.steps || 0), 0),
        days: [...currentWeekDays],
        isComplete: isBefore(weekEnd, today),

      });
    }

    // Group weeks into months
    const monthGroups: MonthGroup[] = [];
    let currentMonthWeeks: WeekGroup[] = [];
    let currentMonthStart: Date | null = null;

    for (const weekGroup of weekGroups) {
      const monthStart = startOfMonth(weekGroup.weekStart);

      if (!currentMonthStart || format(monthStart, 'yyyy-MM') !== format(currentMonthStart, 'yyyy-MM')) {
        // Save previous month if exists
        if (currentMonthWeeks.length > 0 && currentMonthStart) {
          const monthEnd = endOfMonth(currentMonthStart);
          monthGroups.push({
            type: 'month',
            monthStart: currentMonthStart,
            monthEnd,
            label: format(currentMonthStart, 'MMMM yyyy'),
            totalSteps: currentMonthWeeks.reduce((sum, w) => sum + w.totalSteps, 0),
            weeks: [...currentMonthWeeks],
            isComplete: isBefore(monthEnd, today),
          });
        }
        currentMonthStart = monthStart;
        currentMonthWeeks = [];
      }
      currentMonthWeeks.push(weekGroup);
    }

    // Don't forget the last month
    if (currentMonthWeeks.length > 0 && currentMonthStart) {
      const monthEnd = endOfMonth(currentMonthStart);
      monthGroups.push({
        type: 'month',
        monthStart: currentMonthStart,
        monthEnd,
        label: format(currentMonthStart, 'MMMM yyyy'),
        totalSteps: currentMonthWeeks.reduce((sum, w) => sum + w.totalSteps, 0),
        weeks: [...currentMonthWeeks],
        isComplete: isBefore(monthEnd, today),
      });
    }

    // Calculate stats
    const entriesWithSteps = dayEntries.filter(e => e.steps !== null && e.steps > 0);
    const statsResult = entriesWithSteps.length === 0
      ? { average: 0, total: 0, best: 0, daysLogged: 0 }
      : {
        total: entriesWithSteps.reduce((sum, e) => sum + (e.steps || 0), 0),
        average: Math.round(entriesWithSteps.reduce((sum, e) => sum + (e.steps || 0), 0) / entriesWithSteps.length),
        best: Math.max(...entriesWithSteps.map(e => e.steps || 0)),
        daysLogged: entriesWithSteps.length,
      };

    return {
      groupedHistory: monthGroups.reverse(), // Most recent first
      stats: statsResult,
    };
  }, [stepsEntries, today]);

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

  const toggleWeek = (weekKey: string) => {
    haptics.selection();
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekKey)) {
        next.delete(weekKey);
      } else {
        next.add(weekKey);
      }
      return next;
    });
  };

  const toggleMonth = (monthKey: string) => {
    haptics.selection();
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const formatSteps = (steps: number) => {
    if (steps >= 1000) {
      return `${(steps / 1000).toFixed(1)}K`;
    }
    return steps.toString();
  };

  const formatStepsShort = (steps: number) => {
    if (steps >= 1000) {
      return `${Math.round(steps / 1000)}K`;
    }
    return steps.toString();
  };

  const WEEKLY_GOAL = 70000;

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
            <ArrowLeft01Icon className="w-5 h-5" />
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
              const weeklyGoal = WEEKLY_GOAL;

              // Find current week's data
              const currentMonth = groupedHistory[0];
              const currentWeek = currentMonth?.weeks.find(w =>
                isSameWeek(w.weekStart, today, { weekStartsOn: 1 })
              );
              const thisWeekSteps = currentWeek?.totalSteps || 0;

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
                          {formatSteps(thisWeekSteps)}
                        </p>
                        <p className="text-xs text-muted-foreground">of 70K goal</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                        <div>
                          <p className="text-sm font-bold tabular-nums">{formatStepsShort(stats.average)}</p>
                          <p className="text-[10px] text-muted-foreground">Daily avg</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold tabular-nums">{formatStepsShort(stats.best)}</p>
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
            className="space-y-3"
          >
            {groupedHistory.map((month) => {
              const monthKey = format(month.monthStart, 'yyyy-MM');
              const isMonthExpanded = expandedMonths.has(monthKey) || !month.isComplete;

              return (
                <div key={monthKey} className="glass-card rounded-2xl overflow-hidden">
                  {/* Month Header - Only show as collapsible if complete */}
                  {month.isComplete ? (
                    <button
                      onClick={() => toggleMonth(monthKey)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isMonthExpanded ? (
                          <ArrowDown01Icon className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ArrowRight01Icon className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-semibold">{month.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {month.weeks.length} weeks • {month.weeks.reduce((sum, w) => sum + w.days.filter(d => d.steps).length, 0)} days logged
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums">{formatSteps(month.totalSteps)}</p>
                        <p className="text-[10px] text-muted-foreground">total</p>
                      </div>
                    </button>
                  ) : (
                    <div className="px-5 py-3 border-b border-border/30 bg-secondary/20">
                      <p className="text-sm font-semibold">{month.label}</p>
                    </div>
                  )}

                  {/* Month Content */}
                  <AnimatePresence initial={false}>
                    {(isMonthExpanded || !month.isComplete) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y divide-border/20">
                          {month.weeks.map((week) => {
                            const weekKey = format(week.weekStart, 'yyyy-MM-dd');
                            const isWeekExpanded = expandedWeeks.has(weekKey) || !week.isComplete;
                            const isGoalMet = week.totalSteps >= WEEKLY_GOAL;

                            return (
                              <div key={weekKey}>
                                {/* Week Header - Only collapsible if complete */}
                                {week.isComplete ? (
                                  <button
                                    onClick={() => toggleWeek(weekKey)}
                                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/20 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-6 flex justify-center">
                                        {isWeekExpanded ? (
                                          <ArrowDown01Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                        ) : (
                                          <ArrowRight01Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium">{week.label}</p>
                                      </div>
                                    </div>
                                    <span className={cn(
                                      "text-sm font-semibold tabular-nums",
                                      isGoalMet && "text-amber-400"
                                    )}>{formatSteps(week.totalSteps)}</span>
                                  </button>
                                ) : null}

                                {/* Week Days */}
                                <AnimatePresence initial={false}>
                                  {(isWeekExpanded || !week.isComplete) && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
                                      className="overflow-hidden bg-secondary/10"
                                    >
                                      {week.days.map((day) => {
                                        const date = parseISO(day.date);
                                        const isToday = format(today, 'yyyy-MM-dd') === day.date;

                                        return (
                                          <button
                                            key={day.date}
                                            onClick={() => handleDayClick(day.date)}
                                            className={cn(
                                              "w-full flex items-center px-5 py-3 hover:bg-secondary/30 transition-colors text-left",
                                              isToday && "bg-primary/5"
                                            )}
                                          >
                                            <div className="flex-1 pl-9">
                                              <span className={cn(
                                                "text-sm",
                                                isToday && "text-primary font-medium"
                                              )}>
                                                {format(date, 'EEE, MMM d')}
                                              </span>
                                              {isToday && (
                                                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                  Today
                                                </span>
                                              )}
                                            </div>
                                            <div className="w-20 text-right">
                                              {day.steps !== null && day.steps > 0 ? (
                                                <span className="text-sm font-medium tabular-nums">
                                                  {day.steps.toLocaleString()}
                                                </span>
                                              ) : (
                                                <span className="text-sm text-muted-foreground">—</span>
                                              )}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {groupedHistory.length === 0 && (
              <div className="glass-card rounded-2xl px-5 py-12 text-center">
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
