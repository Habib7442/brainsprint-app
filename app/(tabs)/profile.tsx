import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

const MENU_ITEMS = [
  { icon: 'person-outline', label: 'Edit Profile', color: '#0D9488' }, // Teal
  { icon: 'notifications-outline', label: 'Notifications', color: '#F59E0B' }, // Amber
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security', color: '#4B5563' }, // Gray
  { icon: 'help-circle-outline', label: 'Help & Support', color: '#6366F1' }, // Indigo
];

export default function ProfileScreen() {
  const { signOut, user, profile, refreshProfile } = useAuthStore();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [isDark, setIsDark] = useState(false); // Helper for the "Theme" switch demo

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace('/');
          }
        }
      ]
    );
  };

  const uploadAvatar = async () => {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const image = result.assets[0];
      if (!image.base64) throw new Error('No image data found!');

      const fileExt = image.uri.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(image.base64), {
          contentType: image.mimeType || 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;
      
      await refreshProfile();
      Alert.alert('Success', 'Profile picture updated!');

    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const StatCard = ({ icon, value, label, color }: { icon: any, value: string | number, label: string, color: string }) => (
    <View className="items-center bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex-1 mx-1">
      <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-full mb-2">
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="text-xl font-rubik-bold text-gray-900 dark:text-white">{value}</Text>
      <Text className="text-xs font-rubik text-gray-500 dark:text-gray-400 mt-1">{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']} className="bg-gray-50 dark:bg-dark-bg">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header / Profile Info */}
        <Animated.View entering={FadeInDown.springify()} className="items-center pt-4 pb-8 px-6 bg-white dark:bg-dark-surface rounded-b-[40px] shadow-sm mb-6">
          <TouchableOpacity onPress={uploadAvatar} className="relative mb-4 shadow-lg shadow-coral/20">
            <Image
              source={profile?.avatar_url ? { uri: profile.avatar_url } : { uri: 'https://api.dicebear.com/9.x/micah/png?seed=' + (user?.email || 'user') }}
              style={{ width: 120, height: 120, borderRadius: 60 }}
              contentFit="cover"
              className="border-4 border-white dark:border-gray-800"
            />
            <View className="absolute bottom-0 right-0 bg-coral w-10 h-10 rounded-full items-center justify-center border-4 border-white dark:border-gray-800">
              {uploading ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="camera" size={20} color="white" />}
            </View>
          </TouchableOpacity>
          
          <Text className="text-2xl font-rubik-bold text-gray-900 dark:text-white capitalize">
            {profile?.name || 'Brain Sprinter'}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 font-rubik text-base mt-1">
            {profile?.email || user?.email}
          </Text>

          <View className="flex-row items-center mt-3 bg-teal/10 px-3 py-1 rounded-full">
            <Ionicons name="shield-checkmark" size={14} color="#0D9488" />
            <Text className="text-teal font-rubik-medium text-xs ml-1">
              {profile?.is_premium ? 'Premium Member' : 'Free Plan'}
            </Text>
          </View>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="flex-row justify-between px-6 mb-8">
          <StatCard 
            icon="flame" 
            value={profile?.current_streak || 0} 
            label="Day Streak" 
            color="#FF6B58" 
          />
          <StatCard 
            icon="star" 
            value={profile?.total_xp || 0} 
            label="Total XP" 
            color="#F59E0B" 
          />
          <StatCard 
            icon="trophy" 
            value={profile?.current_level || 1} 
            label="Level" 
            color="#0D9488" 
          />
        </Animated.View>

        {/* Menu Options */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="px-6 space-y-4">
          <Text className="text-lg font-rubik-bold text-gray-900 dark:text-white mb-2 ml-1">Settings</Text>
          
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              className="flex-row items-center bg-white dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-2"
              onPress={() => {}}
            >
              <View style={{ backgroundColor: `${item.color}15` }} className="p-3 rounded-full mr-4">
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text className="flex-1 text-base font-rubik-medium text-gray-900 dark:text-white">
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}

          {/* Dark Mode Switch Example */}
          <View className="flex-row items-center bg-white dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mt-2">
             <View className="p-3 rounded-full mr-4 bg-gray-100 dark:bg-gray-800">
                <Ionicons name="moon-outline" size={22} color="#4B5563" />
              </View>
              <Text className="flex-1 text-base font-rubik-medium text-gray-900 dark:text-white">
                Dark Mode
              </Text>
              <Switch 
                value={isDark} 
                onValueChange={setIsDark}
                trackColor={{ false: '#E5E7EB', true: '#FF6B58' }}
                thumbColor={'white'}
              />
          </View>
        </Animated.View>

        {/* Sign Out Button */}
        <Animated.View entering={FadeInDown.delay(300).springify()} className="px-6 mt-8">
          <TouchableOpacity 
            onPress={handleSignOut}
            className="flex-row items-center justify-center bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20"
          >
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text className="text-red-500 font-rubik-bold ml-2 text-lg">Sign Out</Text>
          </TouchableOpacity>
          <Text className="text-center text-gray-400 font-rubik-light text-xs mt-4">
            Version 1.0.0
          </Text>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}
