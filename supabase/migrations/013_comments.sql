-- LOCKOUT Workout Comments Migration
-- Adds comments to workouts for social engagement

-- Create comments table
CREATE TABLE comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (length(trim(text)) > 0 AND length(text) <= 500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_comments_workout_id ON comments(workout_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments

-- 1. Squad members can view comments on workouts in their squad
CREATE POLICY "Squad members can view comments" ON comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workouts w
            JOIN squad_members sm ON sm.squad_id = w.squad_id
            WHERE w.id = comments.workout_id
            AND sm.user_id = auth.uid()
        )
    );

-- 2. Squad members can create comments on workouts in their squad
CREATE POLICY "Squad members can create comments" ON comments
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM workouts w
            JOIN squad_members sm ON sm.squad_id = w.squad_id
            WHERE w.id = comments.workout_id
            AND sm.user_id = auth.uid()
        )
    );

-- 3. Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON comments
    FOR DELETE
    USING (user_id = auth.uid());

-- Add notification trigger for comments
CREATE OR REPLACE FUNCTION notify_workout_comment()
RETURNS TRIGGER AS $$
DECLARE
    workout_owner_id UUID;
    commenter_username TEXT;
    comment_preview TEXT;
BEGIN
    -- Get workout owner and commenter username
    SELECT w.user_id, p.username
    INTO workout_owner_id, commenter_username
    FROM workouts w, profiles p
    WHERE w.id = NEW.workout_id
    AND p.id = NEW.user_id;

    -- Create comment preview (first 50 chars)
    comment_preview := CASE
        WHEN length(NEW.text) > 50
        THEN substring(NEW.text from 1 for 47) || '...'
        ELSE NEW.text
    END;

    -- Don't notify if user commented on their own workout
    IF workout_owner_id != NEW.user_id THEN
        PERFORM send_notification_http(
            format('%s commented on your workout 💬', commenter_username),
            comment_preview,
            jsonb_build_object(
                'type', 'workout_comment',
                'workout_id', NEW.workout_id,
                'commenter_id', NEW.user_id,
                'comment_id', NEW.id
            ),
            ARRAY[workout_owner_id], -- notify workout owner
            NULL,
            NULL
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment notifications
DROP TRIGGER IF EXISTS trigger_notify_workout_comment ON comments;
CREATE TRIGGER trigger_notify_workout_comment
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_workout_comment();