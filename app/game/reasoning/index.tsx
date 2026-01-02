import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const REASONING_TOPICS = [
  {
    id: 'coding-decoding',
    title: 'Coding-Decoding',
    icon: 'code-slash',
    description: 'Letter shifting, patterns, and cyphers.',
    questions: '20 Questions',
    time: '10 Mins',
    color: ['#FF6B58', '#F59E0B'], // Coral to Amber
  },
  {
    id: 'blood-relations',
    title: 'Blood Relations',
    icon: 'people',
    description: 'Family tree and relationship puzzles.',
    questions: '15 Questions',
    time: '8 Mins',
    color: ['#0D9488', '#14B8A6'], // Teal
  },
  {
    id: 'syllogism',
    title: 'Syllogism',
    icon: 'git-merge',
    description: 'Logical conclusions from statements.',
    questions: '20 Questions',
    time: '12 Mins',
    color: ['#6366F1', '#8B5CF6'], // Indigo
  },
  {
    id: 'direction-sense',
    title: 'Direction Sense',
    icon: 'compass',
    description: 'North, South, angles and paths.',
    questions: '15 Questions',
    time: '8 Mins',
    color: ['#EC4899', '#DB2777'], // Pink
  },
  {
    id: 'number-series',
    title: 'Number Series',
    icon: 'infinite',
    description: 'Find the missing number in the sequence.',
    questions: '20 Questions',
    time: '10 Mins',
    color: ['#10B981', '#059669'], // Emerald
  },
    {
    id: 'ordering-ranking',
    title: 'Ordering & Ranking',
    icon: 'list',
    description: 'Position from left/right, total persons.',
    questions: '15 Questions',
    time: '8 Mins',
    color: ['#F97316', '#EA580C'], // Orange
  },
];

export default function ReasoningTopicsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-dark-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-surface">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-rubik-bold text-gray-900 dark:text-white">Reasoning Library</Text>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-gray-500 dark:text-gray-400 mb-6 font-rubik">
            Select a topic to start your AI-powered training session. Questions are generated instantly based on competitive exam patterns.
          </Text>

          <View className="gap-4">
            {REASONING_TOPICS.map((topic, index) => (
              <TouchableOpacity
                key={topic.id}
                onPress={() => router.push({
                   pathname: "/game/reasoning/[topic]",
                   params: { topic: topic.title } 
                })}
                activeOpacity={0.9}
                className="bg-white dark:bg-dark-surface rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800"
              >
                <View className="flex-row items-center">
                  {/* Icon Container with Gradient */}
                  <LinearGradient
                    colors={topic.color as any}
                    className="w-14 h-14 rounded-xl items-center justify-center mr-4"
                  >
                    <Ionicons name={topic.icon as any} size={28} color="white" />
                  </LinearGradient>

                  <View className="flex-1">
                    <Text className="text-lg font-rubik-bold text-gray-900 dark:text-white mb-1">
                      {topic.title}
                    </Text>
                    <Text className="text-gray-500 text-xs font-rubik leading-4 mb-2">
                      {topic.description}
                    </Text>
                    <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center">
                            <Ionicons name="list-outline" size={12} color="#6B7280" />
                            <Text className="text-xs text-gray-500 ml-1">{topic.questions}</Text>
                        </View>
                        <View className="flex-row items-center">
                            <Ionicons name="time-outline" size={12} color="#6B7280" />
                            <Text className="text-xs text-gray-500 ml-1">{topic.time}</Text>
                        </View>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={24} color="#E5E7EB" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
