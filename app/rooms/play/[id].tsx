import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/useAuthStore';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  imageUrl?: string;
  explanation?: string;
}

export default function PlayRoomScreen() {
    const { id, review } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();
    
    // Game State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(600); // 10 mins default
    const [isGameOver, setIsGameOver] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    // Fetch quiz content
    useEffect(() => {
        const fetchContent = async () => {
            try {
                 const { data, error } = await supabase
                    .from('room_quizzes')
                    .select('questions')
                    .eq('room_id', id)
                    .single();
                 
                 if (error) throw error;
                 
                 // Handle JSON parsing
                 let parsedQuestions: Question[] = [];
                 if (typeof data.questions === 'string') {
                      parsedQuestions = JSON.parse(data.questions);
                 } else {
                      parsedQuestions = data.questions;
                 }
                 
                 setQuestions(parsedQuestions);
            } catch (err) {
                Alert.alert('Error', 'Failed to load quiz');
                router.back();
            } finally {
                setLoading(false);
            }
        };
        
        fetchContent();
    }, [id]);

    // Timer
    const isReview = review === 'true';

    useEffect(() => {
        if (!isReview && !loading && !isGameOver && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0) {
            handleFinish();
        }
    }, [loading, isGameOver, timeLeft]);

    // Back Handler
    useEffect(() => {
        const backAction = () => {
          Alert.alert("Quit Quiz?", "Your progress will be lost.", [
            { text: "Cancel", onPress: () => null, style: "cancel" },
            { text: "YES", onPress: () => router.replace('/(tabs)/rooms' as any) }
          ]);
          return true;
        };
    
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, []);

    const handleOptionSelect = (option: string) => {
        setSelectedOption(option);
    };

    const handleNext = () => {
        if (!selectedOption) return;

        // Check answer
        const currentQ = questions[currentIndex];
        if (selectedOption === currentQ.correctAnswer) {
            setScore(prev => prev + 1);
        }

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            handleFinish(selectedOption === currentQ.correctAnswer); // Pass last answer result
        }
    };

    const handleFinish = async (lastCorrect: boolean = false) => {
        setIsGameOver(true);
        const finalScore = score + (lastCorrect ? 1 : 0);
        setScore(finalScore);

        try {
            // Update score in participant table
            await supabase
                .from('room_participants')
                .update({ 
                    score: finalScore * 10, // 10 points per question
                    status: 'completed' 
                })
                .eq('room_id', id)
                .eq('user_id', user?.id);
                
        } catch (err) {
            console.error(err);
        }
    };

    if (isGameOver) {
        return (
            <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
                 <Ionicons name="trophy" size={80} color="#FBBF24" />
                 <Text className="text-3xl font-rubik-bold text-white mt-6">Quiz Completed!</Text>
                 <Text className="text-gray-400 font-rubik mt-2">You scored</Text>
                 <Text className="text-5xl font-rubik-bold text-coral my-4">{score * 10} XP</Text>
                 
                 <TouchableOpacity 
                    onPress={() => router.replace({ pathname: '/rooms/[id]', params: { id: id as string }} as any)}
                    className="bg-white py-4 px-8 rounded-xl mt-8 w-full items-center"
                 >
                     <Text className="text-gray-900 font-rubik-bold text-lg">View Leaderboard</Text>
                 </TouchableOpacity>

                 <TouchableOpacity 
                    onPress={() => router.replace('/(tabs)/rooms' as any)}
                    className="bg-gray-800 py-4 px-8 rounded-xl mt-4 w-full items-center"
                 >
                     <Text className="text-gray-400 font-rubik-bold text-lg">Exit Room</Text>
                 </TouchableOpacity>
            </SafeAreaView>
        );
    }
    
    if (questions.length === 0) {
        if (loading) return <View className="flex-1 bg-gray-900 justify-center items-center"><Text className="text-white">Loading...</Text></View>;
        return <View className="flex-1 bg-gray-900 justify-center items-center"><Text className="text-white">No questions found.</Text></View>;
    }

    const currentQ = questions[currentIndex];

    // REVIEW MODE RENDER
    if (isReview) {
        return (
            <SafeAreaView className="flex-1 bg-gray-900">
                <View className="px-6 py-4 border-b border-gray-800 flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 bg-gray-800 rounded-full">
                         <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white font-rubik-bold text-xl">Test Solutions</Text>
                    <View className="w-10" />
                </View>
                
                <ScrollView className="flex-1 p-6">
                    {questions.map((q, index) => (
                        <View key={index} className="mb-10 border-b border-gray-800 pb-8 last:border-0 text-white">
                            <Text className="text-coral font-rubik-bold mb-2">Question {index + 1}</Text>
                            {q.imageUrl && (
                                <Image source={{ uri: q.imageUrl }} className="w-full h-48 rounded-xl mb-4 bg-gray-800" resizeMode="contain" />
                            )}
                            <Text className="text-xl font-rubik-bold text-white mb-4">{q.question}</Text>
                            
                            <View className="gap-3 mb-4">
                                {q.options.map((opt, idx) => {
                                    const isCorrect = opt === q.correctAnswer;
                                    return (
                                        <View key={idx} className={`p-4 rounded-xl border flex-row items-center ${isCorrect ? 'bg-green-900/40 border-green-500' : 'bg-gray-800 border-gray-700'}`}>
                                            <View className={`w-5 h-5 rounded-full border items-center justify-center mr-3 ${isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-500'}`}>
                                                {isCorrect && <Ionicons name="checkmark" size={14} color="white" />}
                                            </View>
                                            <Text className={`font-rubik text-base flex-1 ${isCorrect ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{opt}</Text>
                                        </View>
                                    );
                                })}
                            </View>

                            <View className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="sparkles" size={16} color="#60A5FA" />
                                    <Text className="text-blue-400 font-rubik-bold ml-2 text-sm uppercase">AI Explanation</Text>
                                </View>
                                <Text className="text-gray-300 font-rubik leading-6">
                                    {q.explanation || "No explanation provided."}
                                </Text>
                                <Text className="text-gray-600 text-xs mt-2 italic">
                                    *AI generated content. May contain errors.
                                </Text>
                            </View>
                        </View>
                    ))}
                    <View className="h-10" />
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-900">
             {/* Header */}
             <View className="px-6 py-4 flex-row justify-between items-center">
                 <Text className="text-gray-400 font-rubik-medium">Q. {currentIndex + 1}/{questions.length}</Text>
                 <View className="bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                     <Text className="text-white font-mono">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</Text>
                 </View>
             </View>

             <ScrollView className="flex-1 px-6">
                 {/* Question */}
                 <View className="my-8">
                     {currentQ.imageUrl && (
                         <Image 
                            source={{ uri: currentQ.imageUrl }} 
                            className="w-full h-48 rounded-xl mb-4 bg-gray-800" 
                            resizeMode="contain"
                         />
                     )}
                     <Text className="text-2xl font-rubik-bold text-white leading-8">
                         {currentQ.question}
                     </Text>
                 </View>

                 {/* Options */}
                 <View className="gap-4">
                     {currentQ.options.map((option, idx) => {
                         const isSelected = selectedOption === option;
                         return (
                             <TouchableOpacity
                                key={idx}
                                onPress={() => handleOptionSelect(option)}
                                activeOpacity={0.8}
                                className={`p-4 rounded-xl border-2 flex-row items-center ${isSelected ? 'border-coral bg-coral/10' : 'border-gray-700 bg-gray-800'}`}
                             >
                                 <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 ${isSelected ? 'border-coral' : 'border-gray-500'}`}>
                                     {isSelected && <View className="w-3 h-3 rounded-full bg-coral" />}
                                 </View>
                                 <Text className={`font-rubik-medium text-lg flex-1 ${isSelected ? 'text-coral' : 'text-gray-300'}`}>
                                     {option}
                                 </Text>
                             </TouchableOpacity>
                         );
                     })}
                 </View>
             </ScrollView>

             {/* Footer */}
             <View className="p-6 border-t border-gray-800">
                 <TouchableOpacity
                    onPress={handleNext}
                    disabled={!selectedOption}
                    className={`w-full py-4 rounded-xl items-center flex-row justify-center ${!selectedOption ? 'bg-gray-800 opacity-50' : 'bg-coral'}`}
                 >
                     <Text className="text-white font-rubik-bold text-lg mr-2">
                         {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
                     </Text>
                     <Ionicons name="arrow-forward" size={24} color="white" />
                 </TouchableOpacity>
             </View>
        </SafeAreaView>
    );
}
