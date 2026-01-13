import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDayOfYear } from 'date-fns';
import { useHomeData } from '@/hooks/useHomeData';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { motion } from 'framer-motion';
import { WeightChart } from '@/components/WeightChart';

import { Skeleton, SkeletonCard, SkeletonChart, SkeletonCalendar } from '@/components/ui/skeleton';

const QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Every day is a new opportunity to change your life.", author: "Unknown" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
];

export function HomePage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const fadeInUp = prefersReducedMotion
    ? { initial: {}, animate: {} }
    : {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 }
    };

  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 30 };

  const quote = useMemo(() => {
    const dayIndex = getDayOfYear(today);
    return QUOTES[dayIndex % QUOTES.length];
  }, [todayStr]);

  const { data, isLoading } = useHomeData();
  const todayEntry = data?.todayEntry || null;
  const monthEntries = data?.monthEntries || [];
  const weightData = data?.weightData || [];
  const stepsData = data?.stepsData || [];

  const monthDays = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });

  const todayCompletedCount = todayEntry
    ? [todayEntry.running, todayEntry.work_done, todayEntry.gym_type !== 'rest'].filter(Boolean).length
    : 0;

  const isTodayComplete = todayCompletedCount === 3;



  const handleNavigate = (path: string) => {
    haptics.light();
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <motion.h1
          {...fadeInUp}
          transition={springTransition}
          className="text-3xl font-bold tracking-tight"
        >
          {format(today, 'EEEE')}
        </motion.h1>
        <motion.p
          {...fadeInUp}
          transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.05 }}
          className="text-muted-foreground font-medium mt-1"
        >
          {format(today, 'MMMM do')}
        </motion.p>
      </header>

      {isLoading ? (
        <main className="px-4 space-y-6 max-w-md mx-auto" aria-busy="true" aria-label="Loading content">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <SkeletonCard />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-40 rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-[76px] rounded-2xl" />
              <Skeleton className="h-[76px] rounded-2xl" />
            </div>
          </div>
          <SkeletonChart />
          <SkeletonCalendar />
        </main>
      ) : (
        <main className="px-4 space-y-6 max-w-md mx-auto" role="main">

          {/* Daily Quote */}
          <motion.aside
            {...fadeInUp}
            transition={springTransition}
            aria-label="Daily inspiration"
          >
            <div className="glass-subtle rounded-2xl p-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-2 text-muted-foreground/40">
                <path d="M9 5a2 2 0 0 1 2 2v6c0 3.13 -1.65 5.193 -4.757 5.97a1 1 0 1 1 -.486 -1.94c2.227 -.557 3.243 -1.827 3.243 -4.03v-1h-3a2 2 0 0 1 -1.995 -1.85l-.005 -.15v-3a2 2 0 0 1 2 -2z" />
                <path d="M18 5a2 2 0 0 1 2 2v6c0 3.13 -1.65 5.193 -4.757 5.97a1 1 0 1 1 -.486 -1.94c2.227 -.557 3.243 -1.827 3.243 -4.03v-1h-3a2 2 0 0 1 -1.995 -1.85l-.005 -.15v-3a2 2 0 0 1 2 -2z" />
              </svg>
              <blockquote>
                <p className="text-sm font-medium text-foreground/80 italic leading-relaxed">
                  {quote.text}
                </p>
                <footer className="text-[11px] text-muted-foreground mt-2">— {quote.author}</footer>
              </blockquote>
            </div>
          </motion.aside>

          {/* Today Card - Compact */}
          <motion.button
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            onClick={() => handleNavigate(`/date/${todayStr}`)}
            aria-label={isTodayComplete
              ? "Today's entry complete. Tap to view or edit."
              : "Log today's habits. Tap to open."}
            className={cn(
              "w-full group relative overflow-hidden rounded-2xl p-4 text-left transition-all",
              isTodayComplete
                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                : "glass-card hover:shadow-glass-lg"
            )}
          >
            <div className="flex items-center gap-4">
              {/* Left: Date + Status */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold",
                  isTodayComplete ? "text-white" : "text-foreground"
                )}>
                  {format(today, 'EEEE')}
                </p>
                <p className={cn(
                  "text-xs",
                  isTodayComplete ? "text-white/70" : "text-muted-foreground"
                )}>
                  {isTodayComplete ? "All done" : `${todayCompletedCount} of 3`}
                </p>
              </div>

              {/* Center: Three habit dots */}
              <div className="flex items-center gap-2">
                {[
                  { done: todayEntry?.running || false },
                  { done: todayEntry?.work_done || false },
                  { done: (todayEntry?.gym_type || 'rest') !== 'rest' },
                ].map((habit, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                      habit.done
                        ? (isTodayComplete ? "bg-white/25" : "bg-primary")
                        : (isTodayComplete ? "bg-white/10" : "bg-secondary/60")
                    )}
                  >
                    {habit.done && (
                      <svg className={cn("w-4 h-4", isTodayComplete ? "text-white" : "text-primary-foreground")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5l10 -10" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {/* Right: Arrow */}
              <svg
                className={cn(
                  "w-5 h-5 transition-transform group-hover:translate-x-0.5",
                  isTodayComplete ? "text-white/60" : "text-muted-foreground"
                )}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 6l6 6l-6 6" />
              </svg>
            </div>
          </motion.button>

          {/* Weight Chart */}
          {weightData.length > 0 && (
            <motion.section
              {...fadeInUp}
              transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.1 }}
              aria-label="Weight tracking chart"
            >
              <WeightChart data={weightData} />
            </motion.section>
          )}

          {/* Steps Tracker */}
          <motion.section
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.15 }}
            aria-label="Steps tracking"
          >
            <button
              onClick={() => handleNavigate('/steps-history')}
              className="w-full glass-card rounded-3xl p-5 text-left transition-all hover:shadow-glass-lg active:scale-[0.99]"
              aria-label="View steps history"
            >
              {(() => {
                const WEEKLY_GOAL = 70000;

                // Get the current week (Monday to Sunday)
                const getWeekDays = () => {
                  const now = new Date();
                  const dayOfWeek = now.getDay();
                  // Adjust so Monday = 0, Sunday = 6
                  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                  const monday = new Date(now);
                  monday.setDate(now.getDate() + mondayOffset);

                  return Array.from({ length: 7 }, (_, i) => {
                    const date = new Date(monday);
                    date.setDate(monday.getDate() + i);
                    return format(date, 'yyyy-MM-dd');
                  });
                };

                const weekDays = getWeekDays();
                const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

                // Calculate weekly total
                const weeklySteps = weekDays.reduce((sum, dateStr) => {
                  const dayData = stepsData.find(d => d.date === dateStr);
                  return sum + (dayData?.steps || 0);
                }, 0);

                const progressPercent = Math.min((weeklySteps / WEEKLY_GOAL) * 100, 100);
                const isGoalMet = weeklySteps >= WEEKLY_GOAL;

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                          <svg className="w-4 h-4 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 16v-2.38c0-.73.25-1.42.67-1.97l.61-.84c.51-.71.32-1.74-.45-2.15a1.51 1.51 0 0 1-.49-2.27l1.61-1.89a1.5 1.5 0 0 1 2.54.47l.52 1.57c.27.82 1.04 1.36 1.9 1.36h1.18" />
                            <path d="M20 16v-2.38c0-.73-.25-1.42-.67-1.97l-.61-.84c-.51-.71-.32-1.74.45-2.15a1.51 1.51 0 0 0 .49-2.27l-1.61-1.89a1.5 1.5 0 0 0-2.54.47l-.52 1.57c-.27.82-1.04 1.36-1.9 1.36h-1.18" />
                            <path d="M8 20h8" />
                            <path d="M12 16v4" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Weekly Steps</h3>
                      </div>
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-lg",
                        isGoalMet ? "bg-green-500/15 text-green-600 dark:text-green-400" : "text-muted-foreground"
                      )}>
                        {(weeklySteps / 1000).toFixed(1)}K / 70K
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-secondary/50 rounded-full overflow-hidden mb-5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 100, damping: 20 }}
                        className={cn(
                          "h-full rounded-full",
                          isGoalMet ? "bg-green-500" : "bg-primary"
                        )}
                      />
                    </div>

                    {/* Weekly breakdown */}
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((dateStr, i) => {
                        const dayData = stepsData.find(d => d.date === dateStr);
                        const steps = dayData?.steps || 0;
                        const isToday = dateStr === todayStr;
                        const isFutureDay = new Date(dateStr) > today;
                        const dailyGoal = 10000; // 10K per day for 70K weekly
                        const dayProgress = Math.min((steps / dailyGoal) * 100, 100);

                        return (
                          <div
                            key={dateStr}
                            className={cn(
                              "flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors",
                              isToday && "bg-primary/10"
                            )}
                          >
                            <span className={cn(
                              "text-[10px] font-medium",
                              isToday ? "text-primary" : "text-muted-foreground"
                            )}>
                              {dayLabels[i]}
                            </span>

                            {/* Mini progress circle */}
                            <div className="relative h-8 w-8">
                              <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  className="text-secondary/50"
                                />
                                {!isFutureDay && (
                                  <motion.circle
                                    cx="16"
                                    cy="16"
                                    r="14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    className={cn(
                                      steps >= dailyGoal ? "text-green-500" : "text-primary"
                                    )}
                                    initial={{ strokeDasharray: "0 88" }}
                                    animate={{ strokeDasharray: `${(dayProgress / 100) * 88} 88` }}
                                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 100, damping: 20, delay: i * 0.05 }}
                                  />
                                )}
                              </svg>
                            </div>

                            <span className={cn(
                              "text-[10px] font-medium tabular-nums",
                              isFutureDay ? "text-muted-foreground/30" :
                                steps > 0 ? "text-foreground" : "text-muted-foreground/50"
                            )}>
                              {isFutureDay ? '—' : steps > 0 ? `${(steps / 1000).toFixed(1)}` : '0'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* View history indicator */}
                    <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground/60">
                      <span>View history</span>
                      <span className="ml-0.5">→</span>
                    </div>
                  </>
                );
              })()}
            </button>
          </motion.section>

          {/* Monthly Activity */}
          <motion.section
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.25 }}
            className="pb-4"
            aria-label="Monthly activity"
          >
            {(() => {
              const daysPassedThisMonth = monthDays.filter(d => d <= today).length;
              const runningCount = monthEntries.filter(e => e.running).length;
              const workCount = monthEntries.filter(e => e.work_done).length;
              const gymCount = monthEntries.filter(e => e.gym_type && e.gym_type !== 'rest').length;

              const rings = [
                {
                  label: 'Run',
                  count: runningCount,
                  total: daysPassedThisMonth,
                  color: 'rgb(239, 68, 68)', // red
                  bgColor: 'rgba(239, 68, 68, 0.2)',
                },
                {
                  label: 'Work',
                  count: workCount,
                  total: daysPassedThisMonth,
                  color: 'rgb(34, 197, 94)', // green
                  bgColor: 'rgba(34, 197, 94, 0.2)',
                },
                {
                  label: 'Gym',
                  count: gymCount,
                  total: daysPassedThisMonth,
                  color: 'rgb(59, 130, 246)', // blue
                  bgColor: 'rgba(59, 130, 246, 0.2)',
                },
              ];

              return (
                <div className="glass-card rounded-3xl p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-foreground">{format(today, 'MMMM')}</h3>
                    <span className="text-xs font-medium text-muted-foreground">
                      {daysPassedThisMonth} days
                    </span>
                  </div>

                  {/* Activity Rings */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-40 h-40">
                      {rings.map((ring, index) => {
                        const percent = ring.total > 0 ? (ring.count / ring.total) * 100 : 0;
                        const size = 160 - (index * 28);
                        const strokeWidth = 12;
                        const radius = (size - strokeWidth) / 2;
                        const circumference = 2 * Math.PI * radius;
                        const offset = circumference - (percent / 100) * circumference;

                        return (
                          <svg
                            key={ring.label}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
                            width={size}
                            height={size}
                            viewBox={`0 0 ${size} ${size}`}
                          >
                            {/* Background ring */}
                            <circle
                              cx={size / 2}
                              cy={size / 2}
                              r={radius}
                              fill="none"
                              stroke={ring.bgColor}
                              strokeWidth={strokeWidth}
                            />
                            {/* Progress ring */}
                            <motion.circle
                              cx={size / 2}
                              cy={size / 2}
                              r={radius}
                              fill="none"
                              stroke={ring.color}
                              strokeWidth={strokeWidth}
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset: offset }}
                              transition={prefersReducedMotion ? { duration: 0 } : {
                                type: 'spring',
                                stiffness: 50,
                                damping: 20,
                                delay: index * 0.1
                              }}
                            />
                          </svg>
                        );
                      })}

                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold tabular-nums">
                          {Math.round(((runningCount + workCount + gymCount) / (daysPassedThisMonth * 3)) * 100) || 0}%
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4">
                    {rings.map((ring) => {
                      const percent = ring.total > 0 ? Math.round((ring.count / ring.total) * 100) : 0;
                      return (
                        <div key={ring.label} className="text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: ring.color }}
                            />
                            <span className="text-xs font-medium text-muted-foreground">{ring.label}</span>
                          </div>
                          <div className="text-lg font-bold tabular-nums">{ring.count}</div>
                          <div className="text-[10px] text-muted-foreground">{percent}%</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Highlighted Days */}
                  {(() => {
                    const highlightedDays = monthEntries.filter(e => e.is_highlighted);
                    if (highlightedDays.length === 0) return null;

                    return (
                      <div className="mt-6 pt-4 border-t border-border/30">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span className="text-xs font-medium text-muted-foreground">
                            {highlightedDays.length} special {highlightedDays.length === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {highlightedDays.map(day => (
                            <button
                              key={day.date}
                              onClick={() => handleNavigate(`/date/${day.date}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                            >
                              <svg className="w-3 h-3 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {format(new Date(day.date), 'MMM d')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </motion.section>

        </main>
      )}
    </div>
  );
}
