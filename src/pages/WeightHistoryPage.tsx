import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isBefore } from 'date-fns';
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
  weight: number | null;
}

interface WeekGroup {
  type: 'week';
  weekStart: Date;
  weekEnd: Date;
  label: string;
  averageWeight: number | null;
  days: DayEntry[];
  isComplete: boolean;
}

interface MonthGroup {
  type: 'month';
  monthStart: Date;
  monthEnd: Date;
  label: string;
  averageWeight: number | null;
  weeks: WeekGroup[];
  isComplete: boolean;
}

export function WeightHistoryPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

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

  // Generate grouped data structure
  const { groupedHistory, stats } = useMemo(() => {
    const allDays = eachDayOfInterval({ start: START_DATE, end: today });

    // Create a map of date -> weight for quick lookup
    const weightMap = new Map<string, number | null>();
    weightEntries?.forEach((entry) => {
      weightMap.set(entry.date, entry.current_weight);
    });

    const dayEntries: DayEntry[] = allDays.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: dateStr,
        weight: weightMap.get(dateStr) ?? null,
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
          const weights = currentWeekDays.map(d => d.weight).filter((w): w is number => w !== null);
          const averageWeight = weights.length > 0
            ? weights.reduce((a, b) => a + b, 0) / weights.length
            : null;

          weekGroups.push({
            type: 'week',
            weekStart: currentWeekStart,
            weekEnd,
            label: `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
            averageWeight,
            days: [...currentWeekDays],
            isComplete: isBefore(weekEnd, today),
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
      const weights = currentWeekDays.map(d => d.weight).filter((w): w is number => w !== null);
      const averageWeight = weights.length > 0
        ? weights.reduce((a, b) => a + b, 0) / weights.length
        : null;

      weekGroups.push({
        type: 'week',
        weekStart: currentWeekStart,
        weekEnd,
        label: `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
        averageWeight,
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
          const weights = currentMonthWeeks
            .map(w => w.days)
            .flat()
            .map(d => d.weight)
            .filter((w): w is number => w !== null);

          const averageWeight = weights.length > 0
            ? weights.reduce((a, b) => a + b, 0) / weights.length
            : null;

          monthGroups.push({
            type: 'month',
            monthStart: currentMonthStart,
            monthEnd,
            label: format(currentMonthStart, 'MMMM yyyy'),
            averageWeight,
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
      const weights = currentMonthWeeks
        .map(w => w.days)
        .flat()
        .map(d => d.weight)
        .filter((w): w is number => w !== null);

      const averageWeight = weights.length > 0
        ? weights.reduce((a, b) => a + b, 0) / weights.length
        : null;

      monthGroups.push({
        type: 'month',
        monthStart: currentMonthStart,
        monthEnd,
        label: format(currentMonthStart, 'MMMM yyyy'),
        averageWeight,
        weeks: [...currentMonthWeeks],
        isComplete: isBefore(monthEnd, today),
      });
    }

    // Calculate overall stats
    const entriesWithWeight = dayEntries.filter(e => e.weight !== null);
    const latestWeight = entriesWithWeight[entriesWithWeight.length - 1]?.weight || 0;
    const startWeight = entriesWithWeight[0]?.weight || latestWeight;
    const weightChange = latestWeight - startWeight; // Use latest - start to show net change (+ gain, - loss)

    const statsResult = {
      latest: latestWeight,
      start: startWeight,
      change: weightChange,
      daysLogged: entriesWithWeight.length,
    };

    return {
      groupedHistory: monthGroups.reverse(), // Most recent first
      stats: statsResult,
    };
  }, [weightEntries, today]);

  const toggleWeek = (weekLabel: string) => {
    haptics.light();
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekLabel)) {
        next.delete(weekLabel);
      } else {
        next.add(weekLabel);
      }
      return next;
    });
  };

  const toggleMonth = (monthLabel: string) => {
    haptics.light();
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthLabel)) {
        next.delete(monthLabel);
      } else {
        next.add(monthLabel);
      }
      return next;
    });
  };

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
        {/* Stats Overview */}
        {!isLoading && stats.daysLogged > 0 && (
          <motion.div
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.05 }}
            className="glass-card rounded-3xl p-6 mb-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Latest</p>
                <p className="text-2xl font-bold tabular-nums">
                  {stats.latest.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Change</p>
                <p className={cn(
                  "text-2xl font-bold tabular-nums",
                  stats.change < 0 ? "text-green-500" : stats.change > 0 ? "text-orange-500" : "text-muted-foreground"
                )}>
                  {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* History Grouped by Month/Week */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              {groupedHistory.map((monthGroup, mIndex) => {
                const isMonthExpanded = expandedMonths.has(monthGroup.label) || mIndex === 0; // Default expand first month

                return (
                  <motion.div
                    key={monthGroup.label}
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                    transition={{ delay: mIndex * 0.05 }}
                    className="glass-card rounded-3xl overflow-hidden border border-border/40"
                  >
                    {/* Month Header */}
                    <button
                      onClick={() => toggleMonth(monthGroup.label)}
                      className="w-full flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-background/50 flex items-center justify-center text-muted-foreground">
                          {isMonthExpanded ? (
                            <ArrowDown01Icon className="w-4 h-4" />
                          ) : (
                            <ArrowRight01Icon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-sm">{monthGroup.label}</h3>
                          <p className="text-xs text-muted-foreground">
                            Avg: {monthGroup.averageWeight ? `${monthGroup.averageWeight.toFixed(1)} kg` : '—'}
                          </p>
                        </div>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isMonthExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-2 pb-2 pt-1 space-y-2">
                            {monthGroup.weeks.map((weekGroup) => {
                              const isWeekExpanded = expandedWeeks.has(weekGroup.label);

                              return (
                                <div key={weekGroup.label} className="rounded-2xl bg-background/30 overflow-hidden">
                                  {/* Week Header */}
                                  <button
                                    onClick={() => toggleWeek(weekGroup.label)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-background/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      {isWeekExpanded ? (
                                        <ArrowDown01Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                      ) : (
                                        <ArrowRight01Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                      )}
                                      <div className="text-left">
                                        <p className="text-xs font-medium">{weekGroup.label}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                          Avg: {weekGroup.averageWeight ? `${weekGroup.averageWeight.toFixed(1)} kg` : '—'}
                                        </p>
                                      </div>
                                    </div>
                                  </button>

                                  <AnimatePresence initial={false}>
                                    {isWeekExpanded && (
                                      <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="divide-y divide-border/20"
                                      >
                                        {weekGroup.days.map((day) => {
                                          const date = parseISO(day.date);
                                          const isToday = format(today, 'yyyy-MM-dd') === day.date;

                                          if (day.weight === null) return null; // Skip empty days in list view

                                          return (
                                            <button
                                              key={day.date}
                                              onClick={() => handleDayClick(day.date)}
                                              className={cn(
                                                "w-full flex items-center justify-between py-2.5 px-4 text-xs hover:bg-background/50 transition-colors",
                                                isToday && "bg-primary/5"
                                              )}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className={cn(
                                                  "font-medium",
                                                  isToday ? "text-primary" : "text-muted-foreground"
                                                )}>
                                                  {format(date, 'EEE, MMM d')}
                                                </span>
                                                {isToday && (
                                                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 rounded-full">
                                                    Today
                                                  </span>
                                                )}
                                              </div>
                                              <span className="font-semibold tabular-nums">
                                                {day.weight.toFixed(1)} kg
                                              </span>
                                            </button>
                                          );
                                        })}
                                        {weekGroup.days.every(d => d.weight === null) && (
                                          <div className="py-2 px-4 text-center text-[10px] text-muted-foreground">
                                            No data for this week
                                          </div>
                                        )}
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
                  </motion.div>
                );
              })}

              {groupedHistory.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <span className="text-4xl text-muted-foreground/50 block mb-3">⚖</span>
                  <p className="text-muted-foreground text-sm">No weight data yet</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
