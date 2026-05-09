-- LOCKOUT Workout Reactions Migration
-- Adds reactions (emojis) to workouts for social engagement

-- Create reactions table
CREATE TABLE reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('👍', '🔥', '💪')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One of each emoji per user per workout
    UNIQUE(workout_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX idx_reactions_workout_id ON reactions(workout_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);
CREATE INDEX idx_reactions_created_at ON reactions(created_at DESC);

-- Enable RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reactions

-- 1. Squad members can view reactions on workouts in their squad
CREATE POLICY "Squad members can view reactions" ON reactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workouts w
            JOIN squad_members sm ON sm.squad_id = w.squad_id
            WHERE w.id = reactions.workout_id
            AND sm.user_id = auth.uid()
        )
    );

-- 2. Squad members can create reactions on workouts in their squad
CREATE POLICY "Squad members can create reactions" ON reactions
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM workouts w
            JOIN squad_members sm ON sm.squad_id = w.squad_id
            WHERE w.id = reactions.workout_id
            AND sm.user_id = auth.uid()
        )
    );

-- 3. Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" ON reactions
    FOR DELETE
    USING (user_id = auth.uid());

-- Add notification trigger for reactions (optional - could be added later)
CREATE OR REPLACE FUNCTION notify_workout_reaction()
RETURNS TRIGGER AS $$
DECLARE
    workout_owner_id UUID;
    reactor_username TEXT;
BEGIN
    -- Get workout owner and reactor username
    SELECT w.user_id, p.username
    INTO workout_owner_id, reactor_username
    FROM workouts w, profiles p
    WHERE w.id = NEW.workout_id
    AND p.id = NEW.user_id;

    -- Don't notify if user reacted to their own workout
    IF workout_owner_id != NEW.user_id THEN
        PERFORM send_notification_http(
            format('%s reacted to your workout! %s', reactor_username, NEW.emoji),
            'Check out the reactions on your workout',
            jsonb_build_object(
                'type', 'workout_reaction',
                'workout_id', NEW.workout_id,
                'reactor_id', NEW.user_id,
                'emoji', NEW.emoji
            ),
            ARRAY[workout_owner_id], -- notify workout owner
            NULL,
            NULL
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reaction notifications
DROP TRIGGER IF EXISTS trigger_notify_workout_reaction ON reactions;
CREATE TRIGGER trigger_notify_workout_reaction
    AFTER INSERT ON reactions
    FOR EACH ROW
    EXECUTE FUNCTION notify_workout_reaction();