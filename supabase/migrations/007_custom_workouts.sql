-- LOCKOUT Custom Workouts Migration
-- Personal workout templates and logging

CREATE TABLE IF NOT EXISTS public.custom_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.custom_workouts(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  sets INTEGER DEFAULT 3,
  reps_min INTEGER DEFAULT 8,
  reps_max INTEGER DEFAULT 12,
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.custom_workouts(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  completed BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg DECIMAL(6,2),
  reps INTEGER,
  duration_seconds INTEGER,
  notes TEXT
);

ALTER TABLE public.custom_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_custom_workouts_user ON public.custom_workouts(user_id);
CREATE INDEX idx_workout_exercises_workout ON public.workout_exercises(workout_id);
CREATE INDEX idx_workout_logs_user_date ON public.workout_logs(user_id, logged_at);
CREATE INDEX idx_exercise_logs_log ON public.exercise_logs(workout_log_id);

CREATE POLICY "Users own workouts" ON public.custom_workouts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own workout exercises" ON public.workout_exercises
  FOR ALL USING (
    workout_id IN (SELECT id FROM public.custom_workouts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users own logs" ON public.workout_logs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own exercise logs" ON public.exercise_logs
  FOR ALL USING (
    workout_log_id IN (SELECT id FROM public.workout_logs WHERE user_id = auth.uid())
  );
