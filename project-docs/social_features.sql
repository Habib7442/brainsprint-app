-- BrainSprint Social Features: Matches, Leaderboards, Ghosts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MATCH HISTORY TABLE (For "Ghost" Replays & Stats)
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  game_mode text NOT NULL, -- 'calculation', 'reasoning', 'puzzle'
  score int NOT NULL,
  total_time int NOT NULL, -- Total time taken in seconds (e.g. for speed runs)
  avg_time_per_question float, -- Important for "Ghost" speed interpolation
  accuracy float, -- Percentage (0-100)
  questions_answered int,
  created_at timestamptz DEFAULT now()
);

-- Index for leaderboard queries and finding recent attempts
CREATE INDEX IF NOT EXISTS idx_matches_user_mode ON matches(user_id, game_mode);
CREATE INDEX IF NOT EXISTS idx_matches_score_mode ON matches(game_mode, score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

-- ============================================
-- 2. DAILY STREAK TRACKING
-- ============================================
-- We can add a trigger on the `matches` table to update the user's streak.
-- Logic: If the user plays a game today and hasn't already marked streak for today, update streak.

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  last_active timestamptz;
  current_streak int;
BEGIN
  -- Get user's last activity info
  SELECT last_active_at, current_streak INTO last_active, current_streak
  FROM users
  WHERE id = NEW.user_id;

  -- If no previous activity, set streak to 1
  IF last_active IS NULL THEN
    UPDATE users 
    SET current_streak = 1, last_active_at = now() 
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- Check if last activity was yesterday (continue streak)
  -- We check if the difference in days is exactly 1 day (ignoring time)
  IF date_trunc('day', now()) = date_trunc('day', last_active) + interval '1 day' THEN
    UPDATE users 
    SET current_streak = current_streak + 1, last_active_at = now() 
    WHERE id = NEW.user_id;
  
  -- If last activity was today (do nothing about streak, just update timestamp)
  ELSIF date_trunc('day', now()) = date_trunc('day', last_active) THEN
    UPDATE users 
    SET last_active_at = now() 
    WHERE id = NEW.user_id;

  -- If last activity was older than yesterday (reset streak)
  ELSIF date_trunc('day', now()) > date_trunc('day', last_active) + interval '1 day' THEN
    UPDATE users 
    SET current_streak = 1, last_active_at = now() 
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after every match insertion
CREATE TRIGGER trigger_update_streak
AFTER INSERT ON matches
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow users to read ANY match (needed for Leaderboards & Ghosts)
CREATE POLICY "Allow public read access to matches"
ON matches
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert THEIR OWN match results
CREATE POLICY "Allow users to insert their own matches"
ON matches
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. LEADERBOARD VIEW (Optional, for easy querying)
-- ============================================
-- Simple leaderboard: Highest score per user per mode
CREATE OR REPLACE VIEW leaderboard AS
SELECT DISTINCT ON (user_id, game_mode)
  m.user_id,
  u.name,
  u.avatar_url,
  m.game_mode,
  m.score,
  m.created_at
FROM matches m
JOIN users u ON m.user_id = u.id
ORDER BY user_id, game_mode, score DESC;

-- Enable read access to view (views inherit permissions of underlying tables in Supabase usually, but good to note)
