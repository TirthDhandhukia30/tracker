import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, getDayOfYear } from 'date-fns';
import { useHomeData } from '@/hooks/useHomeData';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { BookOpen, Briefcase, Dumbbell, Loader2, CheckCircle2, ArrowRight, Quote } from 'lucide-react';
import { WeightChart } from '@/components/WeightChart';

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
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const quote = useMemo(() => {
    const dayIndex = getDayOfYear(today);
    return QUOTES[dayIndex % QUOTES.length];
  }, [todayStr]);

  const { data, isLoading } = useHomeData();
  const todayEntry = data?.todayEntry || null;
  const monthEntries = data?.monthEntries || [];
  const weightData = data?.weightData || [];

  const monthDays = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });

  const getDayStatus = (date: Date) => {
    const entry = monthEntries.find(e => isSameDay(parseISO(e.date), date));
    if (!entry) return 'empty';
    const completed = [entry.book_reading, entry.work_done, entry.gym_type !== 'rest'].filter(Boolean).length;
    if (completed === 3) return 'perfect';
    if (completed >= 1) return 'partial';
    return 'empty';
  };

  const isTodayComplete = todayEntry
    ? [todayEntry.book_reading, todayEntry.work_done, todayEntry.gym_type !== 'rest'].filter(Boolean).length === 3
    : false;

  const HabitIcon = ({ active, icon: Icon }: { active: boolean; icon: any }) => (
    <div className={cn(
      "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
      active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
    )}>
      <Icon className="h-4 w-4" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {format(today, 'EEEE')}
        </h1>
        <p className="text-muted-foreground font-medium mt-1">
          {format(today, 'MMMM do')}
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <main className="px-4 space-y-8 max-w-md mx-auto">

          {/* Today Card */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/date/${todayStr}`)}
            className={cn(
              "w-full group relative overflow-hidden rounded-[2rem] p-6 text-left transition-all",
              isTodayComplete
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border"
            )}
          >
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className={cn("text-lg font-semibold", isTodayComplete ? "text-primary-foreground" : "text-foreground")}>
                    {isTodayComplete ? "Day Complete" : "Today's Focus"}
                  </h2>
                  <p className={cn("text-sm mt-1", isTodayComplete ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {isTodayComplete ? "Great work keeping the streak." : "Log your habits and workout."}
                  </p>
                </div>
                {isTodayComplete ? (
                  <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <HabitIcon icon={BookOpen} active={todayEntry?.book_reading || false} />
                <HabitIcon icon={Briefcase} active={todayEntry?.work_done || false} />
                <HabitIcon icon={Dumbbell} active={(todayEntry?.gym_type || 'rest') !== 'rest'} />
              </div>
            </div>
          </motion.button>

          {/* Weight Chart */}
          {weightData.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <WeightChart data={weightData} />
            </motion.section>
          )}

          {/* Monthly Consistency */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pb-4"
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Consistency</h3>
              <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-full">
                {format(today, 'MMMM')}
              </span>
            </div>

            <div className="bg-card/50 rounded-3xl p-5 border border-border/50">
              <div className="grid grid-cols-7 gap-y-3 gap-x-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-medium text-muted-foreground/70">{d}</div>
                ))}

                {Array.from({ length: startOfMonth(today).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {monthDays.map((day, i) => {
                  const status = getDayStatus(day);
                  const isToday = isSameDay(day, today);
                  return (
                    <button
                      key={i}
                      onClick={() => navigate(`/date/${format(day, 'yyyy-MM-dd')}`)}
                      className={cn(
                        "aspect-square mx-auto w-8 rounded-full flex items-center justify-center text-[10px] font-medium transition-all relative",
                        status === 'perfect' && "bg-primary text-primary-foreground font-bold",
                        status === 'partial' && "bg-primary/20 text-primary-foreground dark:text-primary",
                        status === 'empty' && "text-muted-foreground hover:bg-secondary",
                        isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* Daily Quote */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="px-4 py-6 text-center"
          >
            <Quote className="h-4 w-4 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground/80 italic leading-relaxed max-w-xs mx-auto">
              "{quote.text}"
            </p>
            <p className="text-xs text-muted-foreground mt-2">— {quote.author}</p>
          </motion.div>

        </main>
      )}
    </div>
  );
}
