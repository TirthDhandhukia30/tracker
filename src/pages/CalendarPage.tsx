import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isSameDay, isBefore, max } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { DailyEntry } from '@/types';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const START_DATE = new Date('2025-12-31');

export function CalendarPage() {
  const navigate = useNavigate();
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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full mr-3">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-bold text-lg tracking-tight">Calendar</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-sm mx-auto w-full space-y-8">
        {/* Month Navigation */}
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="icon" onClick={prevMonth} disabled={!canGoPrev} className={cn(!canGoPrev && "opacity-30")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">{format(month, 'MMMM yyyy')}</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-primary/30" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-3 w-full">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-xs font-bold text-muted-foreground mb-2">{d}</div>
            ))}

            {Array.from({ length: startOfMonth(month).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day, i) => {
              const entry = getEntry(day);
              const isToday = isSameDay(day, new Date());
              const isDisabled = isBefore(day, START_DATE);
              return (
                <motion.div
                  key={i}
                  whileHover={!isDisabled ? { scale: 1.1 } : undefined}
                  whileTap={!isDisabled ? { scale: 0.95 } : undefined}
                  onClick={() => !isDisabled && navigate(`/date/${format(day, 'yyyy-MM-dd')}`)}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all border border-transparent relative overflow-hidden",
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

                  {entry?.book_reading && entry?.work_done && !isDisabled && (
                    <div className="absolute inset-0 bg-white/20" />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 w-full pt-4">
          <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-2xl font-bold">{entries.filter(e => e.gym_type !== 'rest').length}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Workouts</span>
          </div>
          <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-2xl font-bold">{entries.filter(e => e.book_reading).length}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Reading</span>
          </div>
          <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-2xl font-bold">{entries.filter(e => e.work_done).length}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Deep Work</span>
          </div>
        </div>
      </main>
    </div>
  );
}
