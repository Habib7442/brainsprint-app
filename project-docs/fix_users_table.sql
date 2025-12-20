-- Fix for missing 'last_active_at' column in users table

-- Add 'last_active_at' column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Ensure 'current_streak' also exists just in case
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak int DEFAULT 0;

-- Ensure 'total_xp' also exists just in case
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_xp int DEFAULT 0;

-- Ensure 'current_level' also exists just in case
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_level int DEFAULT 1;

-- Ensure 'is_premium' exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Re-run the trigger function just to be sure it's compiled with the new column context if necessary
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
  IF date_trunc('day', now()) = date_trunc('day', last_active) + interval '1 day' THEN
    UPDATE users 
    SET current_streak = current_streak + 1, last_active_at = now() 
    WHERE id = NEW.user_id;
  
  -- If last activity was today (just update timestamp)
  ELSIF date_trunc('day', now()) = date_trunc('day', last_active) THEN
    UPDATE users 
    SET last_active_at = now() 
    WHERE id = NEW.user_id;

  -- If streak broken
  ELSIF date_trunc('day', now()) > date_trunc('day', last_active) + interval '1 day' THEN
    UPDATE users 
    SET current_streak = 1, last_active_at = now() 
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
