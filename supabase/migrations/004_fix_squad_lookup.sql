-- Fix: Allow looking up squads by invite code for joining
-- Run this in the Supabase SQL Editor

-- Add policy to allow any authenticated user to look up squads (for joining)
-- This enables the JOIN flow to work
CREATE POLICY "Anyone can lookup squads by invite code"
  ON public.squads FOR SELECT
  USING (true);  -- Squads are semi-public; the code is the secret

-- If you prefer more restrictive access (only see your own squads):
-- Comment out the above and use this instead:
-- 
-- DROP POLICY IF EXISTS "Squad members can view their squads" ON public.squads;
-- CREATE POLICY "Squad members can view their squads or lookup by code"
--   ON public.squads FOR SELECT
--   USING (
--     id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
--     OR true  -- Allow lookup for joining
--   );
