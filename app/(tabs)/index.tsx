import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

const { width } = Dimensions.get('window');

const GAME_MODES = [
  {
    id: 'calculation',
    title: 'Calculation',
    icon: 'calculator',
    color: '#0D9488', // Teal
    description: 'Master mental math & speed',
  },
  {
    id: 'reasoning',
    title: 'Reasoning',
    icon: 'bulb',
    color: '#F59E0B', // Amber
    description: 'Boost logic & problem solving',
  },
  {
    id: 'puzzle',
    title: 'Puzzle',
    icon: 'extension-puzzle',
    color: '#6366F1', // Indigo
    description: 'Enhance visual & spatial skills',
  },
];

export default function HomeScreen() {
  const { user, profile, refreshProfile } = useAuthStore();
  const router = useRouter();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  /* Streak Logic */
  const [lastMatchTime, setLastMatchTime] = React.useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
        await refreshProfile();
        if (user) {
             const { data } = await supabase
                .from('matches')
                .select('created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
             if (data) setLastMatchTime(data.created_at);
        }
    };
    init();
  }, [user]);

  const lastActiveDate = lastMatchTime ? new Date(lastMatchTime) : (profile?.last_active_at ? new Date(profile.last_active_at) : null);
  const isToday = lastActiveDate?.toDateString() === new Date().toDateString();
  const isYesterday = lastActiveDate?.toDateString() === new Date(Date.now() - 86400000).toDateString();
  
  // Display Streak: 
  // If isToday is true, we force at least 1 (because they played today!).
  const displayStreak = isToday 
        ? Math.max(1, profile?.current_streak || 0) 
        : (isYesterday ? (profile?.current_streak || 0) : 0);
  
  const streakIcon = displayStreak > 0 ? '🔥' : '❄️';
  const streakColor = isToday ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-blue-100 dark:bg-blue-900/20';

  return (
    <View className="flex-1 bg-gray-50 dark:bg-dark-bg">
      <StatusBar barStyle="dark-content" />
      
      {/* Custom Header Background */}
      <View className="absolute top-0 w-full h-80 bg-white dark:bg-dark-surface rounded-b-[40px] shadow-sm overflow-hidden">
         <LinearGradient
            colors={['#FF6B5810', '#FAFAF900']} // Coral tint
            style={{ flex: 1 }}
          />
      </View>

      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 100 }}
          className="px-6"
        >
          {/* Header Section */}
          <Animated.View entering={FadeInDown.delay(100).springify()} className="flex-row justify-between items-center mt-4 mb-8">
            <View>
              <Text className="text-gray-500 dark:text-gray-400 font-rubik text-base">
                {greeting()},
              </Text>
              <Text className="text-2xl font-rubik-bold text-gray-900 dark:text-white capitalize">
                {profile?.name?.split(' ')[0] || 'Sprinter'} 👋
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <Image
                source={profile?.avatar_url ? { uri: profile.avatar_url } : { uri: 'https://api.dicebear.com/9.x/micah/png?seed=' + (user?.email || 'user') }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
                className="border-2 border-white dark:border-gray-700"
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Stats Row */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="flex-row gap-4 mb-8">
            {/* Streak Card */}
            <View className="flex-1 bg-white dark:bg-dark-surface p-4 rounded-2xl flex-row items-center space-x-6 shadow-sm border border-orange-100 dark:border-gray-800 gap-2">
               <View className={`p-2.5 rounded-xl ${streakColor}`}>
                 <Text className="text-xl">{streakIcon}</Text>
               </View>
               <View>
                 <Text className="font-rubik-bold text-gray-900 dark:text-white text-lg">{displayStreak}</Text>
                 <Text className="text-xs text-gray-500 font-rubik">Streak</Text>
               </View>
            </View>
            
            {/* Rank/XP Card */}
             <View className="flex-1 bg-white dark:bg-dark-surface p-4 rounded-2xl flex-row items-center space-x-6 shadow-sm border border-teal-100 dark:border-gray-800 gap-2">
               <View className="bg-teal-100 dark:bg-teal-900/20 p-2.5 rounded-xl">
                 <Text className="text-xl">🏆</Text>
               </View>
               <View>
                 <Text className="font-rubik-bold text-gray-900 dark:text-white text-lg">{profile?.current_level || 1}</Text>
                 <Text className="text-xs text-gray-500 font-rubik">Level</Text>
               </View>
            </View>
          </Animated.View>

          {/* Daily Challenge Card */}
          <Animated.View entering={FadeInUp.delay(300).springify()} className="mb-8">
            <View className="bg-gray-900 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl shadow-coral/20">
               <LinearGradient
                  colors={['#1F2937', '#111827']}
                  style={{ padding: 24 }}
               >
                 <View className="flex-row justify-between items-start mb-2">
                    <View className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                      <Text className="text-white text-xs font-rubik-medium">Daily Challenge</Text>
                    </View>
                    <Text className="text-gray-400 font-rubik text-xs">Returns in 12h</Text>
                 </View>

                 <Text className="text-white text-3xl font-rubik-bold mt-2 mb-1">
                   Speed Run ⚡
                 </Text>
                 <Text className="text-gray-300 font-rubik text-sm mb-6 max-w-[80%]">
                   Complete 3 rapid-fire puzzles in under 2 minutes to earn double XP!
                 </Text>

                 <TouchableOpacity 
                   className="bg-coral w-full py-4 rounded-xl items-center flex-row justify-center space-x-2 active:opacity-90 transition-opacity"
                   onPress={() => router.push({ pathname: '/game/[id]', params: { id: 'calculation' } })}
                 >
                   <Text className="text-white font-rubik-bold text-lg">Start Challenge</Text>
                   <Ionicons name="arrow-forward" size={20} color="white" />
                 </TouchableOpacity>
               </LinearGradient>

               {/* Decorative background shape */}
               <View className="absolute -right-12 -bottom-12 w-48 h-48 bg-coral/10 rounded-full blur-3xl" />
            </View>
          </Animated.View>

          {/* Game Modes Section */}
          <Text className="text-xl font-rubik-bold text-gray-900 dark:text-white mb-4">
            Training Modes
          </Text>

          <View className="gap-4">
            {GAME_MODES.map((mode, index) => (
              <Animated.View 
                key={mode.id} 
                entering={FadeInDown.delay(400 + (index * 100)).springify()}
              >
                <TouchableOpacity 
                  className="bg-white dark:bg-dark-surface p-4 rounded-2xl flex-row items-center border border-gray-100 dark:border-gray-800 shadow-sm"
                  onPress={() => {
                    if (mode.id === 'calculation') {
                      router.push({ pathname: '/game/[id]', params: { id: 'calculation' } });
                    } else if (mode.id === 'reasoning') {
                      router.push({ pathname: '/game/[id]', params: { id: 'reasoning' } });
                    } else if (mode.id === 'puzzle') {
                      router.push({ pathname: '/game/[id]', params: { id: 'puzzle' } });
                    } else {
                      // Placeholder for future modes
                      alert('Coming soon!');
                    }
                  }}
                >
                  <View 
                    style={{ backgroundColor: `${mode.color}15` }} 
                    className="w-16 h-16 rounded-2xl items-center justify-center mr-4"
                  >
                    <Ionicons name={mode.icon as any} size={32} color={mode.color} />
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-lg font-rubik-bold text-gray-900 dark:text-white mb-1">
                      {mode.title}
                    </Text>
                    <Text className="text-sm font-rubik text-gray-500 dark:text-gray-400">
                      {mode.description}
                    </Text>
                  </View>

                  <View className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center">
                    <Ionicons name="play" size={20} color={mode.color} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
