import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Please check your inbox for email verification!');
      router.push('/(auth)/sign-in');
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <StatusBar style="auto" />
      
      {/* Header Gradient */}
      <View className="absolute top-0 left-0 right-0 h-64">
        <LinearGradient
          colors={['#0D948815', '#FAFAF900']} // Teal tint for signup
          style={{ flex: 1 }}
        />
      </View>

      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        className="px-6 pt-12"
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white dark:bg-dark-surface items-center justify-center shadow-sm mb-8"
        >
          <Ionicons name="arrow-back" size={24} color="#1C1917" />
        </TouchableOpacity>

        <Animated.View entering={FadeInUp.springify()}>
          <Text className="text-4xl font-rubik-bold text-gray-900 dark:text-white mb-2">
            Create Account 🚀
          </Text>
          <Text className="text-lg font-rubik text-gray-500 dark:text-gray-400 mb-10">
            Start your journey to a smarter brain.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} className="space-y-6">
          
          {/* Name Input */}
          <View className="space-y-3">
            <Text className="text-sm font-rubik-medium text-gray-700 dark:text-gray-300 ml-1 mb-2">
              Full Name
            </Text>
            <View className="w-full h-14 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 rounded-xl px-4 flex-row items-center focus:border-teal focus:border-2 transition-all">
              <Ionicons name="person-outline" size={22} color="#9CA3AF" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-3 font-rubik text-gray-900 dark:text-white h-full"
              />
            </View>
          </View>

          {/* Email Input */}
          <View className="space-y-3">
            <Text className="text-sm font-rubik-medium text-gray-700 dark:text-gray-300 ml-1 my-2">
              Email Address
            </Text>
            <View className="w-full h-14 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 rounded-xl px-4 flex-row items-center focus:border-teal focus:border-2 transition-all">
              <Ionicons name="mail-outline" size={22} color="#9CA3AF" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                className="flex-1 ml-3 font-rubik text-gray-900 dark:text-white h-full"
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="space-y-3">
            <Text className="text-sm font-rubik-medium text-gray-700 dark:text-gray-300 ml-1 my-2">
              Password
            </Text>
            <View className="w-full h-14 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 rounded-xl px-4 flex-row items-center focus:border-teal focus:border-2 transition-all">
              <Ionicons name="lock-closed-outline" size={22} color="#9CA3AF" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                className="flex-1 ml-3 font-rubik text-gray-900 dark:text-white h-full"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <View className="space-y-4">
            <TouchableOpacity 
              onPress={signUpWithEmail}
              disabled={loading}
              className="w-full h-14 rounded-xl shadow-lg shadow-teal/30 overflow-hidden mt-2"
            >
              <LinearGradient
                colors={['#0D9488', '#14B8A6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-full h-full items-center justify-center"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-rubik-bold text-lg">
                    Create Account
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View className="flex-row items-center justify-center space-x-4 my-2">
              <View className="h-[1px] bg-gray-200 dark:bg-gray-800 flex-1" />
              <Text className="text-gray-400 font-rubik text-sm">Or continue with</Text>
              <View className="h-[1px] bg-gray-200 dark:bg-gray-800 flex-1" />
            </View>

            {/* Google Sign In Button - Placeholder */}
            <TouchableOpacity 
              onPress={() => Alert.alert('Google Sign In', 'Coming soon!')}
              className="w-full h-14 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 flex-row items-center justify-center space-x-3 shadow-sm"
            >
              <Ionicons name="logo-google" size={24} color="#DB4437" />
              <Text className="text-gray-700 dark:text-white font-rubik-medium text-lg">
                Google
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-gray-500 font-rubik">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
              <Text className="text-teal font-rubik-bold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
