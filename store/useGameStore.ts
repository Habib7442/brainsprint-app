import { create } from 'zustand';
import { fetchMathsQuestions, generateCalculationQuestion, Question } from '../lib/games/calculation';
import { generatePuzzleQuestion } from '../lib/games/puzzle';
import { generateReasoningQuestion } from '../lib/games/reasoning';
import { supabase } from '../lib/supabase';

interface GameState {
  isPlaying: boolean;
  score: number;
  lives: number;
  timeLeft: number;
  currentQuestion: Question | null;
  difficulty: number;
  combo: number;
  mode: string; 
  
  // Stats for Result
  questionsAnswered: number;
  correctAnswers: number;
  startTime: number;

  // Ghost State
  ghostScore: number;
  ghostSpeed: number; // Points per second
  ghostName: string | null;
  ghostAvatar: string | null;

  startGame: (mode: string) => void;
  submitAnswer: (answer: number | string) => boolean;
  tick: () => void;
  endGame: () => void;
  reset: () => void;
}

const generateQuestion = (mode: string, difficulty: number): Question => {
  switch (mode) {
    case 'reasoning': return generateReasoningQuestion(difficulty);
    case 'puzzle': return generatePuzzleQuestion(difficulty);
    case 'calculation': default: return generateCalculationQuestion(difficulty);
  }
};

export const useGameStore = create<GameState>((set, get) => ({
  isPlaying: false,
  score: 0,
  lives: 3,
  timeLeft: 60,
  currentQuestion: null,
  difficulty: 1,
  combo: 0,
  mode: 'calculation',
  questionsAnswered: 0,
  correctAnswers: 0,
  startTime: 0,
  
  ghostScore: 0,
  ghostSpeed: 0,
  ghostName: null,
  ghostAvatar: null,

  startGame: async (mode) => {
    if (mode === 'calculation') {
        fetchMathsQuestions().catch(console.error);
    }

    // Reset State & Fetch Ghost
    set({ 
      isPlaying: true, 
      score: 0, 
      lives: 3, 
      timeLeft: 30, 
      difficulty: 1,
      combo: 0,
      mode,
      currentQuestion: generateQuestion(mode, 1),
      questionsAnswered: 0,
      correctAnswers: 0,
      startTime: Date.now(),
      ghostScore: 0,
      ghostSpeed: 5, // Default bot speed if fetch fails
      ghostName: 'Bot 🤖',
      ghostAvatar: null
    });

    try {
      // Fetch TOP 50 best scoring matches to race against (Challenge Mode)
      // or sort by created_at for 'recent' ghosts
      const { data, error } = await supabase
        .from('matches')
        .select('score, total_time, users(name, avatar_url)')
        .eq('game_mode', mode)
        .gt('score', 0)
        .gt('total_time', 0)
        .order('score', { ascending: false }) 
        .limit(50);

      if (data && data.length > 0) {
        // Pick a random ghost from the top 50 to keep it varied but competitive
        const randomMatch = data[Math.floor(Math.random() * data.length)];
        
        // Calculate speed (Points per second)
        const speed = randomMatch.score / (randomMatch.total_time || 1);
        const name = (randomMatch.users as any)?.name || 'Ghost';
        const avatar = (randomMatch.users as any)?.avatar_url;

        set({
           ghostSpeed: speed,
           ghostName: name,
           ghostAvatar: avatar
        });
      }
    } catch (err) {
      console.log('Ghost fetch error, using bot fallback', err);
    }
  },

  submitAnswer: (answer) => {
    const state = get();
    if (!state.currentQuestion) return false;

    const isCorrect = String(answer) === String(state.currentQuestion.answer);

    const commonUpdates = {
       questionsAnswered: state.questionsAnswered + 1,
    };

    if (isCorrect) {
      const newCombo = state.combo + 1;
      const multiplier = 1 + (Math.floor(newCombo / 5) * 0.5);
      const points = Math.round(10 * multiplier);
      const newScore = state.score + points;
      const newDiff = Math.min(Math.floor(newScore / 50) + 1, 10); 
      
      set({
        ...commonUpdates,
        score: newScore,
        combo: newCombo,
        difficulty: newDiff,
        currentQuestion: generateQuestion(state.mode, newDiff),
        timeLeft: 30, 
        correctAnswers: state.correctAnswers + 1
      });
      return true;
    } else {
      const newLives = state.lives - 1;
      if (newLives <= 0) {
        set({ ...commonUpdates, lives: 0, isPlaying: false });
      } else {
        set({ 
          ...commonUpdates,
          lives: newLives,
          combo: 0,
          currentQuestion: generateQuestion(state.mode, state.difficulty),
          timeLeft: 30 
        });
      }
      return false;
    }
  },

  tick: () => {
    const state = get();
    if (!state.isPlaying) return;

    // Update Ghost Score
    const newGhostScore = state.ghostScore + state.ghostSpeed;

    if (state.timeLeft <= 0) {
      // Timeout = Wrong Answer
      const newLives = state.lives - 1;
      const commonUpdates = {
        questionsAnswered: state.questionsAnswered + 1,
      };

      if (newLives <= 0) {
         set({ ...commonUpdates, lives: 0, isPlaying: false, ghostScore: newGhostScore });
      } else {
         set({
            ...commonUpdates,
            lives: newLives,
            combo: 0,
            currentQuestion: generateQuestion(state.mode, state.difficulty),
            timeLeft: 30,
            ghostScore: newGhostScore
         });
      }
    } else {
      set({ timeLeft: state.timeLeft - 1, ghostScore: newGhostScore });
    }
  },

  endGame: () => {
    set({ isPlaying: false });
  },

  reset: () => {
    set({ 
      isPlaying: false, 
      score: 0, 
      lives: 3, 
      timeLeft: 60, 
      combo: 0,
      currentQuestion: null,
      mode: 'calculation',
      questionsAnswered: 0,
      correctAnswers: 0,
      startTime: 0,
      ghostScore: 0,
      ghostSpeed: 0,
      ghostName: null,
      ghostAvatar: null
    });
  }
}));
