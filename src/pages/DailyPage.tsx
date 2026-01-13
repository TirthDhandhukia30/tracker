import { useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, isValid, getDayOfYear } from 'date-fns';
import { useDailyEntry } from '@/hooks/useDailyEntry';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton, SkeletonHabitButton, SkeletonExercise } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Trash2, Check, Briefcase, History, Sparkles, Footprints } from 'lucide-react';
import type { GymType, Exercise } from '@/types';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const GYM_TYPES = [
  { value: 'rest', label: 'Rest' },
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'legs', label: 'Legs' },
] as const;

// Rotating prompts - different question each day
const DAILY_PROMPTS = [
  "What went well today?",
  "What's one small win?",
  "What would make tomorrow easier?",
  "What did you almost skip but didn't?",
  "What are you proud of?",
  "What gave you energy today?",
  "What would you tell yesterday's you?",
];

export function DailyPage() {
  const { dateStr } = useParams<{ dateStr: string }>();
  const navigate = useNavigate();

  if (!dateStr || !isValid(parseISO(dateStr))) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Invalid date</div>;
  }

  // Get rotating prompt based on date
  const dailyPrompt = useMemo(() => {
    const dayIndex = getDayOfYear(parseISO(dateStr));
    return DAILY_PROMPTS[dayIndex % DAILY_PROMPTS.length];
  }, [dateStr]);

  const { entry, setEntry, status, toggleHabit, copyLastWorkout } = useDailyEntry(dateStr);
  const prefersReducedMotion = useReducedMotion();
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea on content change
  const resizeTextarea = useCallback(() => {
    const textarea = noteTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [entry.note, resizeTextarea]);

  const handleToggleHabit = (key: 'running' | 'work_done') => {
    haptics.light();
    toggleHabit(key);
  };

  const updateEntry = (updates: Partial<typeof entry>) => {
    setEntry(prev => ({ ...prev, ...updates }));
  };

  const addExercise = () => {
    const newExercise: Exercise = { name: '', sets: [{ reps: 0, weight: 0 }], unit: 'kg' };
    updateEntry({ exercises: [...(entry.exercises || []), newExercise] });
  };

  const updateExercise = (index: number, exercise: Exercise) => {
    const newExercises = [...(entry.exercises || [])];
    newExercises[index] = exercise;
    updateEntry({ exercises: newExercises });
  };

  const removeExercise = (index: number) => {
    const newExercises = [...(entry.exercises || [])];
    newExercises.splice(index, 1);
    updateEntry({ exercises: newExercises });
  };

  const addSet = (exerciseIndex: number) => {
    const exercise = entry.exercises?.[exerciseIndex];
    if (!exercise) return;
    updateExercise(exerciseIndex, { ...exercise, sets: [...exercise.sets, { reps: 0, weight: 0 }] });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = entry.exercises?.[exerciseIndex];
    if (!exercise) return;
    const newSets = [...exercise.sets];
    newSets.splice(setIndex, 1);
    updateExercise(exerciseIndex, { ...exercise, sets: newSets });
  };

  const handleCopyWorkout = async () => {
    const gymType = entry.gym_type;
    if (gymType === 'rest') return;
    haptics.medium();

    toast.promise(copyLastWorkout(gymType), {
      loading: 'Loading...',
      success: (found) => {
        if (found) haptics.success();
        return found ? `Loaded last ${gymType}` : 'No history';
      },
      error: () => {
        haptics.error();
        return 'Failed';
      }
    });
  };

  // Calculate day's completion
  const habitsCompleted = [
    entry.running,
    entry.work_done,
    entry.gym_type && entry.gym_type !== 'rest'
  ].filter(Boolean).length;
  const dayProgress = (habitsCompleted / 3) * 100;

  const DayProgressRing = () => {
    const size = 32;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (dayProgress / 100) * circumference;

    const ringColor = habitsCompleted === 3
      ? 'rgb(34, 197, 94)'
      : habitsCompleted > 0
        ? 'hsl(var(--primary))'
        : 'transparent';

    return (
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
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
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
              stiffness: 100,
              damping: 20
            }}
          />
        </svg>
        {/* Sync status dot in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              status === 'saving' && "bg-yellow-500 animate-pulse",
              status === 'synced' && "bg-green-500",
              status === 'error' && "bg-destructive"
            )}
            role="status"
            aria-label={status === 'saving' ? 'Saving' : status === 'synced' ? 'Saved' : 'Error'}
          />
        </div>
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background text-foreground pb-32" aria-busy="true" aria-label="Loading entry">
        <header className="sticky top-0 z-50 glass-nav">
          <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-2 w-2 rounded-full" />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-6 py-8 space-y-10">
          <div className="flex flex-col items-center">
            <Skeleton className="h-24 w-48" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SkeletonHabitButton />
            <SkeletonHabitButton />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-12 w-full rounded-xl" />
            <SkeletonExercise />
            <SkeletonExercise />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-nav">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <Button
            variant="glass"
            size="icon"
            onClick={() => navigate('/')}
            className="-ml-2 rounded-xl"
            aria-label="Go back to home"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="text-sm font-semibold">{format(parseISO(dateStr), 'EEEE, MMM d')}</h1>
          <DayProgressRing />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-10" role="main">

        {/* Weight */}
        <section className="flex flex-col items-center justify-center" aria-label="Body weight">
          <div className="relative">
            <label htmlFor="weight-input" className="sr-only">Body weight in kilograms</label>
            <Input
              id="weight-input"
              type="number"
              inputMode="decimal"
              placeholder="—"
              value={entry.current_weight || ''}
              onChange={(e) => updateEntry({ current_weight: parseFloat(e.target.value) || undefined })}
              aria-describedby="weight-unit"
              className="h-24 w-48 text-center text-5xl font-bold bg-transparent border-0 focus-visible:ring-0 p-0 tracking-tight placeholder:text-muted/20"
            />
            <span id="weight-unit" className="absolute -right-4 top-8 text-lg font-medium text-muted-foreground select-none" aria-hidden="true">kg</span>
          </div>
        </section>

        {/* Habits */}
        <section className="space-y-4" aria-label="Daily habits">
          {/* Running */}
          <div className="space-y-2">
            <motion.button
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={() => handleToggleHabit('running')}
              role="switch"
              aria-checked={entry.running}
              aria-label={`Running: ${entry.running ? 'completed' : 'not completed'}. Tap to toggle.`}
              className={cn(
                "w-full h-14 rounded-2xl flex items-center justify-between px-5 transition-all select-none",
                entry.running
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow"
                  : "glass-card hover:shadow-glass-lg"
              )}
            >
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 640 640" fill="currentColor" aria-hidden="true">
                  <path d="M352.5 32C383.4 32 408.5 57.1 408.5 88C408.5 118.9 383.4 144 352.5 144C321.6 144 296.5 118.9 296.5 88C296.5 57.1 321.6 32 352.5 32zM219.6 240C216.3 240 213.4 242 212.2 245L190.2 299.9C183.6 316.3 165 324.3 148.6 317.7C132.2 311.1 124.2 292.5 130.8 276.1L152.7 221.2C163.7 193.9 190.1 176 219.6 176L316.9 176C345.4 176 371.7 191.1 386 215.7L418.8 272L480.4 272C498.1 272 512.4 286.3 512.4 304C512.4 321.7 498.1 336 480.4 336L418.8 336C396 336 375 323.9 363.5 304.2L353.5 287.1L332.8 357.5L408.2 380.1C435.9 388.4 450 419.1 438.3 445.6L381.7 573C374.5 589.2 355.6 596.4 339.5 589.2C323.4 582 316.1 563.1 323.3 547L372.5 436.2L276.6 407.4C243.9 397.6 224.6 363.7 232.9 330.6L255.6 240L219.7 240zM211.6 421C224.9 435.9 242.3 447.3 262.8 453.4L267.5 454.8L260.6 474.1C254.8 490.4 244.6 504.9 231.3 515.9L148.9 583.8C135.3 595 115.1 593.1 103.9 579.5C92.7 565.9 94.6 545.7 108.2 534.5L190.6 466.6C195.1 462.9 198.4 458.1 200.4 452.7L211.6 421z" />
                </svg>
                <span className="font-medium">Running</span>
              </div>
              {entry.running && <Check className="h-5 w-5" aria-hidden="true" />}
            </motion.button>

            {entry.running && (
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Input
                  placeholder="Distance, time, or notes (optional)"
                  value={entry.running_note || ''}
                  onChange={(e) => updateEntry({ running_note: e.target.value })}
                  aria-label="Running details"
                  className="glass-input rounded-xl px-4 py-3 text-sm"
                />
              </motion.div>
            )}
          </div>

          {/* Work */}
          <div className="space-y-2">
            <motion.button
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={() => handleToggleHabit('work_done')}
              role="switch"
              aria-checked={entry.work_done}
              aria-label={`Work: ${entry.work_done ? 'completed' : 'not completed'}. Tap to toggle.`}
              className={cn(
                "w-full h-14 rounded-2xl flex items-center justify-between px-5 transition-all select-none",
                entry.work_done
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow"
                  : "glass-card hover:shadow-glass-lg"
              )}
            >
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5" aria-hidden="true" />
                <span className="font-medium">Work</span>
              </div>
              {entry.work_done && <Check className="h-5 w-5" aria-hidden="true" />}
            </motion.button>

            {entry.work_done && (
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Input
                  placeholder="What did you work on?"
                  value={entry.work_note || ''}
                  onChange={(e) => updateEntry({ work_note: e.target.value })}
                  aria-label="What did you work on?"
                  className="glass-input rounded-xl px-4 py-3 text-sm"
                />
              </motion.div>
            )}
          </div>

          {/* Steps */}
          <div className="glass-card rounded-2xl h-14 flex items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <Footprints className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">Steps</span>
            </div>
            <div className="flex items-center gap-1">
              <label htmlFor="steps-input" className="sr-only">Daily steps in thousands</label>
              <Input
                id="steps-input"
                type="number"
                inputMode="decimal"
                placeholder="0"
                min={0}
                max={99}
                step="0.1"
                value={entry.daily_steps ? (entry.daily_steps / 1000).toFixed(1).replace(/\.0$/, '') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = parseFloat(val) || 0;
                  updateEntry({ daily_steps: num > 0 ? Math.round(num * 1000) : undefined });
                }}
                className="w-14 text-lg font-bold bg-transparent border-0 focus-visible:ring-0 p-0 text-right placeholder:text-muted-foreground/30"
              />
              <span className="text-sm font-medium text-muted-foreground select-none">K</span>
            </div>
          </div>
        </section>

        {/* The One Question */}
        <section className="space-y-3" aria-label="Daily reflection">
          <div className="flex items-center gap-2 pl-1">
            <Sparkles className="h-3 w-3 text-primary/60" aria-hidden="true" />
            <label htmlFor="daily-note" className="text-sm font-medium text-foreground/80">{dailyPrompt}</label>
          </div>
          <Textarea
            ref={noteTextareaRef}
            id="daily-note"
            placeholder="..."
            value={entry.note || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              updateEntry({ note: e.target.value });
            }}
            aria-label={dailyPrompt}
            className="min-h-[80px] glass-subtle border-0 resize-none focus-visible:ring-0 px-4 py-3 text-base leading-relaxed placeholder:text-muted-foreground/20 rounded-2xl overflow-hidden"
          />
        </section>

        {/* Remember This Day */}
        <section aria-label="Highlight this day">
          <motion.button
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            onClick={() => {
              haptics.light();
              updateEntry({ is_highlighted: !entry.is_highlighted });
            }}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
              entry.is_highlighted
                ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30"
                : "glass-card hover:shadow-glass-lg"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                entry.is_highlighted
                  ? "bg-amber-500 text-white"
                  : "bg-secondary/50"
              )}>
                <svg
                  className={cn("w-5 h-5", entry.is_highlighted ? "" : "text-muted-foreground")}
                  viewBox="0 0 24 24"
                  fill={entry.is_highlighted ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="text-left">
                <p className={cn(
                  "text-sm font-medium",
                  entry.is_highlighted ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                )}>
                  {entry.is_highlighted ? "Remembered" : "Remember This Day"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.is_highlighted ? "This day is highlighted" : "Mark as special"}
                </p>
              </div>
            </div>
            {entry.is_highlighted && (
              <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5l10 -10" />
              </svg>
            )}
          </motion.button>
        </section>

        {/* Workout */}
        <section className="space-y-5" aria-label="Workout tracking">
          <div className="glass-card p-1.5 rounded-2xl flex gap-1" role="radiogroup" aria-label="Workout type">
            {GYM_TYPES.map((type) => {
              const isSelected = entry.gym_type === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => {
                    haptics.selection();
                    updateEntry({ gym_type: type.value as GymType });
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  className={cn(
                    "flex-1 py-3 text-sm font-medium rounded-xl transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  {type.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {entry.gym_type !== 'rest' && (
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                className="space-y-5"
              >
                {/* Header */}
                <button
                  onClick={handleCopyWorkout}
                  aria-label={`Copy exercises from your last ${entry.gym_type} workout`}
                  className="w-full py-3 text-sm text-primary/70 hover:text-primary font-medium flex items-center justify-center gap-2 glass-subtle rounded-2xl hover:shadow-glass transition-all"
                >
                  <History className="h-4 w-4" aria-hidden="true" />
                  Repeat last {entry.gym_type}
                </button>

                <div className="space-y-4" role="list" aria-label="Exercises">
                  {entry.exercises?.map((exercise, index) => {
                    const unit = exercise.unit || 'kg';
                    return (
                      <motion.div
                        key={index}
                        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group glass-card rounded-3xl overflow-hidden"
                        role="listitem"
                      >
                        {/* Exercise Header */}
                        <div className="flex items-center gap-3 p-4 pb-2">
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.4 14.4 9.6 9.6" />
                              <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
                              <path d="m21.5 21.5-1.4-1.4" />
                              <path d="M3.9 3.9 2.5 2.5" />
                              <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Input
                              id={`exercise-name-${index}`}
                              placeholder="Exercise name"
                              value={exercise.name}
                              onChange={(e) => updateExercise(index, { ...exercise, name: e.target.value })}
                              className="font-semibold text-base border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
                            />
                          </div>
                          <button
                            onClick={() => removeExercise(index)}
                            aria-label={`Remove ${exercise.name || 'exercise'}`}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center opacity-60 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive active:text-destructive transition-all rounded-xl hover:bg-destructive/10 active:bg-destructive/20"
                          >
                            <Trash2 className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>

                        {/* Unit Toggle - Per Exercise */}
                        <div className="px-4 pb-3 flex justify-end">
                          <div className="flex items-center gap-1 p-1 bg-secondary/40 rounded-xl">
                            <button
                              onClick={() => {
                                haptics.selection();
                                updateExercise(index, { ...exercise, unit: 'kg' });
                              }}
                              className={cn(
                                "min-w-[44px] min-h-[44px] text-xs font-bold rounded-lg transition-all",
                                unit === 'kg'
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground active:bg-secondary"
                              )}
                            >
                              KG
                            </button>
                            <button
                              onClick={() => {
                                haptics.selection();
                                updateExercise(index, { ...exercise, unit: 'lbs' });
                              }}
                              className={cn(
                                "min-w-[44px] min-h-[44px] text-xs font-bold rounded-lg transition-all",
                                unit === 'lbs'
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground active:bg-secondary"
                              )}
                            >
                              LBS
                            </button>
                          </div>
                        </div>

                        {/* Sets */}
                        <div className="px-4 pb-4 space-y-2">
                          {/* Column headers */}
                          <div className="grid grid-cols-[40px_1fr_1fr_44px] gap-2 px-1 mb-1">
                            <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Set</span>
                            <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider text-center">Reps</span>
                            <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider text-center">{unit.toUpperCase()}</span>
                            <span></span>
                          </div>

                          {exercise.sets.map((set, setIndex) => (
                            <motion.div
                              key={setIndex}
                              initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: setIndex * 0.03 }}
                              className="grid grid-cols-[40px_1fr_1fr_44px] gap-2 items-center"
                            >
                              {/* Set number badge */}
                              <div className="h-8 w-8 rounded-xl bg-secondary/60 flex items-center justify-center">
                                <span className="text-xs font-bold text-muted-foreground">{setIndex + 1}</span>
                              </div>

                              {/* Reps input */}
                              <div className="relative">
                                <Input
                                  id={`reps-${index}-${setIndex}`}
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={set.reps || ''}
                                  onChange={(e) => {
                                    const newSets = [...exercise.sets];
                                    newSets[setIndex].reps = parseInt(e.target.value) || 0;
                                    updateExercise(index, { ...exercise, sets: newSets });
                                  }}
                                  className="h-11 text-center text-lg font-semibold bg-secondary/40 border-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/30 placeholder:text-muted-foreground/30"
                                />
                              </div>

                              {/* Weight input */}
                              <div className="relative">
                                <Input
                                  id={`weight-${index}-${setIndex}`}
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={set.weight || ''}
                                  onChange={(e) => {
                                    const newSets = [...exercise.sets];
                                    newSets[setIndex].weight = parseFloat(e.target.value) || 0;
                                    updateExercise(index, { ...exercise, sets: newSets });
                                  }}
                                  className="h-11 text-center text-lg font-semibold bg-secondary/40 border-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/30 placeholder:text-muted-foreground/30"
                                />
                              </div>

                              {/* Delete set */}
                              <button
                                onClick={() => removeSet(index, setIndex)}
                                aria-label={`Remove set ${setIndex + 1}`}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center opacity-50 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 text-muted-foreground/60 hover:text-destructive active:text-destructive transition-all rounded-xl hover:bg-destructive/10 active:bg-destructive/20"
                              >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 6 6 18" />
                                  <path d="m6 6 12 12" />
                                </svg>
                              </button>
                            </motion.div>
                          ))}

                          {/* Add set button */}
                          <button
                            onClick={() => addSet(index)}
                            aria-label={`Add another set to ${exercise.name || 'exercise'}`}
                            className="w-full min-h-[48px] mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary/70 hover:text-primary active:text-primary rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary/40 active:border-primary/50 hover:bg-primary/5 active:bg-primary/10 transition-all"
                          >
                            <Plus className="h-5 w-5" />
                            Add Set
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Add Exercise Button */}
                  <motion.button
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    onClick={addExercise}
                    aria-label="Add new exercise"
                    className="w-full h-14 flex items-center justify-center gap-2 glass-card rounded-3xl text-sm font-semibold text-foreground/80 hover:text-foreground hover:shadow-glass-lg transition-all"
                  >
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    Add Exercise
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </main>
    </div>
  );
}
