-- LOCKOUT Schedule Events Migration
-- Create gym schedule and join requests tables

CREATE TABLE IF NOT EXISTS public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  gym_location TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  max_participants INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'pending', 'declined')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_schedule_events_squad_date ON public.schedule_events(squad_id, event_date);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON public.event_participants(user_id);

CREATE POLICY "Squad members can view events" ON public.schedule_events
  FOR SELECT USING (
    squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Squad members can create events" ON public.schedule_events
  FOR INSERT WITH CHECK (
    squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Event creators can update" ON public.schedule_events
  FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Event creators can delete" ON public.schedule_events
  FOR DELETE USING (creator_id = auth.uid());

CREATE POLICY "Participants can be viewed by squad" ON public.event_participants
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.schedule_events 
      WHERE squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can join events" ON public.event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation" ON public.event_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can leave events" ON public.event_participants
  FOR DELETE USING (user_id = auth.uid());
