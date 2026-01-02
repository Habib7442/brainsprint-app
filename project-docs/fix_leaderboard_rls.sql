-- FIX LEADERBOARD RLS ERROR
-- The error "new row violates row-level security policy for table leaderboard" happens
-- because the trigger runs with the user's permissions, but the user doesn't have permission 
-- to INSERT/UPDATE the leaderboard table directly (for security reasons).

-- SOLUTION: Make the Trigger Function "SECURITY DEFINER".
-- This means the function runs with the privileges of the database owner (superuser),
-- bypassing RLS checks for the leaderboard update, while still triggered by the user.

CREATE OR REPLACE FUNCTION update_leaderboard_xp()
RETURNS TRIGGER AS $$
DECLARE
    u_name text;
    u_avatar text;
BEGIN
    -- Fetch user details
    SELECT name, avatar_url INTO u_name, u_avatar FROM public.users WHERE id = NEW.user_id;

    -- Upsert into leaderboard
    INSERT INTO public.leaderboard (user_id, name, avatar_url, total_xp, updated_at)
    VALUES (
        NEW.user_id,
        COALESCE(u_name, 'Sprinter'), 
        u_avatar,
        NEW.xp_earned,
        NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_xp = leaderboard.total_xp + NEW.xp_earned,
        name = EXCLUDED.name, -- Keep name in sync
        avatar_url = EXCLUDED.avatar_url, -- Keep avatar in sync
        updated_at = NOW();
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- <--- This is the Key Fix

-- Ensure the trigger is attached (just in case)
DROP TRIGGER IF EXISTS on_session_xp_added ON public.user_sessions;
CREATE TRIGGER on_session_xp_added
AFTER INSERT ON public.user_sessions
FOR EACH ROW EXECUTE FUNCTION update_leaderboard_xp();

-- Ensure Leaderboard is readable
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read leaderboard" ON public.leaderboard;
CREATE POLICY "Public read leaderboard" ON public.leaderboard FOR SELECT USING (true);

-- Ensure User Sessions are writable (re-applying just to be safe)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
CREATE POLICY "Users can insert their own sessions" 
ON public.user_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);
