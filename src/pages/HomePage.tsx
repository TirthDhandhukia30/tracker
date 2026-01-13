import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useHomeData } from '@/hooks/useHomeData';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { motion } from 'framer-motion';

export function HomePage() {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const { data, isLoading } = useHomeData();
  const todayEntry = data?.todayEntry || null;
  const monthEntries = data?.monthEntries || [];
  const weightData = data?.weightData || [];
  const stepsData = data?.stepsData || [];

  const monthDays = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
  const daysPassedThisMonth = monthDays.filter(d => d <= today).length;

  // Core metrics
  const habits = [
    { key: 'running', label: 'Run', done: todayEntry?.running || false },
    { key: 'work', label: 'Work', done: todayEntry?.work_done || false },
    { key: 'gym', label: 'Gym', done: (todayEntry?.gym_type || 'rest') !== 'rest' },
  ];
  const completedCount = habits.filter(h => h.done).length;
  const allDone = completedCount === 3;

  // Weight
  const latestWeight = weightData.length > 0
    ? weightData[weightData.length - 1]?.weight
    : null;
  const prevWeight = weightData.length > 1
    ? weightData[weightData.length - 2]?.weight
    : null;
  const weightDelta = latestWeight && prevWeight ? latestWeight - prevWeight : null;

  // Steps this week
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

  // Monthly stats
  const monthStats = useMemo(() => {
    const running = monthEntries.filter(e => e.running).length;
    const work = monthEntries.filter(e => e.work_done).length;
    const gym = monthEntries.filter(e => e.gym_type && e.gym_type !== 'rest').length;
    const total = running + work + gym;
    const possible = daysPassedThisMonth * 3;
    return { running, work, gym, total, possible, percent: possible > 0 ? Math.round((total / possible) * 100) : 0 };
  }, [monthEntries, daysPassedThisMonth]);

  const handleNavigate = (path: string) => {
    haptics.light();
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-6 pt-16">
          <div className="h-8 w-32 bg-muted/50 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-24 bg-muted/30 rounded-lg animate-pulse mb-16" />
          <div className="h-40 bg-muted/30 rounded-2xl animate-pulse mb-8" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-muted/30 rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted/30 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Header - Minimal */}
      <header className="max-w-md mx-auto px-6 pt-16 pb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {format(today, 'EEEE')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(today, 'MMMM d')}
        </p>
      </header>

      <main className="max-w-md mx-auto px-6 space-y-8">

        {/* TODAY - The Hero */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={() => handleNavigate(`/date/${todayStr}`)}
          className={cn(
            "w-full text-left p-6 rounded-2xl transition-all duration-300",
            allDone
              ? "bg-foreground text-background"
              : "bg-muted/40 hover:bg-muted/60"
          )}
        >
          {/* Large number */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className={cn(
              "text-7xl font-light tabular-nums tracking-tighter",
              allDone ? "text-background" : "text-foreground"
            )}>
              {completedCount}
            </span>
            <span className={cn(
              "text-2xl font-light",
              allDone ? "text-background/50" : "text-muted-foreground"
            )}>
              / 3
            </span>
          </div>

          {/* Habit indicators */}
          <div className="flex gap-3">
            {habits.map((habit) => (
              <div
                key={habit.key}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  habit.done
                    ? allDone
                      ? "bg-background/20 text-background"
                      : "bg-foreground text-background"
                    : allDone
                      ? "bg-background/10 text-background/40"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {habit.done && (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {habit.label}
              </div>
            ))}
          </div>
        </motion.button>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 gap-4">

          {/* Weight */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={() => handleNavigate('/weight-history')}
            className="text-left p-5 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Weight
            </p>
            {latestWeight ? (
              <>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {latestWeight.toFixed(1)}
                  <span className="text-lg font-normal text-muted-foreground ml-1">kg</span>
                </p>
                {weightDelta !== null && weightDelta !== 0 && (
                  <p className={cn(
                    "text-sm font-medium mt-1",
                    weightDelta < 0 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                  )}>
                    {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl text-muted-foreground/50">—</p>
            )}
          </motion.button>

          {/* Steps */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={() => handleNavigate('/steps-history')}
            className="text-left p-5 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              This Week
            </p>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {(weeklySteps / 1000).toFixed(0)}
              <span className="text-lg font-normal text-muted-foreground ml-0.5">K</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {weeklySteps >= 70000 ? 'Goal hit' : `${((weeklySteps / 70000) * 100).toFixed(0)}% of 70K`}
            </p>
          </motion.button>
        </div>

        {/* MONTHLY OVERVIEW - Activity Rings */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="p-6 rounded-2xl bg-muted/40"
        >
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {format(today, 'MMMM')}
            </h2>
            <span className="text-xs text-muted-foreground">
              {daysPassedThisMonth} days
            </span>
          </div>

          {/* Activity Rings */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-36 h-36">
              {[
                { label: 'Run', count: monthStats.running, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
                { label: 'Work', count: monthStats.work, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
                { label: 'Gym', count: monthStats.gym, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
              ].map((ring, index) => {
                const percent = daysPassedThisMonth > 0 ? (ring.count / daysPassedThisMonth) * 100 : 0;
                const size = 144 - (index * 24);
                const strokeWidth = 10;
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
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={ring.bgColor}
                      strokeWidth={strokeWidth}
                    />
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
                      transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </svg>
                );
              })}

              {/* Center percentage */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">{monthStats.percent}%</span>
              </div>
            </div>
          </div>

          {/* Stats row with color dots */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Run', count: monthStats.running, color: '#ef4444' },
              { label: 'Work', count: monthStats.work, color: '#22c55e' },
              { label: 'Gym', count: monthStats.gym, color: '#3b82f6' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-semibold tabular-nums">{stat.count}</p>
              </div>
            ))}
          </div>

          {/* Highlighted days */}
          {(() => {
            const highlighted = monthEntries.filter(e => e.is_highlighted);
            if (highlighted.length === 0) return null;

            return (
              <div className="mt-6 pt-5 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">
                  {highlighted.length} starred {highlighted.length === 1 ? 'day' : 'days'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {highlighted.map(day => (
                    <button
                      key={day.date}
                      onClick={() => handleNavigate(`/date/${day.date}`)}
                      className="px-3 py-1.5 text-xs font-medium bg-muted hover:bg-foreground hover:text-background rounded-lg transition-colors"
                    >
                      {format(new Date(day.date), 'MMM d')}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </motion.section>

      </main>
    </div>
  );
}
