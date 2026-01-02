import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReasoningQuestion } from '../../../lib/gemini';
import { supabase } from '../../../lib/supabase';

// Define the shape of metadata we stored
interface SessionMetadata {
  questions: ReasoningQuestion[];
  user_answers: Record<string, string>;
}

export default function SessionReviewScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [metadata, setMetadata] = useState<SessionMetadata | null>(null);
    const [scoreInfo, setScoreInfo] = useState<{score: number, total: number} | null>(null);

    useEffect(() => {
        const fetchSession = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('user_sessions')
                    .select('metadata, correct_answers, total_questions') // Ensure metadata is selected
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (data && data.metadata) {
                    setMetadata(data.metadata as unknown as SessionMetadata);
                    setScoreInfo({
                        score: data.correct_answers,
                        total: data.total_questions
                    });
                }
            } catch (err) {
                console.error("Failed to fetch session review:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [id]);

    if (loading) {
        return (
             <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg justify-center items-center">
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#FF6B58" />
                <Text className="text-gray-500 mt-4 font-rubik">Loading review...</Text>
            </SafeAreaView>
        );
    }

    if (!metadata) {
         return (
             <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg justify-center items-center px-6">
                 <Stack.Screen options={{ headerShown: false }} />
                 <Text className="text-gray-900 dark:text-white font-rubik-bold text-xl text-center">Details Not Available</Text>
                 <Text className="text-gray-500 font-rubik text-center mt-2">
                     Detailed review data might not be saved for this session or it's an older session.
                 </Text>
                 <TouchableOpacity onPress={() => router.back()} className="mt-6">
                     <Text className="text-coral font-rubik-medium">Go Back</Text>
                 </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const { questions, user_answers } = metadata;

    return (
        <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg">
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-surface">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <View>
                    <Text className="text-xl font-rubik-bold text-gray-900 dark:text-white">Session Review</Text>
                    {scoreInfo && (
                        <Text className="text-sm text-gray-500 font-rubik">
                            Score: {scoreInfo.score}/{scoreInfo.total}
                        </Text>
                    )}
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
                {questions.map((q, index) => {
                    const userAnswer = user_answers ? user_answers[q.id] : null;
                    const isCorrect = userAnswer === q.correctAnswer;
                    const isSkipped = !userAnswer;

                    return (
                        <View key={q.id} className="bg-white dark:bg-dark-surface p-5 rounded-2xl mb-4 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <View className="flex-row justify-between mb-2">
                                <Text className="font-rubik-bold text-gray-500 text-xs uppercase">Question {index + 1}</Text>
                                <View className={`px-2 py-0.5 rounded text-xs ${
                                    isCorrect ? 'bg-green-100' : isSkipped ? 'bg-gray-100' : 'bg-red-100'
                                }`}>
                                    <Text className={`text-xs font-rubik-bold ${
                                        isCorrect ? 'text-green-700' : isSkipped ? 'text-gray-600' : 'text-red-700'
                                    }`}>
                                        {isCorrect ? 'Correct' : isSkipped ? 'Skipped' : 'Wrong'}
                                    </Text>
                                </View>
                            </View>

                            <Text className="text-gray-900 dark:text-white font-rubik-medium mb-4 leading-6">{q.question}</Text>

                            <View className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg mb-3">
                                <Text className="text-xs text-gray-500 mb-1">Your Answer</Text>
                                <Text className={`font-rubik-medium ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                    {userAnswer || 'Not Answered'}
                                </Text>
                            </View>

                            {!isCorrect && (
                                <View className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg mb-3">
                                    <Text className="text-xs text-green-700 dark:text-green-400 mb-1">Correct Answer</Text>
                                    <Text className="font-rubik-medium text-green-700 dark:text-green-400">
                                        {q.correctAnswer}
                                    </Text>
                                </View>
                            )}

                            <View className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                                <Text className="font-rubik-bold text-gray-700 dark:text-gray-300 mb-1 text-sm">Explanation:</Text>
                                <Text className="text-gray-600 dark:text-gray-400 text-sm leading-5 font-rubik">
                                    {q.explanation}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}
