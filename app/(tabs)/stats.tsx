import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

// Types matches Supabase schema
interface UserStat {
  category: string;
  sub_type: string;
  total_attempts: number;
  total_correct: number;
  accuracy_percentage: number;
}

interface UserSession {
  id: string;
  category: string;
  sub_type: string;
  correct_answers: number;
  total_questions: number;
  xp_earned: number;
  created_at: string; // created_at or completed_at
  completed_at: string;
}

export default function StatsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<UserStat[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [aggregated, setAggregated] = useState({
    totalXP: 0,
    totalQuestions: 0,
    avgAccuracy: 0,
    totalSessions: 0
  });

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // 1. Fetch User Stats (Aggregated by Topic)
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id);

      if (statsError) throw statsError;
      setStats(statsData || []);

      // 2. Fetch Recent Sessions (History)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(20);

      if (sessionsError) console.error("Session fetch error:", sessionsError); 
      // Note: If newly created table, ensure RLS allows select.
      
      setSessions(sessionsData || []);

      // Calculate totals manually if needed (or use DB views)
      // For now, simple client-side aggregation
      let totalXP = 0; // We might need to sum from sessions if not stored in stats
      // Let's sum XP from sessions for now (limited to last 20? No, this is just "Recent").
      // Real Total XP is in user profile usually.
      
      // Let's use the profile XP for total
      const { data: profileData } = await supabase.from('users').select('total_xp').eq('id', user.id).single();
      if (profileData) totalXP = profileData.total_xp;

      let totalQs = 0;
      let totalAccSum = 0;
      let countStats = 0;

      if (statsData) {
        statsData.forEach(s => {
           // This assumes stats are per topic. 
           // Total questions = attempts * questions_per_session? No, user_stats schema was defined to have 'total_correct' but maybe not total questions attempted directly across all history if not added.
           // Actually create schema had: total_attempts (sessions), total_correct.
           // We'll just sum what we can.
        });
      }
      
      // Calculate average accuracy across all stats entries
      const avgAcc = statsData && statsData.length > 0
        ? statsData.reduce((acc, curr) => acc + curr.accuracy_percentage, 0) / statsData.length
        : 0;

      // Total Sessions
      const totalSessionsCount = statsData ? statsData.reduce((acc, curr) => acc + curr.total_attempts, 0) : 0;

      setAggregated({
        totalXP,
        totalQuestions: 0, // Placeholder if we don't have exact column
        avgAccuracy: avgAcc,
        totalSessions: totalSessionsCount
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-dark-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-surface">
          <Text className="text-2xl font-rubik-bold text-gray-900 dark:text-white">Performance</Text>
          <TouchableOpacity onPress={onRefresh}>
             <Ionicons name="refresh" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView 
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Overview Cards */}
          <View className="p-6 mb-2">
            <View className="flex-row gap-4 mb-4">
               {/* Total XP */}
               <LinearGradient
                  colors={['#FF6B58', '#F59E0B']}
                  className="flex-1 p-4 rounded-2xl justify-between min-h-[120px]"
               >
                  <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                    <Ionicons name="trophy" size={20} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-rubik-bold text-3xl">{aggregated.totalXP}</Text>
                    <Text className="text-white/80 font-rubik text-sm">Total XP</Text>
                  </View>
               </LinearGradient>

               {/* Accuracy */}
               <LinearGradient
                  colors={['#0D9488', '#14B8A6']}
                  className="flex-1 p-4 rounded-2xl justify-between min-h-[120px]"
               >
                  <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                    <Ionicons name="analytics" size={20} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-rubik-bold text-3xl">{Math.round(aggregated.avgAccuracy)}%</Text>
                    <Text className="text-white/80 font-rubik text-sm">Avg Accuracy</Text>
                  </View>
               </LinearGradient>
            </View>

            <View className="flex-row gap-4">
                {/* Total Sessions */}
                <View className="flex-1 bg-white dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <Text className="text-gray-500 font-rubik text-xs mb-1 uppercase">Sessions</Text>
                    <Text className="text-2xl font-rubik-bold text-gray-900 dark:text-white">{aggregated.totalSessions}</Text>
                </View>

                 {/* Best Topic (Placeholder logic) */}
                 <View className="flex-1 bg-white dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <Text className="text-gray-500 font-rubik text-xs mb-1 uppercase">Top Strength</Text>
                    <Text className="text-lg font-rubik-bold text-teal truncate" numberOfLines={1}>
                        {stats.length > 0 ? stats.sort((a,b) => b.accuracy_percentage - a.accuracy_percentage)[0].sub_type : '-'}
                    </Text>
                </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View className="px-6">
            <Text className="text-lg font-rubik-bold text-gray-900 dark:text-white mb-4">Recent Activity</Text>
            
            <View className="gap-4">
              {sessions.length === 0 ? (
                  <View className="items-center py-10">
                      <Text className="text-gray-400 font-rubik">No sessions yet. Start training!</Text>
                  </View>
              ) : (
                  sessions.map((session) => (
                    <TouchableOpacity 
                        key={session.id} 
                        activeOpacity={0.7}
                        onPress={() => router.push({ pathname: '/game/review/[id]', params: { id: session.id } })}
                        className="bg-white dark:bg-dark-surface p-4 rounded-2xl flex-row items-center border border-gray-100 dark:border-gray-800 shadow-sm"
                    >
                        <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                            session.category === 'reasoning' ? 'bg-amber-100' : 'bg-teal-100'
                        }`}>
                            <Ionicons 
                                name={session.category === 'reasoning' ? 'hardware-chip' : 'calculator'} 
                                size={24} 
                                color={session.category === 'reasoning' ? '#F59E0B' : '#0D9488'} 
                            />
                        </View>
                        
                        <View className="flex-1">
                            <Text className="font-rubik-bold text-gray-900 dark:text-white text-base">
                                {session.sub_type}
                            </Text>
                            <Text className="text-gray-500 text-xs font-rubik">
                                {new Date(session.completed_at || session.created_at).toLocaleDateString()} • {new Date(session.completed_at || session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>

                        <View className="items-end">
                             <Text className="font-rubik-bold text-gray-900 dark:text-white text-base">
                                {session.correct_answers}/{session.total_questions}
                             </Text>
                             <Text className="text-coral text-xs font-rubik-medium">
                                +{session.xp_earned} XP
                             </Text>
                        </View>
                    </TouchableOpacity>
                  ))
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
