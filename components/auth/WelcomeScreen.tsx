import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <StatusBar style="auto" />
      
      {/* Background Gradient */}
      <View className="absolute top-0 left-0 right-0 h-1/2">
        <LinearGradient
          colors={['#FF6B5820', '#FAFAF900']}
          style={{ flex: 1 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View className="flex-1 justify-center items-center px-6">
          {/* Logo/Icon Animation */}
          <Animated.View 
            entering={FadeInUp.delay(200).springify()}
            className="mb-10 items-center"
          >
            <View className="w-32 h-32 bg-coral/10 rounded-full items-center justify-center mb-6">
              <Text className="text-6xl">🧠</Text>
            </View>
            <Text className="text-4xl font-rubik-bold text-gray-900 dark:text-white text-center mb-2">
              BrainSprint
            </Text>
            <Text className="text-lg font-rubik text-gray-500 dark:text-gray-400 text-center">
              Your daily brain trainer for{'\n'}competitive exams
            </Text>
          </Animated.View>

          {/* Features Preview */}
          <Animated.View 
            entering={FadeInUp.delay(400).springify()}
            className="w-full mb-12"
          >
            <View className="flex-row justify-center space-x-8 gap-x-8">
              <View className="items-center">
                <View className="w-12 h-12 bg-teal/10 rounded-2xl items-center justify-center mb-2">
                  <Text className="text-2xl">⚡</Text>
                </View>
                <Text className="font-rubik-medium text-gray-600 dark:text-gray-300">Speed</Text>
              </View>
              <View className="items-center">
                <View className="w-12 h-12 bg-amber/10 rounded-2xl items-center justify-center mb-2">
                  <Text className="text-2xl">🎯</Text>
                </View>
                <Text className="font-rubik-medium text-gray-600 dark:text-gray-300">Focus</Text>
              </View>
              <View className="items-center">
                <View className="w-12 h-12 bg-coral/10 rounded-2xl items-center justify-center mb-2">
                  <Text className="text-2xl">🏆</Text>
                </View>
                <Text className="font-rubik-medium text-gray-600 dark:text-gray-300">Rank</Text>
              </View>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View 
            entering={FadeInDown.delay(600).springify()}
            className="w-full space-y-4"
          >
            <TouchableOpacity 
              onPress={() => router.push('/(auth)/sign-up')}
              className="w-full overflow-hidden rounded-xl shadow-lg shadow-coral/30"
            >
              <LinearGradient
                colors={['#FF6B58', '#FF8A7A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="py-4 items-center justify-center"
              >
                <Text className="text-white font-rubik-bold text-lg">
                  Get Started
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/(auth)/sign-in')}
              className="w-full py-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 rounded-xl items-center justify-center"
            >
              <Text className="text-gray-900 dark:text-white font-rubik-medium text-lg">
                I already have an account
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
