import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, getDayOfYear, subDays } from 'date-fns';
import { useHomeData } from '@/hooks/useHomeData';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { motion } from 'framer-motion';
import { WeightChart } from '@/components/WeightChart';
import { ProgressRingSmall } from '@/components/ProgressRing';
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

  const getDayStatus = (date: Date) => {
    const entry = monthEntries.find(e => isSameDay(parseISO(e.date), date));
    if (!entry) return 'empty';
    const completed = [entry.book_reading, entry.work_done, entry.gym_type !== 'rest'].filter(Boolean).length;
    if (completed === 3) return 'perfect';
    if (completed >= 1) return 'partial';
    return 'empty';
  };

  const todayCompletedCount = todayEntry
    ? [todayEntry.book_reading, todayEntry.work_done, todayEntry.gym_type !== 'rest'].filter(Boolean).length
    : 0;

  const isTodayComplete = todayCompletedCount === 3;
  const todayProgress = (todayCompletedCount / 3) * 100;

  // SVG icons for habits
  const BookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 4v16h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12" />
      <path d="M19 16h-12a2 2 0 0 0 -2 2" />
      <path d="M9 8h6" />
    </svg>
  );

  const WorkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
      <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
      <path d="M12 12l0 .01" />
    </svg>
  );

  const GymIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 640 640" fill="currentColor">
      <path d="M96 176C96 149.5 117.5 128 144 128C170.5 128 192 149.5 192 176L192 288L448 288L448 176C448 149.5 469.5 128 496 128C522.5 128 544 149.5 544 176L544 192L560 192C586.5 192 608 213.5 608 240L608 288C625.7 288 640 302.3 640 320C640 337.7 625.7 352 608 352L608 400C608 426.5 586.5 448 560 448L544 448L544 464C544 490.5 522.5 512 496 512C469.5 512 448 490.5 448 464L448 352L192 352L192 464C192 490.5 170.5 512 144 512C117.5 512 96 490.5 96 464L96 448L80 448C53.5 448 32 426.5 32 400L32 352C14.3 352 0 337.7 0 320C0 302.3 14.3 288 32 288L32 240C32 213.5 53.5 192 80 192L96 192L96 176z"/>
    </svg>
  );

  const StepsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v-2.38c0-.73.25-1.42.67-1.97l.61-.84c.51-.71.32-1.74-.45-2.15a1.51 1.51 0 0 1-.49-2.27l1.61-1.89a1.5 1.5 0 0 1 2.54.47l.52 1.57c.27.82 1.04 1.36 1.9 1.36h1.18" />
      <path d="M20 16v-2.38c0-.73-.25-1.42-.67-1.97l-.61-.84c-.51-.71-.32-1.74.45-2.15a1.51 1.51 0 0 0 .49-2.27l-1.61-1.89a1.5 1.5 0 0 0-2.54.47l-.52 1.57c-.27.82-1.04 1.36-1.9 1.36h-1.18" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );

  const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5l10 -10" />
    </svg>
  );

  // Habit badge with SVG icons
  const HabitBadge = ({ active, label, icon }: { active: boolean; label: string; icon: React.ReactNode }) => (
    <motion.div 
      initial={false}
      animate={{ scale: active ? 1.05 : 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 15 }}
      className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary/80 text-muted-foreground"
      )}
      role="img"
      aria-label={`${label}: ${active ? 'completed' : 'not completed'}`}
    >
      {active ? <CheckIcon /> : icon}
    </motion.div>
  );

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

          {/* Today Card */}
          <motion.button
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            onClick={() => handleNavigate(`/date/${todayStr}`)}
            aria-label={isTodayComplete 
              ? "Today's entry complete. Tap to view or edit." 
              : "Log today's habits and workout. Tap to open."}
            className={cn(
              "w-full group relative overflow-hidden rounded-3xl p-5 text-left transition-all",
              isTodayComplete
                ? "bg-primary text-primary-foreground"
                : "glass-card hover:shadow-glass-lg"
            )}
          >
            <div className="flex items-center gap-4">
              {/* Progress Ring */}
              <div className="relative flex-shrink-0">
                {isTodayComplete ? (
                  <motion.div
                    initial={prefersReducedMotion ? {} : { scale: 0 }}
                    animate={prefersReducedMotion ? {} : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl"
                  >
                    ✓
                  </motion.div>
                ) : (
                  <div className="relative">
                    <ProgressRingSmall progress={todayProgress} size={56} strokeWidth={4} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold">{todayCompletedCount}/3</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h2 className={cn("text-lg font-semibold", isTodayComplete ? "text-primary-foreground" : "text-foreground")}>
                  {isTodayComplete ? "Day Complete" : "Today's Focus"}
                </h2>
                <p className={cn("text-sm mt-0.5", isTodayComplete ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {isTodayComplete ? "Great work! Keep it going." : "Tap to log your habits."}
                </p>
                
                {/* Habit badges with icons */}
                <div className="flex items-center gap-1.5 mt-3" role="list" aria-label="Today's habit status">
                  <HabitBadge active={todayEntry?.book_reading || false} label="Reading" icon={<BookIcon />} />
                  <HabitBadge active={todayEntry?.work_done || false} label="Work" icon={<WorkIcon />} />
                  <HabitBadge active={(todayEntry?.gym_type || 'rest') !== 'rest'} label="Gym" icon={<GymIcon />} />
                </div>
              </div>

              {/* Arrow */}
              <div className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center transition-all text-sm",
                isTodayComplete 
                  ? "bg-white/20" 
                  : "bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground"
              )}>
                →
              </div>
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <StepsIcon />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Steps</h3>
                </div>
                <span className="text-xs font-medium text-muted-foreground">Last 7 days</span>
              </div>
              
              {/* Steps bars */}
              <div className="flex items-end justify-between gap-2 h-24">
                {(() => {
                  // Create last 7 days array
                  const last7Days = Array.from({ length: 7 }, (_, i) => {
                      const date = subDays(today, 6 - i);
                      return format(date, 'yyyy-MM-dd');
                    });
                    
                    const maxSteps = Math.max(...stepsData.map(d => d.steps), 10000);
                    
                    return last7Days.map((dateStr, i) => {
                      const dayData = stepsData.find(d => d.date === dateStr);
                      const steps = dayData?.steps || 0;
                      const heightPercent = maxSteps > 0 ? (steps / maxSteps) * 100 : 0;
                      const isToday = dateStr === todayStr;
                      const dayLabel = format(parseISO(dateStr), 'EEE').charAt(0);
                      
                      return (
                        <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(heightPercent, 4)}%` }}
                            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25, delay: i * 0.05 }}
                            className={cn(
                              "w-full rounded-t-lg transition-colors",
                              steps > 0 
                                ? isToday 
                                  ? "bg-primary" 
                                  : "bg-primary/60"
                                : "bg-secondary/50"
                            )}
                            title={`${format(parseISO(dateStr), 'MMM d')}: ${steps.toLocaleString()} steps`}
                          />
                          <span className={cn(
                            "text-[10px] font-medium",
                            isToday ? "text-primary" : "text-muted-foreground"
                          )}>
                            {dayLabel}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Today's steps summary */}
                {todayEntry?.daily_steps && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Today</span>
                    <span className="text-lg font-bold text-foreground">
                      {todayEntry.daily_steps.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">steps</span>
                    </span>
                  </div>
                )}
              </button>
            </motion.section>

          {/* Monthly Consistency */}
          <motion.section
            {...fadeInUp}
            transition={{ ...springTransition, delay: prefersReducedMotion ? 0 : 0.25 }}
            className="pb-4"
            aria-label="Monthly consistency calendar"
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Consistency</h3>
              <span className="text-xs font-medium glass-subtle px-3 py-1.5 rounded-full">
                {format(today, 'MMMM')}
              </span>
            </div>

            <div className="glass-card rounded-3xl p-5" role="grid" aria-label="Calendar grid">
              <div className="grid grid-cols-7 gap-y-3 gap-x-1" role="row">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-medium text-muted-foreground/70" role="columnheader">{d}</div>
                ))}

                {Array.from({ length: startOfMonth(today).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} role="gridcell" aria-hidden="true" />
                ))}

                {monthDays.map((day, i) => {
                  const status = getDayStatus(day);
                  const isToday = isSameDay(day, today);
                  const statusLabel = status === 'perfect' ? 'all habits completed' : status === 'partial' ? 'some habits completed' : 'no habits logged';
                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleNavigate(`/date/${format(day, 'yyyy-MM-dd')}`)}
                      role="gridcell"
                      aria-label={`${format(day, 'MMMM d')}, ${statusLabel}${isToday ? ', today' : ''}`}
                      aria-current={isToday ? 'date' : undefined}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                      className={cn(
                        "aspect-square mx-auto w-8 rounded-xl flex items-center justify-center text-[10px] font-medium transition-all relative",
                        status === 'perfect' && "bg-primary text-primary-foreground font-bold",
                        status === 'partial' && "bg-primary/20 text-primary font-medium",
                        status === 'empty' && "text-muted-foreground hover:bg-secondary/50",
                        isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                    >
                      {format(day, 'd')}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.section>

        </main>
      )}
    </div>
  );
}
