-- BrainSprint XP Logic: Level Up System

-- ============================================
-- 1. XP & LEVELING RPC FUNCTION
-- ============================================
-- This function is called from the app when a game ends.
-- It atomically updates:
--   - total_xp (increments by amount)
--   - current_level (re-calculated based on new XP) (Optional logic)
--   - last_active_at (updates timestamp)

CREATE OR REPLACE FUNCTION increment_xp(amount int, user_uuid uuid)
RETURNS void AS $$
DECLARE
  current_xp int;
  new_xp int;
  current_lvl int;
  new_lvl int;
BEGIN
  -- 1. Get current XP
  SELECT total_xp INTO current_xp FROM users WHERE id = user_uuid;
  
  -- Handle initial null case
  IF current_xp IS NULL THEN
    current_xp := 0;
  END IF;

  -- 2. Calculate new XP
  new_xp := current_xp + amount;

  -- 3. Level Logic: Simple formula -> Level = sqrt(XP) * 0.1 (or similar)
  -- Or explicit steps: Level 1 (0-1000), Level 2 (1001-2500)...
  -- Let's use a standard RPG formula: XP needed for level L = 100 * (L)^2
  -- Therefore L = sqrt(XP / 100)
  -- We start at Level 1.
  
  if new_xp < 100 THEN
    new_lvl := 1;
  ELSE
    new_lvl := floor(sqrt(new_xp / 100));
    IF new_lvl < 1 THEN new_lvl := 1; END IF;
  END IF;

  -- 4. Update User Row
  UPDATE users 
  SET 
    total_xp = new_xp,
    current_level = new_lvl,
    last_active_at = now()
  WHERE id = user_uuid;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
