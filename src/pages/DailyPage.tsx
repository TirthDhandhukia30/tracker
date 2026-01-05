import { useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, isValid, getDayOfYear } from 'date-fns';
import { useDailyEntry } from '@/hooks/useDailyEntry';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton, SkeletonHabitButton, SkeletonExercise } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Trash2, Check, BookOpen, Briefcase, History, Sparkles, Footprints } from 'lucide-react';
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

  const handleToggleHabit = (key: 'book_reading' | 'work_done') => {
    haptics.light();
    toggleHabit(key);
  };

  const updateEntry = (updates: Partial<typeof entry>) => {
    setEntry(prev => ({ ...prev, ...updates }));
  };

  const addExercise = () => {
    const newExercise: Exercise = { name: '', sets: [{ reps: 0, weight: 0 }] };
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

  const StatusDot = () => {
    const statusLabel = status === 'saving' ? 'Saving changes' : status === 'synced' ? 'All changes saved' : status === 'error' ? 'Error saving' : 'Loading';
    return (
      <div 
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          status === 'saving' && "bg-yellow-500 animate-pulse",
          status === 'synced' && "bg-green-500",
          status === 'error' && "bg-destructive"
        )}
        role="status"
        aria-label={statusLabel}
        title={statusLabel}
      />
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
          <div className="w-9 flex justify-end"><StatusDot /></div>
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
          {/* Reading */}
          <div className="space-y-2">
            <motion.button
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={() => handleToggleHabit('book_reading')}
              role="switch"
              aria-checked={entry.book_reading}
              aria-label={`Reading: ${entry.book_reading ? 'completed' : 'not completed'}. Tap to toggle.`}
              className={cn(
                "w-full h-14 rounded-2xl flex items-center justify-between px-5 transition-all select-none",
                entry.book_reading
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow"
                  : "glass-card hover:shadow-glass-lg"
              )}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                <span className="font-medium">Reading</span>
              </div>
              {entry.book_reading && <Check className="h-5 w-5" aria-hidden="true" />}
            </motion.button>
            
            {entry.book_reading && (
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Input
                  placeholder="What did you read?"
                  value={entry.reading_note || ''}
                  onChange={(e) => updateEntry({ reading_note: e.target.value })}
                  aria-label="What did you read?"
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
                inputMode="numeric"
                placeholder="0"
                min={0}
                max={99}
                value={entry.daily_steps ? Math.round(entry.daily_steps / 1000) : ''}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 2);
                  const num = parseInt(val) || 0;
                  updateEntry({ daily_steps: num > 0 ? num * 1000 : undefined });
                }}
                className="w-12 text-lg font-bold bg-transparent border-0 focus-visible:ring-0 p-0 text-right placeholder:text-muted-foreground/30"
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
                className="space-y-6"
              >
                <button
                  onClick={handleCopyWorkout}
                  aria-label={`Copy exercises from your last ${entry.gym_type} workout`}
                  className="w-full py-3 text-sm text-primary/70 hover:text-primary font-medium flex items-center justify-center gap-2 glass-subtle rounded-2xl hover:shadow-glass transition-all"
                >
                  <History className="h-4 w-4" aria-hidden="true" />
                  Repeat last {entry.gym_type}
                </button>

                <div className="space-y-5" role="list" aria-label="Exercises">
                  {entry.exercises?.map((exercise, index) => (
                    <div key={index} className="group glass-card rounded-2xl p-4" role="listitem">
                      <div className="flex items-center gap-2 mb-3">
                        <label htmlFor={`exercise-name-${index}`} className="sr-only">Exercise name</label>
                        <Input
                          id={`exercise-name-${index}`}
                          placeholder="Exercise"
                          value={exercise.name}
                          onChange={(e) => updateExercise(index, { ...exercise, name: e.target.value })}
                          className="font-semibold text-base border-0 bg-transparent p-0 focus-visible:ring-0 placeholder:text-muted-foreground/30"
                        />
                        <button
                          onClick={() => removeExercise(index)}
                          aria-label={`Remove ${exercise.name || 'exercise'}`}
                          className="p-2 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive transition-all rounded-lg hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="pl-3 border-l-2 border-primary/20 space-y-2" role="list" aria-label={`Sets for ${exercise.name || 'exercise'}`}>
                        {exercise.sets.map((set, setIndex) => (
                          <div key={setIndex} className="flex items-center gap-3 text-sm" role="listitem">
                            <span className="w-4 text-xs text-muted-foreground/60 font-mono" aria-hidden="true">{setIndex + 1}</span>
                            <label htmlFor={`reps-${index}-${setIndex}`} className="sr-only">Reps for set {setIndex + 1}</label>
                            <Input
                              id={`reps-${index}-${setIndex}`}
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={set.reps || ''}
                              onChange={(e) => {
                                const newSets = [...exercise.sets];
                                newSets[setIndex].reps = parseInt(e.target.value) || 0;
                                updateExercise(index, { ...exercise, sets: newSets });
                              }}
                              aria-label={`Reps for set ${setIndex + 1}`}
                              className="w-12 text-center h-8 glass-input border-0 p-1 rounded-lg font-medium"
                            />
                            <span className="text-muted-foreground/40" aria-hidden="true">×</span>
                            <label htmlFor={`weight-${index}-${setIndex}`} className="sr-only">Weight for set {setIndex + 1} in kg</label>
                            <Input
                              id={`weight-${index}-${setIndex}`}
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={set.weight || ''}
                              onChange={(e) => {
                                const newSets = [...exercise.sets];
                                newSets[setIndex].weight = parseInt(e.target.value) || 0;
                                updateExercise(index, { ...exercise, sets: newSets });
                              }}
                              aria-label={`Weight for set ${setIndex + 1} in kilograms`}
                              className="w-14 text-center h-8 glass-input border-0 p-1 rounded-lg font-medium"
                            />
                            <span className="text-xs text-muted-foreground/50" aria-hidden="true">kg</span>
                            <button
                              onClick={() => removeSet(index, setIndex)}
                              aria-label={`Remove set ${setIndex + 1}`}
                              className="ml-auto p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground/30 hover:text-destructive transition-all rounded"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => addSet(index)} 
                          aria-label={`Add another set to ${exercise.name || 'exercise'}`}
                          className="text-xs text-primary/60 hover:text-primary py-1 font-medium"
                        >
                          + Set
                        </button>
                      </div>
                    </div>
                  ))}

                  <Button 
                    variant="glass" 
                    size="sm" 
                    className="w-full rounded-xl" 
                    onClick={addExercise}
                    aria-label="Add new exercise"
                  >
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> Exercise
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </main>
    </div>
  );
}
