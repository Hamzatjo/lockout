-- LOCKOUT Streak Tracking Migration
-- Adds streak tracking columns and functions

-- Add streak columns to profiles
ALTER TABLE profiles
ADD COLUMN current_streak INTEGER DEFAULT 0,
ADD COLUMN longest_streak INTEGER DEFAULT 0;

-- Create function to calculate user's current streak
CREATE OR REPLACE FUNCTION calculate_current_streak(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    streak_count INTEGER := 0;
    check_date DATE;
    current_date_check DATE := CURRENT_DATE;
    has_workout BOOLEAN;
BEGIN
    -- Start from today and go backwards
    LOOP
        -- Check if user has a check-in workout on this date
        SELECT EXISTS(
            SELECT 1 FROM workouts
            WHERE user_id = user_id_param
            AND verification_level = 'check_in'
            AND DATE(created_at) = current_date_check
        ) INTO has_workout;

        -- If no workout on this date, break the streak
        IF NOT has_workout THEN
            -- Special case: if it's today and no workout yet, don't break streak
            IF current_date_check = CURRENT_DATE THEN
                current_date_check := current_date_check - INTERVAL '1 day';
                CONTINUE;
            ELSE
                EXIT;
            END IF;
        END IF;

        -- Increment streak and check previous day
        streak_count := streak_count + 1;
        current_date_check := current_date_check - INTERVAL '1 day';

        -- Safety limit to prevent infinite loops
        IF streak_count > 365 THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN streak_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user streaks
CREATE OR REPLACE FUNCTION update_user_streaks(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
    current_streak_val INTEGER;
    longest_streak_val INTEGER;
BEGIN
    -- Calculate current streak
    SELECT calculate_current_streak(user_id_param) INTO current_streak_val;

    -- Get existing longest streak
    SELECT longest_streak INTO longest_streak_val
    FROM profiles
    WHERE id = user_id_param;

    -- Update longest streak if current is higher
    IF current_streak_val > longest_streak_val THEN
        longest_streak_val := current_streak_val;
    END IF;

    -- Update profile with new streak values
    UPDATE profiles
    SET
        current_streak = current_streak_val,
        longest_streak = longest_streak_val
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update streaks when check-in workouts are created
CREATE OR REPLACE FUNCTION trigger_update_streaks()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update streaks for check-in workouts
    IF NEW.verification_level = 'check_in' THEN
        PERFORM update_user_streaks(NEW.user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on workouts table
DROP TRIGGER IF EXISTS update_streaks_on_checkin ON workouts;
CREATE TRIGGER update_streaks_on_checkin
    AFTER INSERT ON workouts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_streaks();

-- Backfill existing users' streaks
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM profiles LOOP
        PERFORM update_user_streaks(user_record.id);
    END LOOP;
END $$;

-- Create index for better performance on streak calculations
CREATE INDEX IF NOT EXISTS idx_workouts_user_checkin_date
ON workouts(user_id, verification_level, created_at)
WHERE verification_level = 'check_in';