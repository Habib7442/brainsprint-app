-- Drop the existing view/materialized view if it exists, so we can replace it with a real table
DROP VIEW IF EXISTS public.leaderboard;
DROP MATERIALIZED VIEW IF EXISTS public.leaderboard;
DROP TABLE IF EXISTS public.leaderboard;

-- Create the leaderboard table (Standard Table for Real-time Updates)
CREATE TABLE public.leaderboard (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    avatar_url text, -- Store URL to avoid heavy join if possible, or join on fetch
    total_xp int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read
CREATE POLICY "Public read leaderboard" ON public.leaderboard FOR SELECT USING (true);


-- Trigger Function to Update Leaderboard
CREATE OR REPLACE FUNCTION update_leaderboard_xp()
RETURNS TRIGGER AS $$
DECLARE
    u_name text;
    u_avatar text;
BEGIN
    -- Fetch user details (name/avatar) if not already in trigger payload
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
        name = EXCLUDED.name, -- Update name in case user changed it
        avatar_url = EXCLUDED.avatar_url, -- Update avatar
        updated_at = NOW();
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add Trigger to user_sessions
DROP TRIGGER IF EXISTS on_session_xp_added ON public.user_sessions;
CREATE TRIGGER on_session_xp_added
AFTER INSERT ON public.user_sessions
FOR EACH ROW EXECUTE FUNCTION update_leaderboard_xp();
