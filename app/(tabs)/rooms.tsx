import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ImageBackground, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

interface Room {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  status: string;
  creator_id: string;
  created_at: string;
  participants_count?: number; 
  subject?: string;
  cover_image_url?: string;
}

export default function RoomsHub() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString();
  };

  const fetchRooms = async () => {
    try {
      // Fetch public rooms
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        // .or(`is_public.eq.true,creator_id.eq.${user?.id}`) // Showing all rooms now
        .in('status', ['waiting', 'active', 'finished'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched Rooms:', data?.length); // Logging length for cleaner output
      setRooms(data || []);
    } catch (err) {
      console.error('Fetch rooms error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleJoinPrivate = async () => {
    if (!joinCode || joinCode.length < 6) return;
    try {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('code', joinCode.toUpperCase())
            .single();
        
        if (error || !data) {
            alert('Invalid Room Code');
            return;
        }
        
        // Navigate to room join logic
        router.push({ pathname: '/rooms/[id]', params: { id: data.id } });
    } catch (err) {
        alert('Error joining room');
    }
  };

  const renderRoomItem = ({ item }: { item: Room }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/rooms/[id]', params: { id: item.id } })}
      className="mb-6 w-full h-48 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-dark-surface"
    >
        {item.cover_image_url ? (
            <ImageBackground
                source={{ uri: item.cover_image_url }}
                className="w-full h-full justify-end"
                resizeMode="cover"
            >
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    className="absolute w-full h-full"
                />
                <View className="p-4">
                     <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-row gap-2">
                            {!item.is_public && (
                                <View className="bg-black/40 px-3 py-1 rounded-full flex-row items-center backdrop-blur-md">
                                    <Ionicons name="lock-closed" size={12} color="white" />
                                    <Text className="text-white text-xs font-rubik-bold ml-1">PRIVATE</Text>
                                </View>
                            )}
                            {item.subject && (
                                 <View className="bg-coral px-3 py-1 rounded-full">
                                    <Text className="text-white text-xs font-rubik-bold uppercase">{item.subject}</Text>
                                 </View>
                            )}
                        </View>
                        <View className="bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                            <Text className="text-white text-xs font-rubik-bold">{getRelativeTime(item.created_at)}</Text>
                        </View>
                    </View>
                    <Text className="text-2xl font-rubik-bold text-white shadow-sm mb-1">{item.name}</Text>
                    <Text className="text-gray-300 font-rubik text-sm" numberOfLines={1}>
                        {item.description || 'No description'}
                    </Text>
                </View>
            </ImageBackground>
        ) : (
            <View className="flex-1 p-5 justify-between border border-gray-100 dark:border-gray-800">
                  <View className="flex-row justify-between items-start">
                     <View className="w-12 h-12 bg-coral/10 rounded-full items-center justify-center">
                         <Ionicons name={!item.is_public ? "lock-closed" : "people"} size={24} color="#FF6B58" />
                     </View>
                     <View className="items-end gap-2">
                         <View className="flex-row gap-2">
                            {!item.is_public && (
                                    <View className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full flex-row items-center">
                                        <Ionicons name="lock-closed" size={12} color="#6B7280" />
                                        <Text className="text-gray-500 text-xs font-rubik-bold ml-1">PRIVATE</Text>
                                    </View>
                            )}
                            {item.subject && (
                                <View className="bg-teal/10 px-3 py-1 rounded-full">
                                <Text className="text-teal text-xs font-rubik-bold uppercase">{item.subject}</Text>
                                </View>
                            )}
                         </View>
                         <View className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                            <Text className="text-gray-500 text-xs font-rubik-bold">{getRelativeTime(item.created_at)}</Text>
                         </View>
                     </View>
                  </View>
                 <View>
                    <Text className="text-2xl font-rubik-bold text-gray-900 dark:text-white mb-2">{item.name}</Text>
                    <Text className="text-gray-500 font-rubik text-sm" numberOfLines={2}>
                        {item.description || 'No description'}
                    </Text>
                 </View>
            </View>
        )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-dark-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-gray-800">
            <View>
                <Text className="text-2xl font-rubik-bold text-gray-900 dark:text-white">Study Rooms</Text>
                <Text className="text-gray-500 font-rubik text-sm">Join & Compete with friends</Text>
            </View>
            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => router.push('/rooms/create')}
                className="bg-teal py-2 px-4 rounded-full flex-row items-center"
            >
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white font-rubik-bold ml-1">Create</Text>
            </TouchableOpacity>
        </View>

        <View className="p-6">
            {/* Join Private Code */}
            <View className="bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
                <Text className="text-sm font-rubik-medium text-gray-700 dark:text-gray-300 mb-2">Have a Room Code?</Text>
                <View className="flex-row gap-3">
                    <TextInput 
                        className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 font-rubik-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                        placeholder="Ex: AB12CD"
                        placeholderTextColor="#9CA3AF"
                        value={joinCode}
                        onChangeText={setJoinCode}
                        autoCapitalize="characters"
                        maxLength={6}
                    />
                    <TouchableOpacity 
                        onPress={handleJoinPrivate}
                        className="bg-coral w-12 h-12 rounded-xl items-center justify-center"
                    >
                        <Ionicons name="arrow-forward" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <Text className="text-lg font-rubik-bold text-gray-900 dark:text-white mb-4">Rooms</Text>
        </View>

        <FlatList 
            key={'rooms-list-horizontal'}
            data={rooms}
            renderItem={renderRoomItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} />}
            ListEmptyComponent={
                !loading ? (
                    <View className="items-center py-10">
                        <Text className="text-gray-400 font-rubik text-center">No active public rooms found.{'\n'}Create your own!</Text>
                    </View>
                ) : <ActivityIndicator size="large" color="#FF6B58" />
            }
        />
      </SafeAreaView>
    </View>
  );
}
