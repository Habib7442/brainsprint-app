import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Share, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useGameStore } from '../../store/useGameStore';

export default function ResultsScreen() {
  const { score, mode } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();
  const { startGame, questionsAnswered, correctAnswers, startTime } = useGameStore(); // Get stats
  
  const [isSaving, setIsSaving] = useState(true); // Internal loading state

  const finalScore = parseInt(score as string, 10) || 0;
  const xpEarned = Math.floor(finalScore / 10); // 10% of score is XP

  useEffect(() => {
    saveResults();
  }, []);

  const saveResults = async () => {
    if (!user) {
        setIsSaving(false);
        return;
    }

    // Calculate details
    const totalTimeSeconds = Math.floor((Date.now() - startTime) / 1000); 
    const accuracy = questionsAnswered > 0 
       ? Math.round((correctAnswers / questionsAnswered) * 100) 
       : 0;
    const avgTime = questionsAnswered > 0 
       ? parseFloat((totalTimeSeconds / questionsAnswered).toFixed(2)) 
       : 0;

    try {
      // 1. Update User Stats (XP) - Keeping this for Profile Sync if needed, 
      // though Leaderboard now tracks XP from sessions independently.
      await supabase.rpc('increment_xp', { 
        amount: xpEarned, 
        user_uuid: user.id 
      });

      // 2. Insert Session Record (Triggers Leaderboard & Stats updates)
      const category = mode === 'reasoning' ? 'reasoning' : 'quantitative'; // logical vs quantitative
      const subType = typeof mode === 'string' ? mode : 'practice';

      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          category: category,
          sub_type: subType, // e.g. 'calculation', 'puzzle'
          session_type: 'practice',
          correct_answers: correctAnswers,
          total_questions: questionsAnswered,
          xp_earned: xpEarned,
          duration_minutes: Math.ceil(totalTimeSeconds / 60) || 1,
          metadata: {
             accuracy: accuracy,
             avg_time: avgTime
          }
        });

      if (sessionError) console.error('Session insert error:', sessionError);
      
      await refreshProfile();
      
    } catch (e) {
      console.error('Error saving results:', e);
    } finally {
        setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      // Generate Emoji Grid based on score (mock visuals)
      const blocks = finalScore > 100 ? '🟩🟩🟩🟩🟩' : finalScore > 50 ? '🟩🟩🟩🟧🟧' : '🟧🟧🟥🟥🟥';
      
      const message = `🧠 BrainSprint Result \n\n` + 
        `⚡ Mode: ${(mode as string).toUpperCase()}\n` +
        `🏆 Score: ${finalScore}\n` +
        `🔥 Streak: ${profile?.current_streak || 1} Days\n` +
        `${blocks}\n\n` +
        `Can you beat my score? Download BrainSprint now!`;

      await Share.share({
        message,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handlePlayAgain = () => {
    // Reset state BEFORE navigating to prevent immediate game over trigger in GameScreen
    startGame(mode as string);
    
    router.replace({
        pathname: '/game/[id]',
        params: { id: Array.isArray(mode) ? mode[0] : mode || 'calculation' }
    });
  };

  const handleHome = () => {
    router.dismissAll();
    router.replace('/(tabs)');
  };

  if (isSaving) {
      return (
        <View className="flex-1 bg-gray-900 justify-center items-center">
            <ActivityIndicator size="large" color="#FF6B58" />
            <Text className="text-white mt-4 font-rubik">Saving your victory...</Text>
        </View>
      );
  }

  return (
    <View className="flex-1 bg-gray-900 justify-center items-center">
      <View className="absolute top-0 left-0 right-0 h-full -z-10">
        <LinearGradient
            colors={['#1F2937', '#111827']}
            style={{ flex: 1 }}
        />
      </View>

      <SafeAreaView className="flex-1 w-full px-8 items-center justify-center pb-12">
        
        {/* Glow Effect */}

        {/* Trophy Animation */}
        <Animated.View entering={ZoomIn.springify()} className="mb-10 items-center justify-center">
            <View className="bg-white/5 p-10 rounded-full border border-white/10 shadow-2xl shadow-coral/50">
                <Ionicons name="trophy" size={100} color="#FF6B58" />
            </View>
        </Animated.View>

        {/* Score Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="items-center mb-16 space-y-2">
          <Text className="text-gray-400 font-rubik text-lg uppercase tracking-widest mb-2">Total Score</Text>
          <Text className="text-white font-rubik-bold text-7xl text-center shadow-lg shadow-coral/50">
            {finalScore}
          </Text>
          
          <View className="bg-amber-500/20 px-6 py-2 rounded-full flex-row items-center border border-amber-500/30 mt-4">
            <Ionicons name="star" size={20} color="#FBBF24" />
            <Text className="text-amber-400 font-rubik-bold text-xl ml-2">+{xpEarned} XP</Text>
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View entering={FadeInDown.delay(400).springify()} className="w-full gap-y-4">
          <TouchableOpacity 
            onPress={handleShare}
            className="w-full bg-green-500 py-5 rounded-2xl flex-row items-center justify-center space-x-3 shadow-xl shadow-green-500/30"
            activeOpacity={0.8}
          >
            <Ionicons name="share-social" size={26} color="white" />
            <Text className="text-white font-rubik-bold text-xl">Share Result</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handlePlayAgain}
            className="w-full bg-coral py-5 rounded-2xl flex-row items-center justify-center space-x-3 shadow-xl shadow-coral/30"
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={26} color="white" />
            <Text className="text-white font-rubik-bold text-xl">Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity 
             onPress={handleHome}
             className="w-full bg-white/5 py-5 rounded-2xl flex-row items-center justify-center space-x-3 border border-white/10 active:bg-white/10"
             activeOpacity={0.8}
          >
            <Ionicons name="home" size={24} color="#9CA3AF" />
            <Text className="text-gray-300 font-rubik-medium text-lg">Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}
