# 🧠⚡ BrainSprint - PRD

**Your Daily Brain Trainer for Competitive Exams**

---

## 🎯 Core Concept

Speed training app for competitive exam students. **No lectures, no explanations — just rapid-fire practice** with instant feedback, streaks, and social flex.

**Think:** Duolingo + Strava (for your brain) + Competitive exam skills

---

## 🎨 Brand Identity

### **Color Palette (Sexy & Unique)**

#### Light Mode:
```
Primary: Coral Orange (#FF6B58) - Energy, passion, action
Secondary: Deep Teal (#0D9488) - Focus, intelligence, trust
Accent: Amber (#F59E0B) - Success, achievement
Background: Warm White (#FAFAF9)
Text: Charcoal (#1C1917)
Success: Emerald (#10B981)
Error: Rose (#F43F5E)
```

#### Dark Mode:
```
Primary: Vibrant Coral (#FF8A7A) - Pops on dark
Secondary: Cyan Teal (#14B8A6) - Electric feel
Accent: Golden Amber (#FBB040)
Background: Rich Black (#0A0A0A)
Surface: Dark Gray (#171717)
Text: Warm White (#FAFAF9)
Success: Mint (#34D399)
Error: Pink (#FB7185)
```

### **Why These Colors?**
- **Coral Orange**: Energetic, modern, not aggressive red
- **Teal**: Smart alternative to blue, feels premium
- **Amber**: Achievement color, trophy feel
- **Avoids**: Common purple/blue, typical edu-app greens

### **Gradient Usage**
```
Hero Gradient: Coral → Amber (for CTAs, headers)
Background Gradient: Teal → Deep Teal (subtle, for cards)
Success Pulse: Emerald radial glow
Streak Fire: Amber → Coral (animated flame)
```

---

## 🏗️ Supabase Database Structure

### **users**
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  
  -- Streak & Progress
  current_streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  last_practice_date date,
  total_xp int DEFAULT 0,
  current_level int DEFAULT 1,
  
  -- Premium
  is_premium boolean DEFAULT false,
  premium_expires_at timestamptz,
  streak_freezes int DEFAULT 0,
  
  -- Preferences
  preferred_theme text DEFAULT 'light', -- 'light' or 'dark'
  notification_enabled boolean DEFAULT true
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_premium ON users(is_premium);
```

### **questions**
```sql
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Classification
  category text NOT NULL, -- 'calculation', 'reasoning', 'puzzle'
  sub_type text NOT NULL, -- 'multiplication', 'bodmas', 'blood_relation', etc.
  difficulty text NOT NULL, -- 'easy', 'medium', 'hard'
  
  -- Content
  question_text text NOT NULL,
  options jsonb, -- ["1081", "1180", "1108", "1008"] or null for direct input
  correct_answer text NOT NULL,
  
  -- Metadata
  avg_solve_time float, -- in seconds, updated from user attempts
  success_rate float, -- % of users who got it right
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_subtype ON questions(sub_type, difficulty);
CREATE INDEX idx_questions_active ON questions(is_active);
```

### **user_sessions**
```sql
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Session Info
  category text NOT NULL,
  sub_type text NOT NULL,
  session_type text DEFAULT 'practice', -- 'practice', 'test', 'ai_generated'
  
  -- Performance
  total_questions int NOT NULL,
  correct_answers int NOT NULL,
  avg_time_seconds float,
  fastest_time_seconds float,
  slowest_time_seconds float,
  
  -- Rewards
  xp_earned int NOT NULL,
  
  -- Timestamp
  completed_at timestamptz DEFAULT now(),
  duration_minutes int -- total session duration
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id, completed_at DESC);
CREATE INDEX idx_sessions_category ON user_sessions(category, sub_type);
```

### **user_stats**
```sql
CREATE TABLE user_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
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
  last_attempted timestamptz,
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, category, sub_type)
);

CREATE INDEX idx_stats_user ON user_stats(user_id);
CREATE INDEX idx_stats_performance ON user_stats(accuracy_percentage DESC, avg_time_seconds ASC);
```

### **daily_limits**
```sql
CREATE TABLE daily_limits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  questions_attempted int DEFAULT 0,
  
  UNIQUE(user_id, date)
);

CREATE INDEX idx_limits_user_date ON daily_limits(user_id, date DESC);
```

### **leaderboard** (materialized view, refresh daily)
```sql
CREATE MATERIALIZED VIEW daily_leaderboard AS
SELECT 
  u.id,
  u.name,
  u.avatar_url,
  SUM(s.xp_earned) as daily_xp,
  COUNT(s.id) as sessions_today,
  RANK() OVER (ORDER BY SUM(s.xp_earned) DESC) as rank
FROM users u
JOIN user_sessions s ON u.id = s.user_id
WHERE s.completed_at::date = CURRENT_DATE
GROUP BY u.id, u.name, u.avatar_url
ORDER BY daily_xp DESC
LIMIT 100;

CREATE INDEX idx_leaderboard_rank ON daily_leaderboard(rank);
```

### **achievements**
```sql
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL, -- 'speed_master', 'accuracy_king', 'week_warrior'
  name text NOT NULL,
  description text,
  icon text, -- emoji or icon name
  requirement jsonb, -- {"type": "streak", "value": 7}
  xp_reward int DEFAULT 0
);

CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  achievement_id uuid REFERENCES achievements(id),
  earned_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements ON user_achievements(user_id);
```

---

## 🎮 Core Features & Flows

### **1. Onboarding Flow**
```
Welcome Screen (animated brain sprint logo)
  ↓
Google Sign In
  ↓
"What exams are you preparing for?" (SSC/Banking/Railways/Other)
  ↓
"Set your daily goal" (5/10/15 min)
  ↓
Home Screen
```

### **2. Home Screen**

```
┌─────────────────────────────────────┐
│  🔥 12 Day Streak    ⭐ Level 7     │
│  ━━━━━━━━━━━━━━━━━━━━ 2,340/3,000  │
├─────────────────────────────────────┤
│                                     │
│  🎯 Today's Challenge               │
│  ┌─────────────────────────────┐   │
│  │ ⚡ Multiplication Sprint    │   │
│  │ Complete for +50 bonus XP   │   │
│  │ [Start Challenge →]         │   │
│  └─────────────────────────────┘   │
│                                     │
│  🧠 Your Training                   │
│  ┌─────┐ ┌─────┐ ┌─────┐          │
│  │  ⚡ │ │ 🧠  │ │ 🧩  │          │
│  │Calc │ │Rsng │ │Pzzl │          │
│  └─────┘ └─────┘ └─────┘          │
│                                     │
│  ⏱️ Mental Ability Test             │
│  [Take Full Test]                  │
│                                     │
│  📊 Your Progress                   │
│  This Week: 1,240 XP | 18 Sessions │
└─────────────────────────────────────┘

Bottom Nav: [🏠 Home] [📊 Stats] [🏆 Rank] [👤 You]
```

### **3. Trainer Selection**

**Calculation Trainer:**
- ➕ Addition Sprint
- ➖ Subtraction Speed  
- ✖️ Multiplication Mastery
- ➗ Division Drill
- 🎯 BODMAS Challenge
- 📐 Squares & Cubes Recall

**Reasoning Trainer:**
- 👨‍👩‍👧 Blood Relations
- 🔤 Coding-Decoding
- 📊 Series Completion
- 🧭 Direction Sense
- 📝 Syllogisms
- 🪑 Seating Arrangement

**Daily Puzzle:**
- 🔢 Number Puzzles
- 🧩 Logic Grids
- 🎲 Sudoku Variants

### **4. Practice Session Screen**

```
┌─────────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━ 5/20   ⏱️ 00:08 │
│ Multiplication Mastery              │
├─────────────────────────────────────┤
│                                     │
│                                     │
│           47 × 23 = ?               │
│                                     │
│       ┌─────────────────┐           │
│       │                 │           │
│       │   [Type here]   │           │
│       │                 │           │
│       └─────────────────┘           │
│                                     │
│       [Submit Answer]               │
│                                     │
│                                     │
│  ✅ 4 correct  ❌ 0 wrong           │
│  ⚡ Avg: 6.2s                       │
└─────────────────────────────────────┘

[Skip Question] (Free: 1/session, Premium: unlimited)
```

**Key Interactions:**
- Large input field (easy thumb typing)
- Submit button pulses when answer entered
- Correct → Green flash + haptic + smooth particle animation + 1s pause
- Wrong → Red shake + haptic + show correct answer + 2s pause
- Auto-advance to next question
- Progress bar animates smoothly

### **5. Result Screen**

```
┌─────────────────────────────────────┐
│                                     │
│          🎉 Excellent!              │
│                                     │
│      ┌───────────────────┐          │
│      │   Score: 16/20    │          │
│      │   ━━━━━━━━━━      │          │
│      │      80%          │          │
│      └───────────────────┘          │
│                                     │
│  ⚡ Avg Speed: 7.3s                 │
│  🚀 Fastest: 3.1s                   │
│  🐌 Slowest: 14.2s                  │
│                                     │
│  ⭐ +160 XP Earned                  │
│  🔥 12 Day Streak                   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🎯 New Personal Best!       │   │
│  │ Beat your accuracy by 5%    │   │
│  └─────────────────────────────┘   │
│                                     │
│  [📤 Share Score] [✅ Done]         │
└─────────────────────────────────────┘
```

**Share Card Export (PNG):**
```
┌─────────────────────────────────────┐
│  BrainSprint                  🧠⚡  │
├─────────────────────────────────────┤
│                                     │
│          80% Accuracy               │
│     Multiplication Mastery          │
│                                     │
│     🔥 12 Day Streak                │
│     ⚡ Avg 7.3s                     │
│                                     │
│   Can you beat this? 🎯            │
│   Download BrainSprint             │
└─────────────────────────────────────┘
```

### **6. Stats Screen**

```
┌─────────────────────────────────────┐
│  📊 Your Performance                │
├─────────────────────────────────────┤
│                                     │
│  This Week                          │
│  ┌─────────────────────────────┐   │
│  │ [Bar chart: Daily XP]       │   │
│  │ Mon ▓▓▓ 280 XP              │   │
│  │ Tue ▓▓▓▓ 340 XP             │   │
│  │ Wed ▓▓▓▓▓ 420 XP            │   │
│  └─────────────────────────────┘   │
│                                     │
│  🎯 Topic Mastery                   │
│  Multiplication    ▓▓▓▓▓▓▓▓░░ 85%  │
│  BODMAS           ▓▓▓▓▓▓▓░░░ 72%  │
│  Blood Relations  ▓▓▓▓▓░░░░░ 58%  │
│                                     │
│  ⚡ Speed Analysis                  │
│  Your avg: 6.8s                    │
│  Top 10%: 4.2s                     │
│  You're faster than 67% of users   │
│                                     │
│  🏆 Achievements (12/30)            │
│  [Grid of earned badges]           │
└─────────────────────────────────────┘
```

### **7. Leaderboard Screen**

```
┌─────────────────────────────────────┐
│  🏆 Today's Champions               │
├─────────────────────────────────────┤
│                                     │
│  🥇 #1  Rahul K.      2,840 XP     │
│  🥈 #2  Priya M.      2,720 XP     │
│  🥉 #3  Amit S.       2,680 XP     │
│   4  Sneha P.      2,540 XP        │
│   5  Arjun R.      2,420 XP        │
│  ...                                │
│  67  You           1,240 XP  ⬆️12   │
│  ...                                │
│                                     │
│  Tabs: [Today] [This Week] [Friends]│
└─────────────────────────────────────┘
```

---

## ⚡ Game Mechanics

### **XP System**
```javascript
const calculateXP = (correct, total, avgTime, difficulty) => {
  let baseXP = correct * 10;
  
  // Accuracy bonus
  const accuracy = (correct / total) * 100;
  if (accuracy === 100) baseXP += 50; // Perfect!
  else if (accuracy >= 90) baseXP += 30;
  else if (accuracy >= 80) baseXP += 20;
  
  // Speed bonus (if avg time < 5s)
  if (avgTime < 5) baseXP += 20;
  else if (avgTime < 7) baseXP += 10;
  
  // Difficulty multiplier
  const multiplier = {
    easy: 1,
    medium: 1.2,
    hard: 1.5
  };
  
  return Math.floor(baseXP * multiplier[difficulty]);
};
```

### **Streak Logic**
```javascript
const updateStreak = async (userId) => {
  const user = await getUser(userId);
  const today = new Date().toDateString();
  const lastPractice = user.last_practice_date?.toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  if (lastPractice === yesterday) {
    // Streak continues
    user.current_streak += 1;
  } else if (lastPractice !== today) {
    // Check for streak freeze
    if (user.streak_freezes > 0) {
      user.streak_freezes -= 1;
      // Notify: "Streak saved with freeze!"
    } else {
      // Streak broken
      user.current_streak = 1;
      // Show sad animation
    }
  }
  
  // Update longest streak
  if (user.current_streak > user.longest_streak) {
    user.longest_streak = user.current_streak;
    // Achievement unlocked!
  }
  
  user.last_practice_date = new Date();
  await updateUser(user);
};
```

### **Level System**
```javascript
const calculateLevel = (totalXP) => {
  // Level 1: 0-499 XP
  // Level 2: 500-1499 XP
  // Each level needs 500 + (level * 500) XP
  return Math.floor((Math.sqrt(1 + 8 * totalXP / 500) - 1) / 2) + 1;
};

const xpForNextLevel = (currentLevel) => {
  return (currentLevel + 1) * 500;
};
```

### **Daily Limit (Free Users)**
```javascript
const canAttemptQuestion = async (userId) => {
  const user = await getUser(userId);
  
  if (user.is_premium) return { allowed: true };
  
  const today = new Date().toISOString().split('T')[0];
  const limit = await getDailyLimit(userId, today);
  
  const FREE_LIMIT = 25;
  
  if (!limit || limit.questions_attempted < FREE_LIMIT) {
    return { allowed: true, remaining: FREE_LIMIT - (limit?.questions_attempted || 0) };
  }
  
  return { 
    allowed: false, 
    message: "Daily limit reached! Upgrade to Premium for unlimited practice." 
  };
};
```

---

## 🤖 AI Question Generation (Premium)

### **Flow:**
```
User selects: Category > Sub-type > Difficulty > Count (10/20/30)
  ↓
Show: "AI is crafting your challenge..." (animated brain icon)
  ↓
Call Gemini API
  ↓
Parse & validate response
  ↓
Start session with AI-generated questions
```

### **Gemini Prompt Template:**
```javascript
const generateQuestionsPrompt = (subType, difficulty, count) => {
  const prompts = {
    multiplication: `Generate ${count} multiplication problems for competitive exam practice.
    
Difficulty: ${difficulty}
- Easy: 2-digit × 1-digit
- Medium: 2-digit × 2-digit
- Hard: 3-digit × 2-digit

Return ONLY valid JSON array, no markdown:
[
  {
    "question": "47 × 23 = ?",
    "answer": "1081"
  }
]

Requirements:
- Answers must be mathematically correct
- No decimals
- Whole numbers only
- Verify each calculation`,

    bodmas: `Generate ${count} BODMAS problems for competitive exam practice.

Difficulty: ${difficulty}
- Easy: 3 operations, simple numbers
- Medium: 4-5 operations, brackets
- Hard: Complex nested brackets

Return ONLY valid JSON array, no markdown:
[
  {
    "question": "15 + 3 × (8 - 2) ÷ 3 = ?",
    "options": ["18", "21", "23", "25"],
    "answer": "21"
  }
]

Requirements:
- Follow BODMAS strictly
- Verify all calculations
- Provide 4 options with 1 correct answer`
  };
  
  return prompts[subType];
};
```

### **Response Validation:**
```javascript
const validateAIQuestions = (questions) => {
  return questions.filter(q => {
    // Must have question and answer
    if (!q.question || !q.answer) return false;
    
    // Answer must be non-empty string
    if (typeof q.answer !== 'string' || q.answer.trim() === '') return false;
    
    // If options provided, must have 4 options
    if (q.options && q.options.length !== 4) return false;
    
    // If options provided, answer must be in options
    if (q.options && !q.options.includes(q.answer)) return false;
    
    return true;
  });
};
```

---

## 🎁 Free vs Premium

### **Free Plan:**
- ✅ 25 questions/day (any category)
- ✅ 1 daily puzzle
- ✅ 1 mental ability test/week
- ✅ Basic stats (accuracy, avg time)
- ✅ Daily leaderboard
- ✅ 5 active streaks max (then must maintain)
- ❌ AI-generated questions
- ❌ Unlimited practice
- ❌ Advanced analytics
- ❌ Streak freeze

### **Premium Plan (₹99/month):**
- ✅ **Unlimited questions** across all categories
- ✅ **AI adaptive practice** mode
- ✅ **Unlimited mental ability tests**
- ✅ **All puzzles unlocked**
- ✅ **1 streak freeze/week** (auto-applied)
- ✅ **Advanced analytics** (graphs, trends, comparisons)
- ✅ **Skip questions** unlimited
- ✅ **Ad-free experience**
- ✅ **Priority support**
- ✅ **Early access** to new features

### **Premium Conversion Flow:**
```
User hits daily limit
  ↓
Modal: "You've completed 25 questions today! 🎉"
"Upgrade to Premium for unlimited practice"
[See Premium Benefits] [Maybe Later]
  ↓
Premium Benefits Screen (with comparison table)
  ↓
Razorpay Payment (₹99)
  ↓
Success → Confetti animation → Instant premium access
```

---

## 🏆 Achievements System

```javascript
const achievements = [
  {
    code: 'first_session',
    name: 'Getting Started',
    description: 'Complete your first practice session',
    icon: '🎯',
    xp_reward: 50
  },
  {
    code: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain 7-day streak',
    icon: '🔥',
    xp_reward: 100
  },
  {
    code: 'speed_demon',
    name: 'Speed Demon',
    description: 'Average under 5 seconds in a session',
    icon: '⚡',
    xp_reward: 75
  },
  {
    code: 'accuracy_king',
    name: 'Accuracy King',
    description: 'Get 100% accuracy in 20+ question session',
    icon: '👑',
    xp_reward: 100
  },
  {
    code: 'night_owl',
    name: 'Night Owl',
    description: 'Complete session between 11 PM - 5 AM',
    icon: '🦉',
    xp_reward: 50
  },
  {
    code: 'century',
    name: 'Century',
    description: 'Complete 100 sessions',
    icon: '💯',
    xp_reward: 200
  },
  {
    code: 'marathon',
    name: 'Marathon Runner',
    description: '30-day streak',
    icon: '🏃',
    xp_reward: 300
  }
];
```

---

## 📱 UI/UX Design Principles

### **Typography:**
```
Headlines: Outfit Bold (Modern, geometric)
Body: Inter Regular (Clean, readable)
Numbers: JetBrains Mono (Monospace for scores/times)
```

### **Spacing:**
```
Base unit: 4px
Small: 8px
Medium: 16px
Large: 24px
XLarge: 32px
```

### **Animations:**
```javascript
// Micro-interactions
const animations = {
  correctAnswer: {
    // Green radial pulse from center
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    duration: 400
  },
  
  wrongAnswer: {
    // Horizontal shake
    translateX: [0, -10, 10, -10, 10, 0],
    duration: 500
  },
  
  streakFire: {
    // Flame flicker
    scale: [1, 1.1, 0.95, 1.05, 1],
    rotate: [-2, 2, -1, 1, 0],
    loop: true,
    duration: 2000
  },
  
  xpBar: {
    // Smooth fill
    width: ['0%', 'targetWidth%'],
    easing: 'ease-out',
    duration: 1000
  },
  
  levelUp: {
    // Burst particles
    scale: [0, 1.2, 1],
    opacity: [0, 1, 1],
    duration: 600
  }
};
```

### **Haptic Feedback:**
```javascript
// iOS & Android
const haptics = {
  correctAnswer: 'notificationSuccess',
  wrongAnswer: 'notificationError',
  buttonPress: 'impactLight',
  streakContinue: 'impactMedium',
  levelUp: 'notificationSuccess',
  streakBroken: 'notificationWarning'
};
```

### **Sounds (Optional):**
```
Correct: Soft "ding" (positive)
Wrong: Gentle "thud" (not harsh)
Level Up: Triumphant chord
Streak Continue: Fire crackle
Button Tap: Subtle click
```

---

## 🚀 MVP Development Roadmap

### **Week 1: Foundation**
- [x] Initialize React Native Expo project
- [x] Setup Supabase project
- [x] Create database schema
- [x] Implement Google OAuth
- [x] Setup RLS policies
- [ ] Design color system & typography
- [ ] Create reusable UI components

### **Week 2: Core Practice Flow**
- [ ] Home screen with navigation
- [ ] Trainer selection screen
- [ ] Practice session screen
  - [ ] Question display
  - [ ] Timer logic
  - [ ] Answer input/validation
  - [ ] Instant feedback animations
- [ ] Result screen
- [ ] Basic stats tracking

### **Week 3: Gamification**
- [ ] Streak system (calculation + UI)
- [ ] XP system (earning + level calculation)
- [ ] XP bar animation
- [ ] Daily limit enforcement
- [ ] Free vs Premium gating

### **Week 4: Polish & Content**
- [ ] Question bank (500+ curated questions)
  - 50 per sub-type × 10 sub-types
- [ ] Share card generation
- [ ] Onboarding flow
- [ ] Stats screen
- [ ] Profile screen
- [ ] Dark mode implementation
- [ ] Error handling & loading states

### **Week 5: Testing & Launch Prep**
- [ ] Beta testing with 20-30 users
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] App store assets (screenshots, description)
- [ ] Privacy policy & terms
- [ ] Soft launch (friends & family)

### **Post-MVP (Month 2):**
- [ ] Leaderboard implementation
- [ ] Achievements system
- [ ] AI question generation
- [ ] Mental ability test mode
- [ ] Daily puzzles
- [ ] Razorpay integration
- [ ] Push notifications

---

## 🔐 Supabase RLS Policies

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can read own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Questions are public (read-only)
CREATE POLICY "Questions are public"
  ON questions FOR SELECT
  USING (is_active = true);

-- Users can insert own sessions
CREATE POLICY "Users can create own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read/write own stats
CREATE POLICY "Users can manage own stats"
  ON user_stats FOR ALL
  USING (auth.uid() = user_id);

-- Users can read/write own daily limits
CREATE POLICY "Users can manage own limits"
  ON daily_limits FOR ALL
  USING (auth.uid() = user_id);

-- Leaderboard is public (read-only)
CREATE POLICY "Leaderboard is public"
  ON daily_leaderboard FOR SELECT
  USING (true);
```

---

## 📊 Key Metrics to Track

### **Engagement:**
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- DAU/MAU ratio (stickiness)
- Avg sessions per user per day
- Avg session duration

### **Retention:**
- Day 1, 7, 30 retention
- Streak retention (% maintaining 7+ day streak)
- Churn rate

### **Monetization:**
- Free → Premium conversion rate
- Monthly Recurring Revenue (MRR)
- Lifetime Value (LTV)
- Churn rate (premium)

### **Product:**
- Most popular categories/sub-types
- Avg questions per session
- Avg accuracy across users
- Avg time per question
- Feature usage (AI mode, puzzles, tests)

---

## 🎯 Success Metrics (First 3Months)

**Month 1 (MVP Launch):**
- 500 registered users
- 30% Day 7 retention
- 10% active streakers (3+ days)

**Month 2:**
- 2,000 registered users
- 40% Day 7 retention
- 50 premium users (2.5% conversion)
- ₹5,000 MRR

**Month 3:**
- 5,000 registered users
- 45% Day 7 retention
- 150 premium users (3% conversion)
- ₹15,000 MRR

---

## 🔒 Data Privacy & Security

- Store minimal personal data (email, name only)
- No tracking of question content viewed
- Anonymous leaderboard (optional display name)
- GDPR-compliant data export
- Account deletion = cascade delete all data
- Supabase RLS ensures data isolation
- HTTPS only (enforced by Supabase)

---

## 📞 Support & Feedback

**In-app:**
- "Report Issue" button (→ support email)
- "Suggest Feature" form (→ Supabase table)
- FAQ section (common questions)

**Email:**
- support@brainsprint.app

**Social:**
- Instagram: @brainsprint.app
- Twitter: @brainsprint

---

## ✅ Pre-Launch Checklist

- [ ] All core features tested on iOS & Android
- [ ] 500+ questions added & verified
- [ ] Google OAuth working
- [ ] Streak logic tested (edge cases)
- [ ] XP calculation verified
- [ ] Free/Premium gating working
- [ ] App icons (all sizes)
- [ ] Splash screen
- [ ] App store screenshots (6-8 per platform)
- [ ] App description optimized (ASO)
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support email setup
- [ ] Beta testing completed (20+ users, 7+ days)
- [ ] Crash reporting setup (Sentry/Bugsnag)
- [ ] Analytics setup (Mixpanel/Amplitude)

---

## 🎨 Design Assets Needed

**App Icon:**
- Brain + lightning bolt combo
- Coral/Teal gradient background
- Sizes: 1024x1024 (master), various iOS/Android sizes

**Splash Screen:**
- BrainSprint logo
- Coral→Amber gradient background
- Loading animation (brain pulse)

**Onboarding Illustrations:**
- Daily practice habit
- Streak building
- Leaderboard competition
- (3 simple, modern illustrations)

**Achievement Badges:**
- Fire (streak)
- Lightning (speed)
- Crown (accuracy)
- Trophy (champion)
- (Emoji-based, simple)

---

## 🚦 Launch Strategy

### **Soft Launch (Week 1):**
- Friends, family, and close network
- WhatsApp groups (competitive exam students)
- Collect feedback, fix critical bugs

### **Public Launch (Week 2-3):**
- Product Hunt launch
- Reddit (r/Indian_Academia, r/UPSC, r/SSCExams)
- LinkedIn post (with demo video)
- Instagram/Facebook ads (₹5,000 budget)
- Reach out to exam prep YouTubers (free premium for review)

### **Growth (Month 2+):**
- Referral program (invite 3 friends → 1 week premium free)
- App Store Optimization (ASO)
- Content marketing (blog: "10 mental math tricks")
- YouTube Shorts (quick problem-solving demos)
- College campus ambassadors

---

## 💰 Monetization Beyond Subscriptions (Future)

- Sponsored challenges (brands sponsor daily challenges)
- B2B licensing (coaching institutes use for students)
- Affiliate revenue (recommend calculators, books)
- Premium question packs (topic-specific, one-time purchase)

---

**END OF PRD** ✅

---

## Next Steps:

1. **Setup Supabase project** → Create tables
2. **Initialize React Native Expo** → Install dependencies
3. **Implement Google Auth** → Test login flow
4. **Build first screen** → Home with dummy data
5. **Create practice session** → Core game loop

**Ready to build? Let's sprint! 🚀**