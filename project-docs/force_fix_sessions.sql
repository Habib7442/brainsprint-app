-- FORCE FIX for User Sessions Table & Policies

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    category text NOT NULL,
    sub_type text NOT NULL,
    session_type text DEFAULT 'practice',
    total_questions int NOT NULL,
    correct_answers int NOT NULL,
    avg_time_seconds float,
    fastest_time_seconds float,
    slowest_time_seconds float,
    xp_earned int NOT NULL,
    metadata JSONB, 
    completed_at timestamptz DEFAULT now(),
    duration_minutes int
);

-- 2. RESET RLS (Disable and Re-enable to be sure)
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 3. DROP ALL EXISTING POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_sessions;
DROP POLICY IF EXISTS "Enable read access for own sessions" ON public.user_sessions;

-- 4. CREATE ROBUST POLICIES
-- Allow Select
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions FOR SELECT 
USING (auth.uid() = user_id);

-- Allow Insert (CRITICAL FOR SAVING)
CREATE POLICY "Users can insert their own sessions" 
ON public.user_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. GRANT PERMISSIONS (Just to be triple sure)
GRANT ALL ON public.user_sessions TO postgres;
GRANT ALL ON public.user_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO anon; -- Allow anon for testing if needed, though we check auth.uid()

-- 6. Ensure leaderboard trigger exists (Re-run for safety)
CREATE OR REPLACE FUNCTION update_leaderboard_xp()
RETURNS TRIGGER AS $$
DECLARE
    u_name text;
    u_avatar text;
BEGIN
    SELECT name, avatar_url INTO u_name, u_avatar FROM public.users WHERE id = NEW.user_id;
    INSERT INTO public.leaderboard (user_id, name, avatar_url, total_xp, updated_at)
    VALUES (NEW.user_id, COALESCE(u_name, 'Sprinter'), u_avatar, NEW.xp_earned, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET total_xp = leaderboard.total_xp + NEW.xp_earned, updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_session_xp_added ON public.user_sessions;
CREATE TRIGGER on_session_xp_added
AFTER INSERT ON public.user_sessions
FOR EACH ROW EXECUTE FUNCTION update_leaderboard_xp();
