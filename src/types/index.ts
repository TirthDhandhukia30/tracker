export type GymType = 'push' | 'pull' | 'legs' | 'rest';

export interface ExerciseSet {
  reps: number;
  weight: number;
}

export interface Exercise {
  id?: string; // Optional for UI tracking
  name: string;
  sets: ExerciseSet[];
}

export interface DailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  book_reading: boolean;
  reading_note?: string; // What did you read?
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
  created_at?: string;
  updated_at?: string;
}
