import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDayOfYear } from 'date-fns';
import { useHomeData } from '@/hooks/useHomeData';
import { useStreak } from '@/hooks/useStreak';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { motion } from 'framer-motion';
import { WeightChart } from '@/components/WeightChart';
import { toast } from 'sonner';

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
  const { streak, isCheckedToday, canRestore, missedDays, restoreStreak, isRestoring } = useStreak();
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

  const handleRestoreStreak = () => {
    haptics.medium();
    restoreStreak(undefined, {
      onSuccess: () => {
        haptics.success();
        toast.success(`Restored ${missedDays} missed day${missedDays > 1 ? 's' : ''}!`);
      },
      onError: () => {
        haptics.error();
        toast.error('Failed to restore streak');
      }
    });
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

          {/* Daily Quote - Minimal */}
          <motion.aside
            {...fadeInUp}
            transition={springTransition}
            aria-label="Daily inspiration"
            className="px-1"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              "{quote.text}"
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">— {quote.author}</p>
          </motion.aside>

          {/* Today Card - Celebratory when complete */}
          <motion.button
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            onClick={() => handleNavigate(`/date/${todayStr}`)}
            aria-label={isTodayComplete
              ? "Today's entry complete. Tap to view or edit."
              : "Log today's habits. Tap to open."}
            className={cn(
              "w-full group relative overflow-hidden rounded-2xl text-left transition-all",
              isTodayComplete
                ? "bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-6 shadow-lg shadow-green-500/25"
                : "glass-card hover:shadow-glass-lg p-4"
            )}
          >
            {/* Celebration particles for completed state */}
            {isTodayComplete && (
              <>
                {/* Animated shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={prefersReducedMotion ? {} : {
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.5,
                    ease: 'easeInOut',
                  }}
                />
                {/* Confetti dots */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-white/40"
                    style={{
                      left: `${15 + i * 10}%`,
                      top: `${20 + (i % 3) * 25}%`,
                    }}
                    animate={prefersReducedMotion ? {} : {
                      y: [0, -8, 0],
                      opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2 + (i % 3) * 0.5,
                      delay: i * 0.2,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </>
            )}

            <div className="relative flex items-center gap-4">
              {/* Left: Status */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-semibold",
                  isTodayComplete ? "text-2xl text-white" : "text-sm text-foreground"
                )}>
                  {isTodayComplete ? "🎉 All Done!" : format(today, 'EEEE')}
                </p>
                <p className={cn(
                  isTodayComplete ? "text-sm text-white/80 mt-1" : "text-xs text-muted-foreground"
                )}>
                  {isTodayComplete ? "You crushed it today" : `${todayCompletedCount} of 3 habits`}
                </p>
              </div>

              {/* Center: Three habit indicators */}
              <div className="flex items-center gap-2">
                {[
                  { done: todayEntry?.running || false, icon: '🏃' },
                  { done: todayEntry?.work_done || false, icon: '💼' },
                  { done: (todayEntry?.gym_type || 'rest') !== 'rest', icon: '💪' },
                ].map((habit, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "rounded-xl flex items-center justify-center transition-all",
                      isTodayComplete ? "w-10 h-10" : "w-8 h-8",
                      habit.done
                        ? (isTodayComplete ? "bg-white/25" : "bg-primary")
                        : (isTodayComplete ? "bg-white/10" : "bg-secondary/60")
                    )}
                    animate={isTodayComplete && habit.done && !prefersReducedMotion ? {
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      delay: i * 0.3,
                    }}
                  >
                    {habit.done ? (
                      isTodayComplete ? (
                        <span className="text-lg">{habit.icon}</span>
                      ) : (
                        <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5l10 -10" />
                        </svg>
                      )
                    ) : null}
                  </motion.div>
                ))}
              </div>

              {/* Right: Arrow */}
              <motion.svg
                className={cn(
                  "w-5 h-5",
                  isTodayComplete ? "text-white/70" : "text-muted-foreground"
                )}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                animate={!prefersReducedMotion ? {
                  x: [0, 3, 0],
                } : {}}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: 'easeInOut',
                }}
              >
                <path d="M9 6l6 6l-6 6" />
              </motion.svg>
            </div>
          </motion.button>

          {/* Streak Counter - Dynamic Widget */}
          <motion.div
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.075 }}
            className={cn(
              "relative overflow-hidden rounded-2xl p-5 transition-all",
              streak >= 30
                ? "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400"
                : streak >= 14
                  ? "bg-gradient-to-br from-orange-500 to-amber-500"
                  : streak >= 7
                    ? "bg-gradient-to-r from-orange-500/90 to-amber-500/80"
                    : streak > 0
                      ? "bg-gradient-to-r from-orange-500/70 to-amber-500/60"
                      : "glass-card"
            )}
            aria-label={`Current streak: ${streak} days`}
          >
            {/* Animated glow for high streaks */}
            {streak >= 7 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                animate={prefersReducedMotion ? {} : {
                  x: ['-100%', '200%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: 'easeInOut',
                }}
              />
            )}

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Flame Icon with pulse for active streak */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  streak > 0
                    ? "bg-white/20"
                    : "bg-secondary/60"
                )}>
                  <motion.svg
                    className={cn(
                      "w-6 h-6",
                      streak > 0 ? "text-white" : "text-muted-foreground"
                    )}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    animate={streak > 0 && !prefersReducedMotion ? {
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: 'easeInOut',
                    }}
                  >
                    <path d="M12 23a7.5 7.5 0 0 1-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.773.5 1.604.5 2.47A7.5 7.5 0 0 1 12 23z" />
                  </motion.svg>
                </div>

                <div>
                  <p className={cn(
                    "text-3xl font-bold tabular-nums tracking-tight",
                    streak > 0 ? "text-white" : "text-foreground"
                  )}>
                    {streak}
                    <span className={cn(
                      "text-base font-medium ml-1",
                      streak > 0 ? "text-white/70" : "text-muted-foreground"
                    )}>
                      {streak === 1 ? 'day' : 'days'}
                    </span>
                  </p>
                  <p className={cn(
                    "text-xs font-medium",
                    streak > 0 ? "text-white/60" : "text-muted-foreground"
                  )}>
                    {streak === 0
                      ? "Start your streak today"
                      : streak >= 30
                        ? "🔥 Legendary!"
                        : streak >= 14
                          ? "🔥 On fire!"
                          : streak >= 7
                            ? "Keep it going!"
                            : isCheckedToday
                              ? "Checked in today"
                              : "Check in to continue"}
                  </p>
                </div>
              </div>

              {/* Streak milestones indicator */}
              {streak > 0 && (
                <div className="flex flex-col items-end gap-1">
                  {[7, 14, 30].map((milestone) => (
                    <div
                      key={milestone}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        streak >= milestone
                          ? "w-8 bg-white"
                          : "w-4 bg-white/30"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Restore option if streak can be recovered */}
            {canRestore && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-white/20"
              >
                <button
                  onClick={handleRestoreStreak}
                  disabled={isRestoring}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-sm font-medium transition-all disabled:opacity-50"
                >
                  {isRestoring
                    ? "Restoring..."
                    : `Restore ${missedDays} missed day${missedDays > 1 ? 's' : ''}`}
                </button>
                <p className="text-[10px] text-white/50 text-center mt-2">
                  Forgot to check in? We've got you.
                </p>
              </motion.div>
            )}
          </motion.div>

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

          {/* Steps - Celebratory when goal met */}
          <motion.button
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.15 }}
            onClick={() => handleNavigate('/steps-history')}
            aria-label="View steps history"
            className={cn(
              "w-full rounded-2xl p-5 text-left transition-all active:scale-[0.99] relative overflow-hidden",
              (() => {
                const WEEKLY_GOAL = 70000;
                const dayOfWeek = today.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const monday = new Date(today);
                monday.setDate(today.getDate() + mondayOffset);
                const weekDays = Array.from({ length: 7 }, (_, i) => {
                  const date = new Date(monday);
                  date.setDate(monday.getDate() + i);
                  return format(date, 'yyyy-MM-dd');
                });
                const weeklySteps = weekDays.reduce((sum, dateStr) => {
                  const dayData = stepsData.find(d => d.date === dateStr);
                  return sum + (dayData?.steps || 0);
                }, 0);
                return weeklySteps >= WEEKLY_GOAL;
              })()
                ? "bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-lg shadow-green-500/20"
                : "glass-card hover:shadow-glass-lg"
            )}
          >
            {(() => {
              const WEEKLY_GOAL = 70000;
              const getWeekDays = () => {
                const dayOfWeek = today.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const monday = new Date(today);
                monday.setDate(today.getDate() + mondayOffset);
                return Array.from({ length: 7 }, (_, i) => {
                  const date = new Date(monday);
                  date.setDate(monday.getDate() + i);
                  return format(date, 'yyyy-MM-dd');
                });
              };
              const weekDays = getWeekDays();
              const weeklySteps = weekDays.reduce((sum, dateStr) => {
                const dayData = stepsData.find(d => d.date === dateStr);
                return sum + (dayData?.steps || 0);
              }, 0);
              const isGoalMet = weeklySteps >= WEEKLY_GOAL;

              return (
                <>
                  {/* Celebration shimmer when goal met */}
                  {isGoalMet && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={prefersReducedMotion ? {} : {
                        x: ['-100%', '200%'],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.5,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className={cn(
                        "text-xs font-medium uppercase tracking-wider mb-1",
                        isGoalMet ? "text-white/70" : "text-muted-foreground"
                      )}>This Week</p>
                      <p className={cn(
                        "text-3xl font-semibold tabular-nums tracking-tight",
                        isGoalMet ? "text-white" : "text-foreground"
                      )}>
                        {(weeklySteps / 1000).toFixed(0)}
                        <span className={cn(
                          "text-lg font-normal ml-0.5",
                          isGoalMet ? "text-white/70" : "text-muted-foreground"
                        )}>K</span>
                        <span className={cn(
                          "text-sm font-normal ml-1",
                          isGoalMet ? "text-white/60" : "text-muted-foreground/60"
                        )}>/ 70K</span>
                      </p>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full",
                      isGoalMet ? "bg-white/20" : "bg-secondary/60"
                    )}>
                      {isGoalMet ? (
                        <>
                          <span className="text-lg">🎯</span>
                          <span className="text-sm font-semibold text-white">Goal!</span>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                          {((weeklySteps / WEEKLY_GOAL) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.button>

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

              // Muted ring colors for cleaner look
              const rings = [
                {
                  label: 'Run',
                  count: runningCount,
                  total: daysPassedThisMonth,
                  color: 'rgb(239, 68, 68)',
                  bgColor: 'rgba(239, 68, 68, 0.12)',
                },
                {
                  label: 'Work',
                  count: workCount,
                  total: daysPassedThisMonth,
                  color: 'rgb(34, 197, 94)',
                  bgColor: 'rgba(34, 197, 94, 0.12)',
                },
                {
                  label: 'Gym',
                  count: gymCount,
                  total: daysPassedThisMonth,
                  color: 'rgb(59, 130, 246)',
                  bgColor: 'rgba(59, 130, 246, 0.12)',
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

                      {/* Center text - Month progress */}
                      {(() => {
                        const monthPercent = Math.round((daysPassedThisMonth / monthDays.length) * 100);
                        return (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold tabular-nums">
                              {monthPercent}%
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Month</span>
                          </div>
                        );
                      })()}
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

                  {/* Highlighted Days - Compact */}
                  {(() => {
                    const highlightedDays = monthEntries.filter(e => e.is_highlighted);
                    if (highlightedDays.length === 0) return null;

                    return (
                      <div className="mt-5 pt-4 border-t border-border/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {highlightedDays.length} starred
                          </span>
                          <div className="flex gap-1.5">
                            {highlightedDays.slice(0, 5).map(day => (
                              <button
                                key={day.date}
                                onClick={() => handleNavigate(`/date/${day.date}`)}
                                className="w-7 h-7 rounded-lg bg-muted/60 hover:bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                title={format(new Date(day.date), 'MMM d')}
                              >
                                {format(new Date(day.date), 'd')}
                              </button>
                            ))}
                            {highlightedDays.length > 5 && (
                              <span className="text-xs text-muted-foreground/50 self-center ml-1">+{highlightedDays.length - 5}</span>
                            )}
                          </div>
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
