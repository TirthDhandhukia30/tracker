export type GymType = 'push' | 'pull' | 'legs' | 'rest';

export interface ExerciseSet {
  reps: number;
  weight: number;
}

export interface Exercise {
  id?: string; // Optional for UI tracking
  name: string;
  sets: ExerciseSet[];
  unit?: 'kg' | 'lbs'; // Per-exercise weight unit
}

export interface DailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  running: boolean;
  running_note?: string; // Distance, time, or notes about the run
  work_done: boolean;
  work_note?: string; // What did you work on?
  gym_type: GymType;
  exercises: Exercise[];
  current_weight?: number;
  daily_steps?: number;
  note?: string;
  sleep_hours?: number;
  energy_level?: number;
  gratitude?: string;
  is_highlighted?: boolean;
  created_at?: string;
  updated_at?: string;
}
