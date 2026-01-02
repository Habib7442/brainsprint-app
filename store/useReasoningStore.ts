import { Alert } from 'react-native';
import { create } from 'zustand';
import { ReasoningQuestion, generateReasoningQuestions } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface ReasoningState {
  topic: string;
  questions: ReasoningQuestion[];
  currentIndex: number;
  answers: Record<string, string>; // questionId -> selectedOption
  timeLeft: number; // in seconds
  status: 'idle' | 'generating' | 'playing' | 'saving' | 'completed';
  isSubmitting: boolean;
  score: number;
  
  startGame: (topic?: string) => Promise<void>;
  generate: () => Promise<void>;
  answerQuestion: (questionId: string, answer: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  tick: () => void;
  finishGame: () => Promise<void>;
  reset: () => void;
  setIndex: (index: number) => void;
}

const GAME_DURATION = 10 * 60; // 10 minutes

export const useReasoningStore = create<ReasoningState>((set, get) => ({
  topic: 'Coding-Decoding',
  questions: [],
  currentIndex: 0,
  answers: {},
  timeLeft: GAME_DURATION,
  status: 'idle',
  isSubmitting: false,
  score: 0,

  startGame: async (topic = 'Coding-Decoding') => {
    set({ topic, status: 'generating', questions: [], answers: {}, currentIndex: 0, timeLeft: GAME_DURATION });
    await get().generate();
  },

  generate: async () => {
    try {
      const { topic } = get();
      const questions = await generateReasoningQuestions(topic, 20);
      set({ questions, status: 'playing' });
    } catch (error) {
      console.error('Failed to generate questions:', error);
      set({ status: 'idle' });
      // In a real app, handle error UI
    }
  },

  answerQuestion: (questionId, answer) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer }
    }));
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  prevQuestion: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },
  
  setIndex: (index: number) => {
      set({ currentIndex: index });
  },

  tick: () => {
    const { timeLeft, status, finishGame } = get();
    if (status !== 'playing') return;
    
    if (timeLeft > 0) {
      set({ timeLeft: timeLeft - 1 });
    } else {
      finishGame();
    }
  },

  finishGame: async () => {
    const { questions, answers, topic } = get();
    const user = useAuthStore.getState().user;
    
    // Calculate score
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    // Set saving status first
    set({ status: 'saving', score: correctCount, isSubmitting: true });

    if (user) {
      try {
        console.log('Attempting to save session...', { 
            userId: user.id, 
            topic: topic, 
            questionCount: questions.length 
        });

        const { data, error } = await supabase.from('user_sessions').insert({
          user_id: user.id,
          category: 'reasoning',
          sub_type: topic,
          session_type: 'ai_generated',
          total_questions: questions.length,
          correct_answers: correctCount,
          xp_earned: correctCount * 10,
          duration_minutes: Math.ceil((GAME_DURATION - get().timeLeft) / 60),
           metadata: { 
             questions: questions,
             user_answers: answers
           }
        }).select();

        if (error) {
            console.error('Supabase Insert Error:', JSON.stringify(error, null, 2));
            throw error;
        }

        console.log('Session saved successfully:', data);

      } catch (err: any) {
        console.error('FULL SAVE ERROR:', JSON.stringify(err, null, 2));
        Alert.alert('Save Error', err.message || JSON.stringify(err));
      } finally {
        set({ status: 'completed', isSubmitting: false });
      }
    } else {
        // If no user, just finish
        console.warn('No user found, session not saved.');
        set({ status: 'completed', isSubmitting: false });
    }
  },

  reset: () => {
    set({
      topic: 'Coding-Decoding',
      questions: [],
      currentIndex: 0,
      answers: {},
      timeLeft: GAME_DURATION,
      status: 'idle',
      isSubmitting: false,
      score: 0
    });
  }
}));
