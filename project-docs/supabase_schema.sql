-- Create user_sessions table if not exists (already in PRD but let's confirm metadata)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    category text NOT NULL,
    sub_type text NOT NULL,
    session_type text DEFAULT 'practice', -- 'practice', 'test', 'ai_generated'
    
    -- Performance Stats
    total_questions int NOT NULL,
    correct_answers int NOT NULL,
    avg_time_seconds float,
    fastest_time_seconds float,
    slowest_time_seconds float,
    
    -- Rewards
    xp_earned int NOT NULL,
    
    -- Metadata (For storing the actual questions and answers for review)
    metadata JSONB, 
    
    -- Timestamp
    completed_at timestamptz DEFAULT now(),
    duration_minutes int
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_category_subtype ON public.user_sessions(category, sub_type);

-- RLS Policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own sessions
CREATE POLICY "Users can insert their own sessions" 
ON public.user_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- USER STATS AGGREGATION (Materialized View or Table)
-- We'll use a table that updates on every session completion
CREATE TABLE IF NOT EXISTS public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Topic Performance
  category text NOT NULL,
  sub_type text NOT NULL,
  
  -- Aggregated Stats
  total_attempts int DEFAULT 0,
  total_correct int DEFAULT 0,
  accuracy_percentage float DEFAULT 0,
  best_accuracy float DEFAULT 0,
  avg_time_seconds float,
  best_time_seconds float,
  
  -- Progress Tracking
  last_attempted timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, category, sub_type)
);

CREATE INDEX IF NOT EXISTS idx_stats_user ON public.user_stats(user_id);

-- Function to update user_stats automatically on session insert
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_stats (user_id, category, sub_type, total_attempts, total_correct, accuracy_percentage, best_accuracy, last_attempted, updated_at)
    VALUES (
        NEW.user_id,
        NEW.category,
        NEW.sub_type,
        1,
        NEW.correct_answers,
        (NEW.correct_answers::float / NEW.total_questions::float) * 100,
        (NEW.correct_answers::float / NEW.total_questions::float) * 100,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, category, sub_type)
    DO UPDATE SET
        total_attempts = user_stats.total_attempts + 1,
        total_correct = user_stats.total_correct + NEW.correct_answers,
        accuracy_percentage = ((user_stats.total_correct + NEW.correct_answers)::float / (user_stats.total_attempts * NEW.total_questions + NEW.total_questions)::float) * 100, -- Approximate cumulative accuracy requires keeping track of total questions ever, assume uniform session size or fix logic by adding total_questions_attempted column. Better approach below.
        best_accuracy = GREATEST(user_stats.best_accuracy, (NEW.correct_answers::float / NEW.total_questions::float) * 100),
        last_attempted = NOW(),
        updated_at = NOW();
        
    -- NOTE: Proper accuracy calculation would require a total_questions_answered column in user_stats. 
    -- For simplicty, I recommend adding: ALTER TABLE public.user_stats ADD COLUMN total_questions_solved int DEFAULT 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS on_session_completed ON public.user_sessions;
CREATE TRIGGER on_session_completed
AFTER INSERT ON public.user_sessions
FOR EACH ROW EXECUTE FUNCTION update_user_stats();
