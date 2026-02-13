-- LOCKOUT: Link workout logs to schedule events and add squad visibility

-- Add schedule_event_id to workout_logs to link logged sessions to scheduled events
ALTER TABLE public.workout_logs 
ADD COLUMN IF NOT EXISTS schedule_event_id UUID REFERENCES public.schedule_events(id) ON DELETE SET NULL;

-- Add custom_workout_id to schedule_events so users can schedule a specific workout template
ALTER TABLE public.schedule_events 
ADD COLUMN IF NOT EXISTS workout_template_id UUID REFERENCES public.custom_workouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workout_logs_event ON public.workout_logs(schedule_event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_template ON public.schedule_events(workout_template_id);

-- Allow squad members to see each other's workout logs
CREATE POLICY "Squad members can view logs" ON public.workout_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT sm.user_id FROM squad_members sm
      WHERE sm.squad_id IN (
        SELECT sm2.squad_id FROM squad_members sm2 WHERE sm2.user_id = auth.uid()
      )
    )
  );

-- Allow squad members to view each other's exercise logs
CREATE POLICY "Squad members can view exercise logs" ON public.exercise_logs
  FOR SELECT USING (
    workout_log_id IN (
      SELECT id FROM public.workout_logs WHERE
        user_id = auth.uid() OR
        user_id IN (
          SELECT sm.user_id FROM squad_members sm
          WHERE sm.squad_id IN (
            SELECT sm2.squad_id FROM squad_members sm2 WHERE sm2.user_id = auth.uid()
          )
        )
    )
  );
