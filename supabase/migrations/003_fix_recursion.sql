-- Fix infinite recursion in RLS policies by using SECURITY DEFINER functions
-- Run this in the Supabase SQL Editor

-- 1. Helper function to check if user is in a squad (bypasses RLS)
CREATE OR REPLACE FUNCTION is_squad_member(_squad_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_id = _squad_id AND user_id = auth.uid()
  );
$$;

-- 2. Helper function to count squad members (bypasses RLS)
CREATE OR REPLACE FUNCTION get_squad_member_count(_squad_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.squad_members WHERE squad_id = _squad_id;
$$;

-- 3. Fix "Squad members can view members" policy (SELECT)
DROP POLICY IF EXISTS "Squad members can view members" ON public.squad_members;

CREATE POLICY "Squad members can view members"
  ON public.squad_members FOR SELECT
  USING (
    is_squad_member(squad_id)
  );

-- 4. Fix "Users can join squads within limit" policy (INSERT)
DROP POLICY IF EXISTS "Users can join squads within limit" ON public.squad_members;

CREATE POLICY "Users can join squads within limit"
  ON public.squad_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    (
      get_squad_member_count(squad_members.squad_id) < (
        SELECT member_limit FROM public.squads s
        WHERE s.id = squad_members.squad_id
      )
    )
  );

-- 5. Fix "Squad members can view their squads" (SQUADS table) to use the helper
-- This prevents checking squad_members RLS when viewing squads
DROP POLICY IF EXISTS "Squad members can view their squads" ON public.squads;

CREATE POLICY "Squad members can view their squads"
  ON public.squads FOR SELECT
  USING (
    is_squad_member(id)
  );
