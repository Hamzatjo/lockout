-- LOCKOUT Challenges System Migration
-- Adds challenges and challenge participation tracking

-- Create challenges table
CREATE TABLE challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('individual', 'group')),
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    point_reward INTEGER NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,

    CONSTRAINT valid_date_range CHECK (ends_at > starts_at),
    CONSTRAINT positive_target CHECK (target_value > 0),
    CONSTRAINT positive_reward CHECK (point_reward > 0)
);

-- Create challenge participants table
CREATE TABLE challenge_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(challenge_id, user_id),
    CONSTRAINT non_negative_progress CHECK (progress >= 0)
);

-- Create indexes for better performance
CREATE INDEX idx_challenges_squad_active ON challenges(squad_id, is_active, ends_at);
CREATE INDEX idx_challenges_dates ON challenges(starts_at, ends_at);
CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);

-- Function to automatically join squad members to group challenges
CREATE OR REPLACE FUNCTION auto_join_group_challenges()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-join for group challenges
    IF NEW.challenge_type = 'group' THEN
        -- Insert all squad members as participants
        INSERT INTO challenge_participants (challenge_id, user_id)
        SELECT NEW.id, sm.user_id
        FROM squad_members sm
        WHERE sm.squad_id = NEW.squad_id
        ON CONFLICT (challenge_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-join squad members to group challenges
CREATE TRIGGER trigger_auto_join_group_challenges
    AFTER INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION auto_join_group_challenges();

-- Function to update challenge progress based on workouts
CREATE OR REPLACE FUNCTION update_challenge_progress()
RETURNS TRIGGER AS $$
DECLARE
    challenge_record RECORD;
BEGIN
    -- Only process check-in workouts
    IF NEW.verification_level != 'check_in' THEN
        RETURN NEW;
    END IF;

    -- Find active individual challenges for this user's squad
    FOR challenge_record IN
        SELECT c.id, c.challenge_type, c.target_value
        FROM challenges c
        WHERE c.squad_id = NEW.squad_id
        AND c.is_active = true
        AND c.starts_at <= NOW()
        AND c.ends_at > NOW()
        AND c.challenge_type = 'individual'
    LOOP
        -- Update or insert participant progress
        INSERT INTO challenge_participants (challenge_id, user_id, progress)
        VALUES (challenge_record.id, NEW.user_id, 1)
        ON CONFLICT (challenge_id, user_id)
        DO UPDATE SET
            progress = challenge_participants.progress + 1,
            completed_at = CASE
                WHEN challenge_participants.progress + 1 >= challenge_record.target_value
                THEN NOW()
                ELSE challenge_participants.completed_at
            END;
    END LOOP;

    -- Update group challenges
    FOR challenge_record IN
        SELECT c.id, c.target_value
        FROM challenges c
        WHERE c.squad_id = NEW.squad_id
        AND c.is_active = true
        AND c.starts_at <= NOW()
        AND c.ends_at > NOW()
        AND c.challenge_type = 'group'
    LOOP
        -- Update group challenge current_value
        UPDATE challenges
        SET current_value = (
            SELECT COALESCE(SUM(cp.progress), 0)
            FROM challenge_participants cp
            WHERE cp.challenge_id = challenge_record.id
        )
        WHERE id = challenge_record.id;

        -- Update participant progress
        INSERT INTO challenge_participants (challenge_id, user_id, progress)
        VALUES (challenge_record.id, NEW.user_id, 1)
        ON CONFLICT (challenge_id, user_id)
        DO UPDATE SET progress = challenge_participants.progress + 1;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update challenge progress on new workouts
CREATE TRIGGER trigger_update_challenge_progress
    AFTER INSERT ON workouts
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_progress();

-- Function to deactivate expired challenges
CREATE OR REPLACE FUNCTION deactivate_expired_challenges()
RETURNS VOID AS $$
BEGIN
    UPDATE challenges
    SET is_active = false
    WHERE is_active = true
    AND ends_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Users can view challenges for their squad
CREATE POLICY "Users can view squad challenges" ON challenges
    FOR SELECT USING (
        squad_id IN (
            SELECT sm.squad_id FROM squad_members sm
            WHERE sm.user_id = auth.uid()
        )
    );

-- Users can view their own challenge participation
CREATE POLICY "Users can view own participation" ON challenge_participants
    FOR SELECT USING (user_id = auth.uid());

-- Users can view participation for their squad's challenges
CREATE POLICY "Users can view squad challenge participation" ON challenge_participants
    FOR SELECT USING (
        challenge_id IN (
            SELECT c.id FROM challenges c
            JOIN squad_members sm ON sm.squad_id = c.squad_id
            WHERE sm.user_id = auth.uid()
        )
    );

-- Squad leaders can insert challenges
CREATE POLICY "Squad leaders can create challenges" ON challenges
    FOR INSERT WITH CHECK (
        squad_id IN (
            SELECT s.id FROM squads s
            WHERE s.leader_id = auth.uid()
        )
    );

-- Squad leaders can update their squad's challenges
CREATE POLICY "Squad leaders can update challenges" ON challenges
    FOR UPDATE USING (
        squad_id IN (
            SELECT s.id FROM squads s
            WHERE s.leader_id = auth.uid()
        )
    );

-- System can insert challenge participants (for auto-join)
CREATE POLICY "System can manage participants" ON challenge_participants
    FOR ALL USING (true);

-- Create some sample challenges for testing
INSERT INTO challenges (squad_id, title, description, challenge_type, target_value, point_reward, starts_at, ends_at)
SELECT
    s.id,
    'Weekly Grind',
    'Everyone check in 5 times this week for bonus points!',
    'individual',
    5,
    50,
    DATE_TRUNC('week', NOW()),
    DATE_TRUNC('week', NOW()) + INTERVAL '7 days'
FROM squads s
LIMIT 1;