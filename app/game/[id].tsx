import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../../store/useGameStore';

const { width } = Dimensions.get('window');

// Colors for the buttons
const OPTION_COLORS = ['#0D9488', '#F59E0B', '#6366F1', '#EC4899'];

export default function GameScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const { 
    score, 
    lives, 
    timeLeft, 
    currentQuestion, 
    isPlaying,
    difficulty,
    combo, 
    ghostScore,
    ghostName,
    ghostAvatar,
    startGame, 
    submitAnswer, 
    tick,
    endGame 
  } = useGameStore();

  const shake = useSharedValue(0);

  // Game Loop Timer
  useEffect(() => {
    startGame(id as string);
    
    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [id]);

  // Handle Game Over
  useEffect(() => {
    if (!isPlaying && (timeLeft <= 0 || lives <= 0)) {
      router.replace({
        pathname: '/game/results',
        params: { score, mode: id },
      });
    }
  }, [isPlaying, timeLeft, lives]);

  /* Animation Styles defined at top-level to obey Rules of Hooks */
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shake.value }],
    };
  });

  const userProgressStyle = useAnimatedStyle(() => ({
      width: withTiming(`${Math.min((score / 500) * 100, 100)}%`, { duration: 500 }),
      height: '100%',
      backgroundColor: '#10B981',
      borderRadius: 999
  }));

  const userMarkerStyle = useAnimatedStyle(() => ({
      left: withTiming(`${Math.min((score / 500) * 100, 92)}%`, { duration: 500 }),
      position: 'absolute',
      zIndex: 10
  }));

  const ghostProgressStyle = useAnimatedStyle(() => ({
      width: withTiming(`${Math.min((ghostScore / 500) * 100, 100)}%`, { duration: 500 }),
      height: '100%',
      backgroundColor: '#EF4444', 
      borderRadius: 999,
      opacity: 0.8
  }));

  const ghostMarkerStyle = useAnimatedStyle(() => ({
      left: withTiming(`${Math.min((ghostScore / 500) * 100, 94)}%`, { duration: 500 }),
      position: 'absolute',
      zIndex: 10
  }));

  const handleAnswer = (option: number | string) => {
    const isCorrect = submitAnswer(option);
    if (!isCorrect) {
      // Trigger Shake Animation
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  };

  const getDifficultyColor = () => {
    if (difficulty === 1) return '#10B981'; // Green
    if (difficulty === 2) return '#F59E0B'; // Amber
    if (difficulty === 3) return '#EF4444'; // Red
    return '#10B981';
  };

  if (!currentQuestion) return null;

  return (
    <View className="flex-1 bg-gray-900">
      <StatusBar barStyle="light-content" />
      <SafeAreaView className="flex-1">
        
        {/* Header: Score, Timer, Lives */}
        <View className="flex-row justify-between items-center px-6 pt-4 mb-8">
          {/* Pause/Back */}
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
          >
            <Ionicons name="pause" size={24} color="white" />
          </TouchableOpacity>

          {/* Timer Pill */}
          <View className="bg-white/10 px-4 py-2 rounded-full flex-row items-center border border-white/10">
            <Ionicons name="time-outline" size={20} color={timeLeft < 10 ? "#EF4444" : "white"} />
            <Text className={`ml-2 font-rubik-bold text-lg ${timeLeft < 10 ? "text-red-500" : "text-white"}`}>
              {timeLeft}s
            </Text>
          </View>

          {/* Lives */}
          <View className="flex-row space-x-1">
            {[1, 2, 3].map((i) => (
              <Ionicons 
                key={i} 
                name="heart" 
                size={24} 
                color={i <= lives ? "#EF4444" : "#374151"} 
              />
            ))}
          </View>
        </View>

        {/* 👻 Ghost Racer Tracks (Parallel Lines) 🏎️ */}
        <View className="px-6 mb-8 gap-y-3">
            {/* Track 1: You */}
            <View className="flex-row items-center space-x-3">
                <Text className="text-xs font-rubik-bold text-green-400 w-12">You</Text>
                <View className="flex-1 h-3 bg-gray-800 rounded-full relative justify-center">
                    {/* Progress Fill */}
                    <Animated.View 
                        style={userProgressStyle} 
                    />
                    {/* Avatar Marker */}
                    <Animated.View 
                        style={userMarkerStyle}
                    >
                         <View className="w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                    </Animated.View>
                </View>
            </View>

            {/* Track 2: Opponent */}
            <View className="flex-row items-center space-x-3">
                <Text className="text-xs font-rubik text-gray-500 w-12" numberOfLines={1}>
                    {ghostName || 'Ghost'}
                </Text>
                <View className="flex-1 h-3 bg-gray-800 rounded-full relative justify-center">
                     {/* Progress Fill */}
                     <Animated.View 
                        style={ghostProgressStyle} 
                    />
                    {/* Avatar Marker */}
                    <Animated.View 
                        style={ghostMarkerStyle}
                    >
                        {ghostAvatar ? (
                             <Image 
                               source={{ uri: ghostAvatar }} 
                               style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#EF4444' }} 
                             />
                        ) : (
                            <View className="w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center border border-white/20">
                                <Text style={{ fontSize: 10 }}>👻</Text>
                            </View>
                        )}
                    </Animated.View>
                </View>
            </View>
        </View>

        {/* Question Section */}
        <View className="flex-1 justify-center items-center px-6 mb-12">
          
          {/* Level & Combo Badges */}
          <View className="flex-row items-center justify-center mb-6 space-x-3">
             <View className="bg-gray-800 py-1.5 px-4 rounded-xl border border-gray-700">
                <Text style={{ color: getDifficultyColor() }} className="font-rubik-bold text-xs uppercase tracking-widest">
                  Level {difficulty}
                </Text>
             </View>
             
             {combo > 1 && (
               <Animated.View entering={ZoomIn} className="bg-amber-900/40 py-1.5 px-4 rounded-xl border border-amber-500/30">
                  <Text className="text-amber-400 font-rubik-bold text-xs uppercase tracking-widest">
                    🔥 {combo}x Combo
                  </Text>
               </Animated.View>
             )}
          </View>

          <Animated.View style={animatedStyle}>
            <Text className="text-white font-rubik-bold text-6xl text-center shadow-lg shadow-black/50">
              {currentQuestion.question.replace('=', '').trim()}
            </Text>
          </Animated.View>
          
          <Text className="text-gray-400 font-rubik text-xl mt-8">
            Score: <Text className="text-white font-rubik-bold">{score}</Text>
          </Text>
        </View>

        {/* Options Grid */}
        <View className="px-6 pb-8 flex-row flex-wrap justify-between gap-y-4">
          {currentQuestion.options.map((option, index) => (
            <Animated.View 
              key={`${currentQuestion.question}-${index}`}
              entering={ZoomIn.delay(index * 50)}
              className="w-[48%]"
            >
              <TouchableOpacity
                onPress={() => handleAnswer(option)}
                className="h-24 rounded-2xl items-center justify-center shadow-lg active:scale-95 transition-transform"
                style={{ backgroundColor: OPTION_COLORS[index % OPTION_COLORS.length] }}
              >
                <Text className="text-white font-rubik-bold text-3xl">
                  {option}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

      </SafeAreaView>
      
      {/* Background Ambience */}
      <View className="absolute top-0 left-0 right-0 h-full -z-10 opacity-30">
        <LinearGradient
          colors={['#1F293700', '#111827']}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
