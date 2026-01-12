import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isSameDay, isBefore, max } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { START_DATE } from '@/lib/constants';
import type { DailyEntry } from '@/types';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

export function CalendarPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [month, setMonth] = useState(() => max([new Date(), START_DATE]));
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMonth() {
      setLoading(true);
      const monthStart = startOfMonth(month);
      const effectiveStart = max([monthStart, START_DATE]);
      const start = format(effectiveStart, 'yyyy-MM-dd');
      const end = format(endOfMonth(month), 'yyyy-MM-dd');

      const { data } = await supabase
        .from('daily_entries')
        .select('*')
        .gte('date', start)
        .lte('date', end);

      if (data) setEntries(data as DailyEntry[]);
      setLoading(false);
    }
    fetchMonth();
  }, [month]);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });

  const nextMonth = () => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const prevMonth = () => {
    const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    if (!isBefore(prev, new Date('2026-01-01'))) {
      setMonth(prev);
    }
  };

  const canGoPrev = !isBefore(new Date(month.getFullYear(), month.getMonth() - 1, 1), new Date('2026-01-01'));

  const getEntry = (date: Date) => entries.find(e => isSameDay(parseISO(e.date), date));

  const getStatusColor = (date: Date, entry?: DailyEntry) => {
    if (isBefore(date, START_DATE)) return "bg-transparent text-muted-foreground/30";
    if (!entry) return "bg-secondary/30";
    if (entry.book_reading && entry.work_done && entry.gym_type !== 'rest') return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
    if ((entry.gym_type !== 'rest') || (entry.book_reading && entry.work_done)) return "bg-green-400";
    if (entry.book_reading || entry.work_done || entry.gym_type !== 'rest') return "bg-green-500/40";
    return "bg-secondary";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with back button */}
      <header className="sticky top-0 z-50 w-full glass-nav">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="glass"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-xl mr-3"
            aria-label="Go back to home"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="font-bold text-lg tracking-tight">Calendar</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-sm mx-auto w-full space-y-8" role="main">
        {/* Month Navigation */}
        <nav className="flex items-center justify-between w-full glass-subtle p-2 rounded-2xl" aria-label="Month navigation">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              haptics.light();
              prevMonth();
            }}
            disabled={!canGoPrev}
            className={cn("rounded-xl", !canGoPrev && "opacity-30")}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight" aria-live="polite">{format(month, 'MMMM yyyy')}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              haptics.light();
              nextMonth();
            }}
            className="rounded-xl"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </nav>

        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading calendar">
            <div className="grid grid-cols-7 gap-3 w-full">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-xs font-bold text-muted-foreground mb-2">{d}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-4 rounded-3xl">
            <div className="grid grid-cols-7 gap-3 w-full" role="grid" aria-label="Calendar">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-bold text-muted-foreground mb-2"
                  role="columnheader"
                  aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}
                >
                  {d}
                </div>
              ))}

              {Array.from({ length: startOfMonth(month).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} role="gridcell" aria-hidden="true" />
              ))}

              {days.map((day, i) => {
                const entry = getEntry(day);
                const isToday = isSameDay(day, new Date());
                const isDisabled = isBefore(day, START_DATE);
                const gymType = entry?.gym_type;
                const gymLabel = gymType === 'push' ? 'P' : gymType === 'pull' ? 'U' : gymType === 'legs' ? 'L' : null;
                const statusLabel = entry
                  ? (entry.book_reading && entry.work_done && entry.gym_type !== 'rest'
                    ? 'all habits completed'
                    : 'some habits completed')
                  : 'no entry';

                return (
                  <motion.button
                    key={i}
                    whileHover={!isDisabled && !prefersReducedMotion ? { scale: 1.1 } : undefined}
                    whileTap={!isDisabled && !prefersReducedMotion ? { scale: 0.95 } : undefined}
                    onClick={() => {
                      if (!isDisabled) {
                        haptics.light();
                        navigate(`/date/${format(day, 'yyyy-MM-dd')}`);
                      }
                    }}
                    disabled={isDisabled}
                    role="gridcell"
                    aria-label={`${format(day, 'MMMM d, yyyy')}, ${statusLabel}${gymType && gymType !== 'rest' ? `, ${gymType} day` : ''}${isToday ? ', today' : ''}`}
                    aria-current={isToday ? 'date' : undefined}
                    aria-disabled={isDisabled}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all border border-transparent relative overflow-hidden",
                      isDisabled ? "cursor-not-allowed" : "cursor-pointer",
                      getStatusColor(day, entry),
                      isToday && !isDisabled && "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                  >
                    <span className={cn(
                      "z-10 relative",
                      entry && !isDisabled ? "text-primary-foreground font-bold" : "text-muted-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>

                    {/* Gym type indicator */}
                    {gymLabel && !isDisabled && (
                      <span className="text-[8px] font-bold z-10 text-primary-foreground/80 -mt-0.5" aria-hidden="true">
                        {gymLabel}
                      </span>
                    )}

                    {entry?.book_reading && entry?.work_done && !isDisabled && (
                      <div className="absolute inset-0 bg-white/20" aria-hidden="true" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity Rings Summary */}
        {!loading && (
          <section className="w-full pt-4" aria-label="Monthly activity rings">
            <div className="glass-card rounded-3xl p-6">
              {(() => {
                const daysInMonth = days.length;
                const gymCount = entries.filter(e => e.gym_type !== 'rest').length;
                const readingCount = entries.filter(e => e.book_reading).length;
                const workCount = entries.filter(e => e.work_done).length;

                const rings = [
                  {
                    label: 'Gym',
                    count: gymCount,
                    total: daysInMonth,
                    color: 'rgb(59, 130, 246)',
                    bgColor: 'rgba(59, 130, 246, 0.2)',
                  },
                  {
                    label: 'Read',
                    count: readingCount,
                    total: daysInMonth,
                    color: 'rgb(239, 68, 68)',
                    bgColor: 'rgba(239, 68, 68, 0.2)',
                  },
                  {
                    label: 'Work',
                    count: workCount,
                    total: daysInMonth,
                    color: 'rgb(34, 197, 94)',
                    bgColor: 'rgba(34, 197, 94, 0.2)',
                  },
                ];

                const overallPercent = daysInMonth > 0
                  ? Math.round(((gymCount + readingCount + workCount) / (daysInMonth * 3)) * 100)
                  : 0;

                return (
                  <>
                    {/* Rings */}
                    <div className="flex items-center justify-center mb-6">
                      <div className="relative w-32 h-32">
                        {rings.map((ring, index) => {
                          const percent = ring.total > 0 ? (ring.count / ring.total) * 100 : 0;
                          const size = 128 - (index * 22);
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

                        {/* Center percentage */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-bold tabular-nums">{overallPercent}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
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
                  </>
                );
              })()}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
