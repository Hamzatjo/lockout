-- LOCKOUT Row Level Security Policies
-- Run this AFTER 001_initial_schema.sql

-- ======================
-- PROFILES POLICIES
-- ======================
-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ======================
-- SQUADS POLICIES
-- ======================
-- Squad members can view their squads
CREATE POLICY "Squad members can view their squads"
  ON public.squads FOR SELECT
  USING (
    id IN (
      SELECT squad_id FROM public.squad_members
      WHERE user_id = auth.uid()
    )
  );

-- Any authenticated user can create a squad
CREATE POLICY "Authenticated users can create squads"
  ON public.squads FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

-- Only leader can update squad
CREATE POLICY "Squad leader can update squad"
  ON public.squads FOR UPDATE
  USING (auth.uid() = leader_id)
  WITH CHECK (auth.uid() = leader_id);

-- Only leader can delete squad
CREATE POLICY "Squad leader can delete squad"
  ON public.squads FOR DELETE
  USING (auth.uid() = leader_id);

-- ======================
-- SQUAD MEMBERS POLICIES (Dynamic Limit)
-- ======================
-- Squad members can view other members
CREATE POLICY "Squad members can view members"
  ON public.squad_members FOR SELECT
  USING (
    squad_id IN (
      SELECT squad_id FROM public.squad_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can join squads (with dynamic member limit check)
CREATE POLICY "Users can join squads within limit"
  ON public.squad_members FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() = user_id
    AND
    -- Check squad has room based on plan_tier
    (
      SELECT COUNT(*) FROM public.squad_members sm
      WHERE sm.squad_id = squad_members.squad_id
    ) < (
      SELECT member_limit FROM public.squads s
      WHERE s.id = squad_members.squad_id
    )
  );

-- Users can leave squads (remove themselves)
CREATE POLICY "Users can leave squads"
  ON public.squad_members FOR DELETE
  USING (auth.uid() = user_id);

-- Squad leaders can remove members
CREATE POLICY "Squad leaders can remove members"
  ON public.squad_members FOR DELETE
  USING (
    squad_id IN (
      SELECT id FROM public.squads
      WHERE leader_id = auth.uid()
    )
  );

-- ======================
-- WORKOUTS POLICIES
-- ======================
-- Squad members can view workouts
CREATE POLICY "Squad members can view workouts"
  ON public.workouts FOR SELECT
  USING (
    squad_id IN (
      SELECT squad_id FROM public.squad_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create workouts in their squads
CREATE POLICY "Users can create workouts in their squads"
  ON public.workouts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    squad_id IN (
      SELECT squad_id FROM public.squad_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own workouts
CREATE POLICY "Users can update own workouts"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own workouts
CREATE POLICY "Users can delete own workouts"
  ON public.workouts FOR DELETE
  USING (auth.uid() = user_id);

-- ======================
-- VOTES POLICIES
-- ======================
-- Squad members can view votes on workouts in their squad
CREATE POLICY "Squad members can view votes"
  ON public.votes FOR SELECT
  USING (
    workout_id IN (
      SELECT id FROM public.workouts w
      WHERE w.squad_id IN (
        SELECT squad_id FROM public.squad_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Squad members can vote on tribunal workouts (once per workout)
CREATE POLICY "Squad members can vote on tribunal workouts"
  ON public.votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    -- Can't vote on own workout
    workout_id NOT IN (
      SELECT id FROM public.workouts WHERE user_id = auth.uid()
    )
    AND
    -- Workout must be tribunal type
    workout_id IN (
      SELECT id FROM public.workouts
      WHERE verification_level = 'tribunal'
    )
    AND
    -- Must be in same squad
    workout_id IN (
      SELECT id FROM public.workouts w
      WHERE w.squad_id IN (
        SELECT squad_id FROM public.squad_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ======================
-- QUESTS POLICIES
-- ======================
-- Squad members can view quests
CREATE POLICY "Squad members can view quests"
  ON public.quests FOR SELECT
  USING (
    squad_id IN (
      SELECT squad_id FROM public.squad_members
      WHERE user_id = auth.uid()
    )
  );

-- Only system/edge functions can create quests (use service role)
-- No INSERT policy for regular users

-- ======================
-- STORAGE POLICIES (for Supabase Storage)
-- ======================
-- Note: Apply these in Supabase Dashboard > Storage > Policies

-- Bucket: workouts
-- SELECT: Squad members can view media from workouts in their squad
-- INSERT: Authenticated users can upload to their own folder
-- DELETE: Users can delete their own media
