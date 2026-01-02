-- Enable RLS on user_stats table (Tables support RLS)
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own stats
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
CREATE POLICY "Users can view their own stats" 
ON public.user_stats FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own stats
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
CREATE POLICY "Users can insert their own stats" 
ON public.user_stats FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own stats
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
CREATE POLICY "Users can update their own stats" 
ON public.user_stats FOR UPDATE 
USING (auth.uid() = user_id);


-- FIX FOR LEADERBOARD (View/Materialized View)
-- RLS cannot be enabled on Views. Instead, we grant SELECT permission.
-- If 'leaderboard' is your view name:

GRANT SELECT ON public.leaderboard TO anon, authenticated;

-- Note: If you are using 'daily_leaderboard' as per the original PRD, run this instead:
-- GRANT SELECT ON public.daily_leaderboard TO anon, authenticated;
