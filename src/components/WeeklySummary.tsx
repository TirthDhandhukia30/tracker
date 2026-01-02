import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isAfter } from 'date-fns';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ProgressRing } from './ProgressRing';
import type { DailyEntry } from '@/types';

interface WeeklySummaryProps {
  entries: DailyEntry[];
  className?: string;
}

export function WeeklySummary({ entries, className }: WeeklySummaryProps) {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const today = useMemo(() => new Date(), []);

  const stats = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    // Only count days up to today
    const daysUpToToday = weekDays.filter(day => !isAfter(day, today));
    const totalPossibleDays = daysUpToToday.length;

    // Map entries by date for quick lookup
    const entriesByDate = new Map<string, DailyEntry>();
    entries.forEach(entry => entriesByDate.set(entry.date, entry));

    let perfectDays = 0;
    let readingDays = 0;
    let workDays = 0;
    let gymDays = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    // Process each day (in reverse for streak calculation)
    const sortedDays = [...daysUpToToday].sort((a, b) => b.getTime() - a.getTime());
    
    daysUpToToday.forEach(day => {
      const entry = entriesByDate.get(format(day, 'yyyy-MM-dd'));
      if (entry) {
        if (entry.book_reading) readingDays++;
        if (entry.work_done) workDays++;
        if (entry.gym_type !== 'rest') gymDays++;
        const isComplete = entry.book_reading && entry.work_done && entry.gym_type !== 'rest';
        if (isComplete) perfectDays++;
      }
    });

    // Calculate current streak (consecutive perfect days from today backwards)
    for (const day of sortedDays) {
      const entry = entriesByDate.get(format(day, 'yyyy-MM-dd'));
      const isComplete = entry && entry.book_reading && entry.work_done && entry.gym_type !== 'rest';
      if (isComplete) {
        tempStreak++;
      } else {
        break;
      }
    }
    currentStreak = tempStreak;

    // Find best performing habit
    const habitCounts = [
      { name: 'Reading', count: readingDays },
      { name: 'Work', count: workDays },
      { name: 'Gym', count: gymDays },
    ];
    const bestHabit = habitCounts.reduce((a, b) => (a.count >= b.count ? a : b));

    // Weekly completion percentage
    const completionRate = totalPossibleDays > 0 
      ? Math.round((perfectDays / totalPossibleDays) * 100) 
      : 0;

    return {
      perfectDays,
      totalPossibleDays,
      currentStreak,
      completionRate,
      bestHabit,
      readingDays,
      workDays,
      gymDays,
    };
  }, [entries, today]);

  const fadeInUp = prefersReducedMotion
    ? { initial: {}, animate: {} }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 30 };

  const handleNavigateToCalendar = () => {
    haptics.light();
    navigate('/calendar');
  };

  return (
    <motion.section
      {...fadeInUp}
      transition={springTransition}
      className={cn('space-y-3', className)}
      aria-label="Weekly summary"
    >
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          This Week
        </h3>
        <span className="text-xs font-medium glass-subtle px-3 py-1.5 rounded-full">
          {format(startOfWeek(today, { weekStartsOn: 0 }), 'MMM d')} - {format(endOfWeek(today, { weekStartsOn: 0 }), 'MMM d')}
        </span>
      </div>

      {/* Simple Grid Layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Main Progress Ring */}
        <motion.button
          onClick={handleNavigateToCalendar}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          className="col-span-1 row-span-2 glass-card rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center"
        >
          <ProgressRing progress={stats.completionRate} size={90} strokeWidth={7}>
            <div className="text-center">
              <span className="text-xl font-bold">{stats.completionRate}%</span>
            </div>
          </ProgressRing>
          <p className="text-xs text-muted-foreground mt-1">Weekly Progress</p>
        </motion.button>

        {/* Streak Card */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className={cn(
            "glass-card rounded-2xl p-4 flex flex-col justify-between",
            stats.currentStreak >= 3 && "border-primary/30"
          )}
        >
          <span className={cn(
            "text-lg",
            stats.currentStreak >= 3 ? "text-primary" : "text-muted-foreground"
          )}>
            ★
          </span>
          <div className="mt-2">
            <motion.p
              className="text-2xl font-bold tabular-nums"
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              animate={prefersReducedMotion ? {} : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            >
              {stats.currentStreak}
            </motion.p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
        </motion.div>

        {/* Best Habit Card */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
          transition={{ ...springTransition, delay: 0.15 }}
          className="glass-card rounded-2xl p-4 flex flex-col justify-between"
        >
          <span className="text-lg text-muted-foreground">◆</span>
          <div className="mt-2">
            <p className="text-sm font-bold">
              {stats.bestHabit.name}
            </p>
            <p className="text-xs text-muted-foreground">Best habit</p>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
