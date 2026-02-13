-- LOCKOUT PR Columns Migration
-- Add structured PR data to workouts table

ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS exercise_type TEXT,
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS reps INTEGER,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_workouts_pr 
ON public.workouts(exercise_type, squad_id) 
WHERE verification_level = 'tribunal' AND is_verified = true;

CREATE INDEX IF NOT EXISTS idx_workouts_exercise 
ON public.workouts(exercise_type, squad_id);

CREATE OR REPLACE FUNCTION public.set_pr_verified()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.workouts
  SET is_verified = true
  WHERE id = NEW.workout_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
