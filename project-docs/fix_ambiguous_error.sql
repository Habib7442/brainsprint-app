-- Fix ambiguous column reference in update_user_streak trigger
-- Using explicitly distinct variable names to avoid conflict with column names

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_active timestamptz;   -- 'v_' prefix for variables
  v_current_streak int;
BEGIN
  -- Select INTO variables, explicitly selecting FROM users table
  SELECT users.last_active_at, users.current_streak 
  INTO v_last_active, v_current_streak
  FROM users
  WHERE users.id = NEW.user_id;

  -- If no previous activity, init stats
  IF v_last_active IS NULL THEN
    UPDATE users 
    SET current_streak = 1, last_active_at = now() 
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- Logic: Check Dates
  IF date_trunc('day', now()) = date_trunc('day', v_last_active) + interval '1 day' THEN
    -- Streak continues (Yesterday -> Today)
    UPDATE users 
    SET current_streak = COALESCE(v_current_streak, 0) + 1, last_active_at = now() 
    WHERE id = NEW.user_id;
  
  ELSIF date_trunc('day', now()) = date_trunc('day', v_last_active) THEN
    -- Same day activity, just update time
    UPDATE users 
    SET last_active_at = now() 
    WHERE id = NEW.user_id;

  ELSIF date_trunc('day', now()) > date_trunc('day', v_last_active) + interval '1 day' THEN
    -- Streak Broken (Gap > 1 day)
    UPDATE users 
    SET current_streak = 1, last_active_at = now() 
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
