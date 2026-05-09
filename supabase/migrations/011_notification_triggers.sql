-- LOCKOUT Push Notification Triggers Migration
-- Sets up automatic notifications for key events

-- Function to send HTTP notification (calls our edge function)
CREATE OR REPLACE FUNCTION send_notification_http(
    title TEXT,
    body TEXT,
    data JSONB DEFAULT '{}',
    user_ids TEXT[] DEFAULT NULL,
    squad_id_param UUID DEFAULT NULL,
    exclude_user_ids TEXT[] DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    payload JSONB;
    response TEXT;
BEGIN
    -- Build payload
    payload := jsonb_build_object(
        'title', title,
        'body', body,
        'data', data
    );

    IF user_ids IS NOT NULL THEN
        payload := payload || jsonb_build_object('userIds', to_jsonb(user_ids));
    END IF;

    IF squad_id_param IS NOT NULL THEN
        payload := payload || jsonb_build_object('squadId', squad_id_param);
    END IF;

    IF exclude_user_ids IS NOT NULL THEN
        payload := payload || jsonb_build_object('excludeUserIds', to_jsonb(exclude_user_ids));
    END IF;

    -- Make HTTP request to edge function
    -- Note: This requires the http extension to be enabled
    -- In production, you'd use: SELECT net.http_post(url, payload)
    -- For now, we'll log the notification (can be enhanced later)
    RAISE NOTICE 'NOTIFICATION: % - % (Data: %)', title, body, payload;
END;
$$ LANGUAGE plpgsql;

-- 1. Tribunal submission notifications
CREATE OR REPLACE FUNCTION notify_tribunal_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify for tribunal-level workouts
    IF NEW.verification_level = 'tribunal' THEN
        PERFORM send_notification_http(
            'New Tribunal Submission! ⚖️',
            format('%s submitted a workout for tribunal review. Cast your vote!',
                (SELECT username FROM profiles WHERE id = NEW.user_id)),
            jsonb_build_object(
                'type', 'tribunal_submission',
                'workout_id', NEW.id,
                'user_id', NEW.user_id
            ),
            NULL, -- user_ids
            NEW.squad_id, -- notify whole squad
            ARRAY[NEW.user_id] -- exclude the submitter
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tribunal submissions
DROP TRIGGER IF EXISTS trigger_notify_tribunal_submission ON workouts;
CREATE TRIGGER trigger_notify_tribunal_submission
    AFTER INSERT ON workouts
    FOR EACH ROW
    EXECUTE FUNCTION notify_tribunal_submission();

-- 2. Tribunal result notifications
CREATE OR REPLACE FUNCTION notify_tribunal_result()
RETURNS TRIGGER AS $$
DECLARE
    workout_record RECORD;
    total_votes INTEGER;
    valid_votes INTEGER;
    cap_votes INTEGER;
    squad_size INTEGER;
    majority_threshold INTEGER;
    result_text TEXT;
BEGIN
    -- Get workout details
    SELECT w.*, p.username
    INTO workout_record
    FROM workouts w
    JOIN profiles p ON p.id = w.user_id
    WHERE w.id = NEW.workout_id;

    -- Only process tribunal workouts
    IF workout_record.verification_level != 'tribunal' THEN
        RETURN NEW;
    END IF;

    -- Count votes
    SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE vote = 'valid') as valid,
        COUNT(*) FILTER (WHERE vote = 'cap') as cap
    INTO total_votes, valid_votes, cap_votes
    FROM votes
    WHERE workout_id = NEW.workout_id;

    -- Get squad size to determine majority
    SELECT COUNT(*)
    INTO squad_size
    FROM squad_members
    WHERE squad_id = workout_record.squad_id;

    majority_threshold := CEIL(squad_size / 2.0);

    -- Check if majority reached
    IF valid_votes >= majority_threshold THEN
        result_text := format('✅ Your workout was VALIDATED! (%s valid, %s cap votes)', valid_votes, cap_votes);

        PERFORM send_notification_http(
            'Tribunal Verdict: VALID! ✅',
            result_text,
            jsonb_build_object(
                'type', 'tribunal_result',
                'workout_id', NEW.workout_id,
                'result', 'valid',
                'valid_votes', valid_votes,
                'cap_votes', cap_votes
            ),
            ARRAY[workout_record.user_id], -- notify only the submitter
            NULL,
            NULL
        );
    ELSIF cap_votes >= majority_threshold THEN
        result_text := format('❌ Your workout was called CAP! (%s valid, %s cap votes)', valid_votes, cap_votes);

        PERFORM send_notification_http(
            'Tribunal Verdict: CAP! ❌',
            result_text,
            jsonb_build_object(
                'type', 'tribunal_result',
                'workout_id', NEW.workout_id,
                'result', 'cap',
                'valid_votes', valid_votes,
                'cap_votes', cap_votes
            ),
            ARRAY[workout_record.user_id], -- notify only the submitter
            NULL,
            NULL
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tribunal results
DROP TRIGGER IF EXISTS trigger_notify_tribunal_result ON votes;
CREATE TRIGGER trigger_notify_tribunal_result
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION notify_tribunal_result();

-- 3. New challenge notifications
CREATE OR REPLACE FUNCTION notify_new_challenge()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM send_notification_http(
        format('New Challenge: %s! 🏆', NEW.title),
        format('%s (%s pts reward)', NEW.description, NEW.point_reward),
        jsonb_build_object(
            'type', 'new_challenge',
            'challenge_id', NEW.id,
            'challenge_type', NEW.challenge_type,
            'point_reward', NEW.point_reward
        ),
        NULL, -- user_ids
        NEW.squad_id, -- notify whole squad
        NULL -- don't exclude anyone
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new challenges
DROP TRIGGER IF EXISTS trigger_notify_new_challenge ON challenges;
CREATE TRIGGER trigger_notify_new_challenge
    AFTER INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_challenge();

-- 4. Streak milestone notifications
CREATE OR REPLACE FUNCTION notify_streak_milestone()
RETURNS TRIGGER AS $$
DECLARE
    milestone_reached INTEGER;
    milestone_text TEXT;
BEGIN
    -- Check if current_streak hit a milestone (7, 14, 30, 50, 100 days)
    IF NEW.current_streak != OLD.current_streak THEN
        CASE
            WHEN NEW.current_streak = 7 THEN
                milestone_reached := 7;
                milestone_text := 'Week-long warrior! 🔥';
            WHEN NEW.current_streak = 14 THEN
                milestone_reached := 14;
                milestone_text := 'Two weeks strong! 💪';
            WHEN NEW.current_streak = 30 THEN
                milestone_reached := 30;
                milestone_text := 'Monthly legend! 🏆';
            WHEN NEW.current_streak = 50 THEN
                milestone_reached := 50;
                milestone_text := 'Unstoppable force! ⚡';
            WHEN NEW.current_streak = 100 THEN
                milestone_reached := 100;
                milestone_text := 'Century club! 👑';
            ELSE
                milestone_reached := NULL;
        END CASE;

        IF milestone_reached IS NOT NULL THEN
            PERFORM send_notification_http(
                format('🔥 %s Day Streak!', milestone_reached),
                format('Congratulations! %s Keep the momentum going!', milestone_text),
                jsonb_build_object(
                    'type', 'streak_milestone',
                    'streak_days', milestone_reached,
                    'user_id', NEW.id
                ),
                ARRAY[NEW.id], -- notify only the user
                NULL,
                NULL
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for streak milestones
DROP TRIGGER IF EXISTS trigger_notify_streak_milestone ON profiles;
CREATE TRIGGER trigger_notify_streak_milestone
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_streak_milestone();

-- 5. Event reminder function (to be called by cron job)
CREATE OR REPLACE FUNCTION send_event_reminders()
RETURNS VOID AS $$
DECLARE
    event_record RECORD;
    participant_ids TEXT[];
BEGIN
    -- Find events starting in approximately 1 hour
    FOR event_record IN
        SELECT se.*, s.name as squad_name
        FROM schedule_events se
        JOIN squads s ON s.id = se.squad_id
        WHERE se.event_date = CURRENT_DATE
        AND se.start_time::TIME BETWEEN (CURRENT_TIME + INTERVAL '50 minutes') AND (CURRENT_TIME + INTERVAL '70 minutes')
    LOOP
        -- Get participant IDs
        SELECT ARRAY_AGG(ep.user_id)
        INTO participant_ids
        FROM event_participants ep
        WHERE ep.event_id = event_record.id
        AND ep.status = 'joined';

        IF participant_ids IS NOT NULL AND array_length(participant_ids, 1) > 0 THEN
            PERFORM send_notification_http(
                format('📅 Event Starting Soon!'),
                format('%s starts in 1 hour at %s', event_record.title, event_record.gym_location),
                jsonb_build_object(
                    'type', 'event_reminder',
                    'event_id', event_record.id,
                    'event_title', event_record.title,
                    'start_time', event_record.start_time,
                    'location', event_record.gym_location
                ),
                participant_ids, -- notify participants only
                NULL,
                NULL
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old notifications (optional)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Deactivate expired challenges
    PERFORM deactivate_expired_challenges();

    -- Could add more cleanup tasks here
    -- e.g., delete old workout media, archive old votes, etc.
END;
$$ LANGUAGE plpgsql;