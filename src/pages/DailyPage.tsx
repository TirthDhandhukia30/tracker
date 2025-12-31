import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, isValid, getDayOfYear } from 'date-fns';
import { useDailyEntry } from '@/hooks/useDailyEntry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Plus, Trash2, Check, BookOpen, Briefcase, History, Sparkles } from 'lucide-react';
import type { GymType, Exercise } from '@/types';
import { cn } from '@/lib/utils';
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

    toast.promise(copyLastWorkout(gymType), {
      loading: 'Loading...',
      success: (found) => found ? `Loaded last ${gymType}` : 'No history',
      error: 'Failed'
    });
  };

  const StatusDot = () => (
    <div className={cn(
      "h-2 w-2 rounded-full transition-colors",
      status === 'saving' && "bg-yellow-500 animate-pulse",
      status === 'synced' && "bg-green-500",
      status === 'error' && "bg-destructive"
    )} />
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold">{format(parseISO(dateStr), 'EEEE, MMM d')}</span>
          <div className="w-9 flex justify-end"><StatusDot /></div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-10">

        {/* Weight */}
        <section className="flex flex-col items-center justify-center">
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="—"
              value={entry.current_weight || ''}
              onChange={(e) => updateEntry({ current_weight: parseFloat(e.target.value) || undefined })}
              className="h-24 w-48 text-center text-5xl font-bold bg-transparent border-0 focus-visible:ring-0 p-0 tracking-tight placeholder:text-muted/20"
            />
            <span className="absolute -right-4 top-8 text-lg font-medium text-muted-foreground select-none">kg</span>
          </div>
        </section>

        {/* Habits */}
        <section className="grid grid-cols-2 gap-4">
          {[
            { key: 'book_reading', label: 'Read', icon: BookOpen },
            { key: 'work_done', label: 'Work', icon: Briefcase }
          ].map(({ key, label, icon: Icon }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleHabit(key as 'book_reading' | 'work_done')}
              className={cn(
                "h-16 rounded-2xl flex items-center justify-between px-5 transition-all border select-none",
                entry[key as 'book_reading' | 'work_done']
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <span className="font-medium">{label}</span>
              </div>
              {entry[key as 'book_reading' | 'work_done'] && <Check className="h-5 w-5" />}
            </motion.button>
          ))}
        </section>

        {/* The One Question */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 pl-1">
            <Sparkles className="h-3 w-3 text-primary/60" />
            <p className="text-sm font-medium text-foreground/80">{dailyPrompt}</p>
          </div>
          <Textarea
            placeholder="..."
            value={entry.note || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateEntry({ note: e.target.value })}
            className="min-h-[80px] bg-card/30 border-0 resize-none focus-visible:ring-0 px-4 py-3 text-base leading-relaxed placeholder:text-muted-foreground/20 rounded-xl"
          />
        </section>

        {/* Workout */}
        <section className="space-y-5">
          <div className="bg-secondary/50 p-1 rounded-xl flex gap-1">
            {GYM_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => updateEntry({ gym_type: type.value as GymType })}
                className={cn(
                  "flex-1 py-3 text-sm font-medium rounded-lg transition-all",
                  entry.gym_type === type.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {entry.gym_type !== 'rest' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
                <button
                  onClick={handleCopyWorkout}
                  className="w-full py-3 text-sm text-primary/70 hover:text-primary font-medium flex items-center justify-center gap-2 border-2 border-dashed border-border/50 rounded-xl hover:border-primary/30 transition-colors"
                >
                  <History className="h-4 w-4" />
                  Repeat last {entry.gym_type}
                </button>

                <div className="space-y-5">
                  {entry.exercises?.map((exercise, index) => (
                    <div key={index} className="group">
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          placeholder="Exercise"
                          value={exercise.name}
                          onChange={(e) => updateExercise(index, { ...exercise, name: e.target.value })}
                          className="font-semibold text-base border-0 bg-transparent p-0 focus-visible:ring-0 placeholder:text-muted-foreground/30"
                        />
                        <button
                          onClick={() => removeExercise(index)}
                          className="p-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="pl-3 border-l-2 border-border/40 space-y-2">
                        {exercise.sets.map((set, setIndex) => (
                          <div key={setIndex} className="flex items-center gap-3 text-sm">
                            <span className="w-4 text-xs text-muted-foreground/60 font-mono">{setIndex + 1}</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={set.reps || ''}
                              onChange={(e) => {
                                const newSets = [...exercise.sets];
                                newSets[setIndex].reps = parseInt(e.target.value) || 0;
                                updateExercise(index, { ...exercise, sets: newSets });
                              }}
                              className="w-12 text-center h-8 bg-secondary/30 border-0 p-1 rounded font-medium"
                            />
                            <span className="text-muted-foreground/40">×</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={set.weight || ''}
                              onChange={(e) => {
                                const newSets = [...exercise.sets];
                                newSets[setIndex].weight = parseInt(e.target.value) || 0;
                                updateExercise(index, { ...exercise, sets: newSets });
                              }}
                              className="w-14 text-center h-8 bg-secondary/30 border-0 p-1 rounded font-medium"
                            />
                            <span className="text-xs text-muted-foreground/50">kg</span>
                            <button
                              onClick={() => removeSet(index, setIndex)}
                              className="ml-auto p-1 opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => addSet(index)} className="text-xs text-primary/60 hover:text-primary py-1 font-medium">+ Set</button>
                      </div>
                    </div>
                  ))}

                  <Button variant="secondary" size="sm" className="w-full" onClick={addExercise}>
                    <Plus className="h-4 w-4 mr-1" /> Exercise
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
