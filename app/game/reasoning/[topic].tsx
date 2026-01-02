import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, BackHandler, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReasoningStore } from '../../../store/useReasoningStore';

const StartScreen = () => {
    const { startGame } = useReasoningStore();
    const { topic } = useLocalSearchParams();
    const router = useRouter();

    const topicName = Array.isArray(topic) ? topic[0] : topic || 'Reasoning';

    return (
        <View className="flex-1 bg-light-bg dark:bg-dark-bg px-6 justify-center">
            <View className="mb-8 items-center">
                <View className="bg-coral/10 p-6 rounded-full mb-4">
                    <Ionicons name="hardware-chip" size={64} color="#FF6B58" />
                </View>
                <Text className="text-4xl font-rubik-bold text-gray-900 dark:text-white text-center mb-2">
                    {topicName}
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 text-center font-rubik text-lg">
                    AI-Powered Training
                </Text>
            </View>

            <View className="bg-white dark:bg-dark-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
                <View className="flex-row items-center mb-4">
                    <Ionicons name="list" size={24} color="#0D9488" />
                    <Text className="text-lg font-rubik-medium ml-3 text-gray-800 dark:text-gray-200">20 Questions</Text>
                </View>
                <View className="flex-row items-center mb-4">
                    <Ionicons name="time" size={24} color="#0D9488" />
                    <Text className="text-lg font-rubik-medium ml-3 text-gray-800 dark:text-gray-200">10 Minutes</Text>
                </View>
                <View className="flex-row items-center mb-4">
                    <Ionicons name="trending-up" size={24} color="#0D9488" />
                    <Text className="text-lg font-rubik-medium ml-3 text-gray-800 dark:text-gray-200">Adaptive Difficulty</Text>
                </View>
                <View className="flex-row items-center">
                   <Ionicons name="book" size={24} color="#0D9488" />
                   <Text className="text-lg font-rubik-medium ml-3 text-gray-800 dark:text-gray-200">Topic: {topicName}</Text>
               </View>
            </View>

            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => startGame(topicName)}
                className="w-full"
            >
                <LinearGradient
                    colors={['#FF6B58', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-4 rounded-2xl flex-row justify-center items-center"
                >
                    <Text className="text-white font-rubik-bold text-xl mr-2">Start Session</Text>
                    <Ionicons name="arrow-forward" size={24} color="white" />
                </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
                onPress={() => router.back()}
                className="mt-4 py-3"
            >
                <Text className="text-gray-500 text-center font-rubik-medium">Back to Topics</Text>
            </TouchableOpacity>
        </View>
    );
};

const LoadingScreen = () => (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg justify-center items-center px-6">
        <ActivityIndicator size="large" color="#FF6B58" />
        <Text className="text-2xl font-rubik-bold mt-8 text-gray-900 dark:text-white text-center">
            AI is crafting your challenge...
        </Text>
        <Text className="text-gray-500 mt-4 text-center font-rubik">
            Generating 20 unique reasoning questions just for you.
        </Text>
    </View>
);

const PlayScreen = () => {
    const { 
        questions, 
        currentIndex, 
        answers, 
        timeLeft, 
        nextQuestion, 
        prevQuestion,
        answerQuestion,
        finishGame,
        tick,
        setIndex
    } = useReasoningStore();
    
    // Timer effect
    useEffect(() => {
        const timer = setInterval(() => {
            tick();
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Scroll ref to scroll to top on question change
    const scrollRef = useRef<ScrollView>(null);
    useEffect(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [currentIndex]);

    const currentQ = questions[currentIndex];
    const progress = (currentIndex + 1) / questions.length;
    
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleBackPress = () => {
        Alert.alert(
            "Quit Session?",
            "You will lose your progress.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Quit", style: "destructive", onPress: () => useReasoningStore.getState().reset() }
            ]
        );
        return true;
    };

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, []);

    if (!currentQ) return <LoadingScreen />;

    return (
        <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg" edges={['top']}>
            {/* Header */}
            <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-surface">
                <TouchableOpacity onPress={handleBackPress}>
                    <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
                <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    <Ionicons name="time-outline" size={18} color={timeLeft < 60 ? '#EF4444' : '#666'} />
                    <Text className={`font-rubik-medium ml-2 ${timeLeft < 60 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatTime(timeLeft)}
                    </Text>
                </View>
                <Text className="font-rubik-medium text-coral dark:text-coral-dark">
                    {currentIndex + 1}/{questions.length}
                </Text>
            </View>

             {/* Progress Bar */}
             <View className="h-1 bg-gray-200 w-full">
                <View className="h-full bg-coral" style={{ width: `${progress * 100}%` }} />
            </View>

            <ScrollView ref={scrollRef} className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Difficulty Badge */}
                <View className="self-start px-3 py-1 rounded-full bg-teal/10 mb-4">
                    <Text className="text-teal font-rubik-medium text-xs uppercase tracking-wider">
                        {currentQ.difficulty} Difficulty
                    </Text>
                </View>

                {/* Question */}
                <Text className="text-xl font-rubik-medium text-gray-900 dark:text-white leading-8 mb-8">
                    {currentQ.question}
                </Text>

                {/* Options */}
                <View className="space-y-4">
                    {currentQ.options.map((option, idx) => {
                        const isSelected = answers[currentQ.id] === option;
                        return (
                            <TouchableOpacity
                                key={idx}
                                activeOpacity={0.7}
                                onPress={() => answerQuestion(currentQ.id, option)}
                                className={`p-4 rounded-xl border-2 flex-row items-center ${
                                    isSelected 
                                    ? 'border-coral bg-coral/5 dark:border-coral-dark' 
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface'
                                }`}
                            >
                                <View className={`w-6 h-6 rounded-full border-2 mr-4 justify-center items-center ${
                                    isSelected ? 'border-coral bg-coral' : 'border-gray-300'
                                }`}>
                                    {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-white" />}
                                </View>
                                <Text className={`flex-1 font-rubik text-base ${
                                    isSelected ? 'text-coral-dark font-rubik-medium' : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Footer */}
            <View className="p-6 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-gray-800 flex-row justify-between items-center shadow-lg">
                <TouchableOpacity 
                    onPress={prevQuestion}
                    disabled={currentIndex === 0}
                    className={`px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 ${
                        currentIndex === 0 ? 'opacity-50' : ''
                    }`}
                >
                    <Ionicons name="arrow-back" size={24} color="#666" />
                </TouchableOpacity>

                 {/* Pagination Dots */}
                 <ScrollView horizontal className="mx-4 max-h-2" showsHorizontalScrollIndicator={false}>
                 {/* Simplified dots if too many, but for 20 it fits scroll maybe? Let's just hide or show simplified count */}
                 </ScrollView>

                {currentIndex === questions.length - 1 ? (
                    <TouchableOpacity 
                        onPress={finishGame}
                        className="flex-1 ml-4"
                    >
                         <LinearGradient
                            colors={['#10B981', '#059669']}
                            className="py-3 rounded-xl flex-row justify-center items-center"
                        >
                            <Text className="text-white font-rubik-bold text-lg mr-2">Submit Test</Text>
                            <Ionicons name="checkmark-circle" size={24} color="white" />
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        onPress={nextQuestion}
                        className="flex-1 ml-4"
                    >
                        <LinearGradient
                            colors={['#FF6B58', '#F59E0B']}
                            className="py-3 rounded-xl flex-row justify-center items-center"
                        >
                            <Text className="text-white font-rubik-bold text-lg mr-2">Next</Text>
                            <Ionicons name="arrow-forward" size={24} color="white" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const ResultScreen = () => {
    const { questions, answers, score, reset, isSubmitting } = useReasoningStore();
    const router = useRouter();
    const percentage = Math.round((score / questions.length) * 100);

    /* 
       Wait for submission effectively. 
       If isSubmitting is true (saving to supabase), we show loading on button.
    */

    return (
        <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg">
            <Stack.Screen options={{ headerShown: false }} />
            
            <View className="px-6 py-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-dark-surface z-10">
                 <Text className="text-center font-rubik-bold text-xl text-gray-900 dark:text-white mb-2">Session Complete!</Text>
                 <View className="flex-row justify-center items-center space-x-8">
                     <View className="items-center">
                         <Text className="text-3xl font-rubik-bold text-coral">{score}/{questions.length}</Text>
                         <Text className="text-sm text-gray-500 font-rubik">Score</Text>
                     </View>
                     <View className="w-px h-12 bg-gray-200" />
                     <View className="items-center">
                         <Text className={`text-3xl font-rubik-bold ${percentage >= 80 ? 'text-teal' : 'text-amber'}`}>
                             {percentage}%
                         </Text>
                         <Text className="text-sm text-gray-500 font-rubik">Accuracy</Text>
                     </View>
                 </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                <Text className="text-lg font-rubik-bold text-gray-900 dark:text-white mb-4">Detailed Review</Text>
                
                {questions.map((q, index) => {
                    const userAnswer = answers[q.id];
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

            <View className="p-6 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-gray-800">
                <TouchableOpacity 
                    onPress={() => {
                        reset();
                        // Optional: Navigate away? Or just show start screen
                        // router.replace('/(tabs)');
                    }}
                    className="w-full"
                    disabled={isSubmitting}
                >
                    <LinearGradient
                        colors={['#0D9488', '#14B8A6']}
                        className="py-4 rounded-2xl justify-center items-center"
                    >
                         {isSubmitting ? (
                             <ActivityIndicator color="white" />
                         ) : (
                             <Text className="text-white font-rubik-bold text-xl">Start New Session</Text>
                         )}
                    </LinearGradient>
                </TouchableOpacity>
                 <TouchableOpacity 
                    onPress={() => {
                        reset();
                        router.back();
                    }}
                    className="mt-3 py-2"
                >
                    <Text className="text-center text-gray-500 font-rubik-medium">Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const SavingScreen = () => (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg justify-center items-center px-6">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-2xl font-rubik-bold mt-8 text-gray-900 dark:text-white text-center">
            Saving Progress...
        </Text>
        <Text className="text-gray-500 mt-4 text-center font-rubik">
            Syncing your victory to the cloud.
        </Text>
    </View>
);

export default function ReasoningGame() {
    const { status } = useReasoningStore();
    const router = useRouter();
    
    // Hide standard header
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            {status === 'idle' && <StartScreen />}
            {status === 'generating' && <LoadingScreen />}
            {status === 'playing' && <PlayScreen />}
            {status === 'saving' && <SavingScreen />}
            {status === 'completed' && <ResultScreen />}
        </>
    );
}
