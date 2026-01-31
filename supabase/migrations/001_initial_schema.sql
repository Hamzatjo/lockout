-- LOCKOUT Initial Database Schema
-- Run this in Supabase SQL Editor or via CLI

-- ======================
-- PROFILES TABLE
-- ======================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================
-- SQUADS TABLE
-- ======================
CREATE TABLE IF NOT EXISTS public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'lite' CHECK (plan_tier IN ('lite', 'pro', 'club')),
  member_limit INTEGER NOT NULL DEFAULT 5,
  invite_code TEXT UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-set member_limit based on plan_tier
CREATE OR REPLACE FUNCTION public.set_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.member_limit := CASE NEW.plan_tier
    WHEN 'lite' THEN 5
    WHEN 'pro' THEN 20
    WHEN 'club' THEN 100
    ELSE 5
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_squad_member_limit ON public.squads;
CREATE TRIGGER set_squad_member_limit
  BEFORE INSERT OR UPDATE OF plan_tier ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.set_member_limit();

-- ======================
-- SQUAD MEMBERS TABLE
-- ======================
CREATE TABLE IF NOT EXISTS public.squad_members (
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (squad_id, user_id)
);

-- Add squad leader as first member
CREATE OR REPLACE FUNCTION public.add_leader_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.squad_members (squad_id, user_id)
  VALUES (NEW.id, NEW.leader_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS add_squad_leader ON public.squads;
CREATE TRIGGER add_squad_leader
  AFTER INSERT ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.add_leader_as_member();

-- ======================
-- WORKOUTS TABLE
-- ======================
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  verification_level TEXT NOT NULL CHECK (verification_level IN ('check_in', 'log', 'tribunal')),
  points INTEGER NOT NULL DEFAULT 0,
  media_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for ephemeral cleanup
CREATE INDEX IF NOT EXISTS idx_workouts_expires_at ON public.workouts(expires_at);

-- ======================
-- VOTES TABLE
-- ======================
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('valid', 'cap')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workout_id, user_id) -- One vote per user per workout
);

-- ======================
-- QUESTS TABLE (Commissioner AI)
-- ======================
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  point_multiplier DECIMAL NOT NULL DEFAULT 1.5,
  exercise_type TEXT, -- 'legs', 'cardio', 'push', etc.
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for active quests
CREATE INDEX IF NOT EXISTS idx_quests_active ON public.quests(squad_id, expires_at);

-- ======================
-- ENABLE RLS
-- ======================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
