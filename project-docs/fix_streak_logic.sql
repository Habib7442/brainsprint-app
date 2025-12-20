-- Fix for "Streak 0 despite playing today"
-- Ensure that if a user plays (trigger runs), streak is ALWAYS at least 1, even if they already played today.

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_active timestamptz;
  v_current_streak int;
BEGIN
  -- Get user's last activity info
  SELECT users.last_active_at, users.current_streak 
  INTO v_last_active, v_current_streak
  FROM users
  WHERE users.id = NEW.user_id;

  -- 1. No previous activity: Init to 1
  IF v_last_active IS NULL THEN
    UPDATE users 
    SET current_streak = 1, last_active_at = now() 
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- 2. Played Yesterday: Increment Streak
  IF date_trunc('day', now()) = date_trunc('day', v_last_active) + interval '1 day' THEN
    UPDATE users 
    SET current_streak = COALESCE(v_current_streak, 0) + 1, last_active_at = now() 
    WHERE id = NEW.user_id;
  
  -- 3. Played Today: Maintain Streak (But fix 0 if it happened)
  ELSIF date_trunc('day', now()) = date_trunc('day', v_last_active) THEN
    UPDATE users 
    SET 
       last_active_at = now(),
       -- If somehow streak is 0 but we are playing today, set it to 1
       current_streak = CASE WHEN COALESCE(v_current_streak, 0) = 0 THEN 1 ELSE v_current_streak END
    WHERE id = NEW.user_id;

  -- 4. Played Long Ago (Gap > 1 Day): Reset to 1
  ELSIF date_trunc('day', now()) > date_trunc('day', v_last_active) + interval '1 day' THEN
    UPDATE users 
    SET current_streak = 1, last_active_at = now() 
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
