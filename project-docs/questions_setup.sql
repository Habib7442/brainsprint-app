-- BrainSprint Question Tables with RLS Policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MATHS QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS maths_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text text NOT NULL,
  correct_answer text NOT NULL,
  options jsonb DEFAULT NULL, -- NULL for direct input, array for MCQ
  sub_type text, -- 'multiplication', 'bodmas', 'percentage', 'squares', 'division', etc.
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_maths_subtype_difficulty ON maths_questions(sub_type, difficulty);
CREATE INDEX IF NOT EXISTS idx_maths_created_at ON maths_questions(created_at DESC);

-- ============================================
-- REASONING QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reasoning_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text text NOT NULL,
  correct_answer text NOT NULL,
  options jsonb NOT NULL, -- Reasoning usually needs options
  sub_type text, -- 'blood_relation', 'coding_decoding', 'series', 'direction_sense', etc.
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  image_url text DEFAULT NULL, -- Future-proofing for visual reasoning
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_reasoning_subtype_difficulty ON reasoning_questions(sub_type, difficulty);
CREATE INDEX IF NOT EXISTS idx_reasoning_created_at ON reasoning_questions(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on both tables
ALTER TABLE maths_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasoning_questions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MATHS QUESTIONS RLS POLICIES
-- ============================================

-- Policy: Anyone can read maths questions (for the React Native app)
CREATE POLICY "Allow public read access to maths questions"
ON maths_questions
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only authenticated users can insert maths questions (admin panel)
CREATE POLICY "Allow authenticated users to insert maths questions"
ON maths_questions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only authenticated users can update maths questions
CREATE POLICY "Allow authenticated users to update maths questions"
ON maths_questions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Only authenticated users can delete maths questions
CREATE POLICY "Allow authenticated users to delete maths questions"
ON maths_questions
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- REASONING QUESTIONS RLS POLICIES
-- ============================================

-- Policy: Anyone can read reasoning questions (for the React Native app)
CREATE POLICY "Allow public read access to reasoning questions"
ON reasoning_questions
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only authenticated users can insert reasoning questions (admin panel)
CREATE POLICY "Allow authenticated users to insert reasoning questions"
ON reasoning_questions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only authenticated users can update reasoning questions
CREATE POLICY "Allow authenticated users to update reasoning questions"
ON reasoning_questions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Only authenticated users can delete reasoning questions
CREATE POLICY "Allow authenticated users to delete reasoning questions"
ON reasoning_questions
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for maths_questions
CREATE TRIGGER update_maths_questions_updated_at 
BEFORE UPDATE ON maths_questions 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for reasoning_questions
CREATE TRIGGER update_reasoning_questions_updated_at 
BEFORE UPDATE ON reasoning_questions 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Sample Maths Questions
INSERT INTO maths_questions (question_text, correct_answer, options, sub_type, difficulty) VALUES
('56 × 4', '224', NULL, 'multiplication', 'easy'),
('√625 + √144', '37', NULL, 'squares', 'medium'),
('45% of 1200', '540', NULL, 'percentage', 'hard'),
('25 + 5 × (10 ÷ 2)', '50', '["40", "50", "150", "35"]'::jsonb, 'bodmas', 'easy');

-- Sample Reasoning Questions
INSERT INTO reasoning_questions (question_text, correct_answer, options, sub_type, difficulty) VALUES
('If RAIN is 181914, then SUN is?', '192114', '["192114", "182114", "192014", "192115"]'::jsonb, 'coding_decoding', 'medium'),
('Looking at a man, X says: "He is the son of my wife''s only brother." How is the man related to X?', 'Nephew', '["Son", "Nephew", "Uncle", "Brother-in-law"]'::jsonb, 'blood_relation', 'hard'),
('Complete the series: 5, 11, 23, 47, ?', '95', '["94", "95", "96", "99"]'::jsonb, 'series', 'medium');
