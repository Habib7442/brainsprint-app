import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

// Types
interface Room {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  code: string;
  status: string;
  creator_id: string;
  cover_image_url?: string;
  subject?: string;
}

interface Participant {
  user_id: string;
  name?: string; // joined from users table
  avatar_url?: string;
  status: string;
  score: number;
  rank?: number;
}

export default function RoomLobbyScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const [room, setRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreator, setIsCreator] = useState(false);
    
    // Derived state
    const myParticipant = participants.find(p => p.user_id === user?.id);
    
    // Edit State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editSubject, setEditSubject] = useState('');
    const [editImage, setEditImage] = useState<string | null>(null);

    // Private Room State
    const [inputCode, setInputCode] = useState('');

    useEffect(() => {
        if (id && user) {
            fetchRoomDetails();
            const channel = subscribeToRoom();
            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [id, user]);

    const fetchRoomDetails = async () => {
        try {
            // 1. Fetch Room
            const { data: roomData, error: roomError } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', id)
                .single();
            
            if (roomError) throw roomError;
            setRoom(roomData);
            setIsCreator(roomData.creator_id === user?.id);
            console.log('Is Creator Check:', { roomCreator: roomData.creator_id, userId: user?.id, isMatch: roomData.creator_id === user?.id });

            // 2. Fetch Participants
            await fetchParticipants();

            // 3. Check if user is participant, if not join
            const { data: participation } = await supabase
                .from('room_participants')
                .select('*')
                .eq('room_id', id)
                .eq('user_id', user?.id)
                .single();

            if (!participation && roomData.is_public) {
                await joinRoom();
            }

        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Could not load room');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const fetchParticipants = async () => {
        try {
            console.log('Fetching participants for room:', id);
            // 1. Get Participants
            const { data: participations, error: pError } = await supabase
                .from('room_participants')
                .select('*')
                .eq('room_id', id);

            if (pError) {
                console.error('Error fetching participants:', pError);
                return;
            }

            console.log('Raw Participations:', participations);

            if (!participations || participations.length === 0) {
                setParticipants([]);
                return;
            }

            // 2. Get User Details
            const userIds = participations.map(p => p.user_id);
            const { data: usersData, error: uError } = await supabase
                .from('users')
                .select('id, name, avatar_url')
                .in('id', userIds);

            if (uError) {
                console.error('Error fetching users:', uError);
            }
            
            // 3. Merge & Sort
            const merged = participations.map(p => {
                const userDetail = usersData?.find((u: any) => u.id === p.user_id);
                return {
                    user_id: p.user_id,
                    status: p.status,
                    score: p.score,
                    name: userDetail?.name || 'User',
                    avatar_url: userDetail?.avatar_url
                };
            }).sort((a: any, b: any) => b.score - a.score)
              .map((p: any, idx: number) => ({ ...p, rank: idx + 1 }));
            
            setParticipants(merged);

        } catch (err) {
             console.error('Fetch Participants Exception:', err);
        }
    };

    const joinRoom = async () => {
        try {
            const { error } = await supabase.from('room_participants').upsert({
                room_id: id,
                user_id: user?.id,
                status: 'joined',
                score: 0
            }, { onConflict: 'room_id,user_id', ignoreDuplicates: true });

            if (error) console.log('Join/Upsert result:', error);
            
            await fetchParticipants();
            Alert.alert('Success', 'You have joined the room!');
        } catch (err) {
            console.error('Join error', err);
        }
    };

    const handleUnlockRoom = async () => {
        if (!inputCode) return;
        if (inputCode.trim().toUpperCase() !== room?.code) {
            Alert.alert('Invalid Code', 'Please check the room code and try again.');
            return;
        }
        await joinRoom();
    };

    const subscribeToRoom = () => {
        // Subscribe to participant changes
        return supabase
            .channel(`room_${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${id}` }, () => {
                fetchParticipants();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, (payload) => {
                if (payload.new.status === 'active') {
                    // Game Started!
                    router.replace({ pathname: '/rooms/play/[id]', params: { id: id as string }} as any);
                }
            })
            .subscribe();
    };

    const handleStartGame = async () => {
        if (!isCreator) return;
        try {
            await supabase.from('rooms').update({ status: 'active' }).eq('id', id);
            // Router will be handled by subscription or manually
            router.replace({ pathname: '/rooms/play/[id]', params: { id: id as string }} as any);
        } catch (err) {
            Alert.alert('Error starting game');
        }
    };
    
    const copyCode = async () => {
        if (room?.code) {
             Share.share({ message: `Join my Study Room on BrainSprint! Code: ${room.code}` });
        }
    };

    const handleDelete = async () => {
        Alert.alert('Delete Room', 'Are you sure you want to delete this room?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                   setLoading(true);
                   try {
                       await supabase.from('rooms').delete().eq('id', id);
                       router.back();
                   } catch(e) {
                       Alert.alert('Error', 'Could not delete room');
                       setLoading(false);
                   }
                }
            }
        ]);
    };

    const uploadImage = async (uri: string) => {
      const ext = uri.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const contentType = `image/${ext}`;
      
      const arrayBuffer = await fetch(uri).then(res => res.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from('room_assets')
        .upload(fileName, arrayBuffer, {
            contentType: contentType,
            upsert: false
        });

      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('room_assets').getPublicUrl(fileName);
      return data.publicUrl;
    };

    const pickEditImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });
  
        if (!result.canceled) {
            setEditImage(result.assets[0].uri);
        }
    };

    const openEditModal = () => {
        setEditName(room?.name || '');
        setEditDescription(room?.description || '');
        setEditSubject(room?.subject || '');
        setEditImage(room?.cover_image_url || null);
        setEditModalVisible(true);
    };

    const handleUpdateRoom = async () => {
        if (!editName.trim()) return Alert.alert('Error', 'Name is required');
        
        try {
            let coverUrl = room?.cover_image_url;
            if (editImage && editImage !== room?.cover_image_url) {
                coverUrl = await uploadImage(editImage);
            }

            const { error } = await supabase
                .from('rooms')
                .update({
                    name: editName,
                    description: editDescription,
                    subject: editSubject,
                    cover_image_url: coverUrl
                })
                .eq('id', id);

            if (error) throw error;
            
            setRoom(prev => prev ? ({ 
                ...prev, 
                name: editName, 
                description: editDescription, 
                subject: editSubject,
                cover_image_url: coverUrl 
            }) : null);
            
            setEditModalVisible(false);
            Alert.alert('Success', 'Room updated!');
        } catch (err) {
            Alert.alert('Error', 'Failed to update room');
        }
    };

    if (loading) return <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-dark-bg"><ActivityIndicator size="large" color="#FF6B58"/></View>;
    if (!room) return null;

    return (
        <View className="flex-1 bg-gray-50 dark:bg-dark-bg">
            {room.cover_image_url ? (
                <ImageBackground 
                    source={{ uri: room.cover_image_url }} 
                    className="h-[45%] w-full"
                    resizeMode="cover"
                >
                    <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']} className="flex-1">
                        <SafeAreaView className="flex-1 justify-between p-6">
                            {/* Header Row */}
                            <View className="flex-row items-center justify-between">
                                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-black/20 rounded-full items-center justify-center">
                                    <Ionicons name="arrow-back" size={24} color="white" />
                                </TouchableOpacity>
                                {isCreator && (
                                    <View className="flex-row gap-3">
                                        <TouchableOpacity onPress={openEditModal} className="w-10 h-10 bg-white/20 rounded-full items-center justify-center border border-white/30">
                                            <Ionicons name="pencil" size={20} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleDelete} className="w-10 h-10 bg-red-500/20 rounded-full items-center justify-center border border-red-500/30">
                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Room Details */}
                            <View>
                                {room.subject && (
                                    <View className="bg-coral px-3 py-1 rounded-full self-start mb-2">
                                        <Text className="text-white text-xs font-rubik-bold uppercase">{room.subject}</Text>
                                    </View>
                                )}
                                <Text className="text-3xl font-rubik-bold text-white mb-2 shadow-md">{room.name}</Text>
                                <Text className="text-gray-200 font-rubik text-base mb-4">{room.description || 'Get ready to compete!'}</Text>
                                
                                {!room.is_public && room.code && isCreator && (
                                    <TouchableOpacity onPress={copyCode} className="flex-row items-center bg-white/10 px-4 py-2 rounded-lg self-start border border-white/20">
                                        <Text className="text-white font-mono font-bold text-lg mr-2 tracking-widest">{room.code}</Text>
                                        <Ionicons name="copy-outline" size={16} color="white" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </SafeAreaView>
                    </LinearGradient>
                </ImageBackground>
            ) : (
                <SafeAreaView className="h-[45%] w-full bg-slate-900 justify-between p-6">
                     <View className="flex-row items-center justify-between">
                        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white/10 rounded-full items-center justify-center">
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white font-rubik-bold text-lg">LOBBY</Text>
                        <View className="w-10" />
                    </View>
                    <View className="items-center mb-10">
                        <View className="w-20 h-20 bg-coral rounded-2xl items-center justify-center mb-4 shadow-lg shadow-coral/50"><Ionicons name="grid" size={40} color="white"/></View>
                        <Text className="text-3xl font-rubik-bold text-white mb-2 text-center">{room.name}</Text>
                        <Text className="text-gray-400 text-center">{room.description}</Text>
                    </View>
                </SafeAreaView>
            )}

            {/* Bottom Sheet for Participants */}
            <View className="flex-1 bg-white dark:bg-dark-surface -mt-8 rounded-t-[32px] overflow-hidden">
                <View className="p-6 border-b border-gray-100 dark:border-gray-800 flex-row justify-between items-center">
                    <Text className="text-xl font-rubik-bold text-gray-900 dark:text-white">Participants</Text>
                    <View className="bg-green-100 px-3 py-1 rounded-full">
                        <Text className="text-green-700 font-rubik-bold text-xs">{participants.length} Active</Text>
                    </View>
                </View>
                
                <FlatList 
                    data={participants.slice(0, 10)}
                    keyExtractor={item => item.user_id}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 10 }}
                    renderItem={({ item }) => {
                        const isMe = item.user_id === user?.id;
                        return (
                            <View className={`flex-row items-center py-3 border-b border-gray-50 dark:border-gray-800 ${isMe ? 'bg-blue-50/50 dark:bg-blue-900/10 -mx-2 px-2 rounded-lg' : ''}`}>
                                    <Text className={`w-8 text-center font-rubik-bold text-lg mr-2 ${item.rank! <= 3 ? 'text-yellow-500' : 'text-gray-400'}`}>#{item.rank}</Text>
                                    <View className="w-10 h-10 bg-gray-200 rounded-full mr-3 overflow-hidden border border-gray-100 dark:border-gray-700">
                                        {item.avatar_url ? (
                                            <Image source={{ uri: item.avatar_url }} className="w-full h-full" />
                                        ) : (
                                            <View className="w-full h-full items-center justify-center bg-teal/20">
                                                <Text className="text-teal font-rubik-bold">{item.name?.charAt(0) || 'U'}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-base font-rubik-bold ${isMe ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`} numberOfLines={1}>
                                            {item.name || 'Anonymous'} {isMe && '(You)'}
                                        </Text>
                                    </View>
                                    <View className="bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                                        <Text className="text-indigo-600 dark:text-indigo-400 font-rubik-bold text-xs">{item.score}</Text>
                                    </View>
                                </View>
                        );
                    }}
                />

                {/* User Rank Footer (if not in top 10) */}
                {(() => {
                    const myParticipant = participants.find(p => p.user_id === user?.id);
                    if (myParticipant && myParticipant.rank! > 10) {
                        return (
                             <View className="px-6 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-dark-surface">
                                <View className="flex-row items-center py-3 bg-blue-50/50 dark:bg-blue-900/10 px-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                    <Text className="w-8 text-center font-rubik-bold text-lg mr-2 text-gray-500">#{myParticipant.rank}</Text>
                                    <View className="w-10 h-10 bg-gray-200 rounded-full mr-3 overflow-hidden border border-gray-100 dark:border-gray-700">
                                        {myParticipant.avatar_url ? (
                                            <Image source={{ uri: myParticipant.avatar_url }} className="w-full h-full" />
                                        ) : (
                                            <View className="w-full h-full items-center justify-center bg-teal/20">
                                                <Text className="text-teal font-rubik-bold">{myParticipant.name?.charAt(0) || 'U'}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-rubik-bold text-blue-600 dark:text-blue-400" numberOfLines={1}>
                                            {myParticipant.name || 'Anonymous'} (You)
                                        </Text>
                                    </View>
                                    <View className="bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                                        <Text className="text-indigo-600 dark:text-indigo-400 font-rubik-bold text-xs">{myParticipant.score}</Text>
                                    </View>
                                </View>
                            </View>
                        )
                    }
                    return null;
                })()}

                {/* Footer */}

                {/* Footer Actions */}
                <View className="p-6 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-gray-800 pb-8 items-center">
                    {!room.is_public && !isCreator && !myParticipant ? (
                        <View className="w-full">
                            <Text className="text-gray-500 font-rubik text-center mb-4">This room is private. Enter code to join.</Text>
                            <View className="flex-row gap-3">
                                <TextInput 
                                    className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 font-rubik-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 text-center tracking-widest"
                                    placeholder="CODE"
                                    placeholderTextColor="#9CA3AF"
                                    value={inputCode}
                                    onChangeText={setInputCode}
                                    autoCapitalize="characters"
                                    maxLength={6}
                                />
                                <TouchableOpacity 
                                    onPress={handleUnlockRoom}
                                    className="bg-coral w-14 rounded-xl items-center justify-center shadow-lg shadow-coral/30"
                                >
                                    <Ionicons name="key" size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        myParticipant?.status === 'completed' ? (
                            <TouchableOpacity 
                                onPress={() => router.push({ pathname: '/rooms/play/[id]', params: { id: id as string, review: 'true' }} as any)}
                                className="w-full bg-teal py-4 rounded-2xl items-center flex-row justify-center shadow-lg shadow-teal/30"
                            >
                                <Ionicons name="book-outline" size={24} color="white" style={{marginRight: 8}}/>
                                <Text className="text-white font-rubik-bold text-lg">View Solutions</Text>
                            </TouchableOpacity>
                        ) : (
                             <TouchableOpacity 
                                onPress={() => router.push({ pathname: '/rooms/play/[id]', params: { id: id as string }} as any)}
                                className="w-full bg-coral py-4 rounded-2xl items-center flex-row justify-center shadow-lg shadow-coral/30"
                            >
                                <Text className="text-white font-rubik-bold text-lg mr-2">Start Test Now</Text>
                                <Ionicons name="play" size={24} color="white" />
                            </TouchableOpacity>
                        )
                    )}
                </View>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
                     <View className="flex-1" onTouchEnd={() => setEditModalVisible(false)} />
                     <View className="bg-white dark:bg-dark-surface p-6 rounded-t-3xl shadow-xl h-[65%] border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-rubik-bold text-gray-900 dark:text-white">Edit Room</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity onPress={pickEditImage} className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 overflow-hidden items-center justify-center border border-gray-200 dark:border-gray-700 border-dashed">
                             {editImage ? (
                                 <Image source={{ uri: editImage }} className="w-full h-full" resizeMode="cover" />
                             ) : (
                                 <View className="items-center">
                                     <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                                     <Text className="text-gray-500 font-rubik mt-2">Change Cover Image</Text>
                                 </View>
                             )}
                        </TouchableOpacity>

                        <Text className="text-gray-500 font-rubik-medium mb-1">Room Name</Text>
                        <TextInput
                            value={editName}
                            onChangeText={setEditName}
                            className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl mb-4 text-gray-900 dark:text-white font-rubik text-lg"
                            placeholder="Enter room name"
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text className="text-gray-500 font-rubik-medium mb-1">Subject</Text>
                        <TextInput
                            value={editSubject}
                            onChangeText={setEditSubject}
                            className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl mb-4 text-gray-900 dark:text-white font-rubik"
                            placeholder="e.g. Biology"
                            placeholderTextColor="#9CA3AF"
                        />
                        
                         <Text className="text-gray-500 font-rubik-medium mb-1">Description</Text>
                        <TextInput
                            value={editDescription}
                            onChangeText={setEditDescription}
                            className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl mb-6 text-gray-900 dark:text-white font-rubik"
                            placeholder="Enter description"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={3}
                            style={{textAlignVertical: 'top'}}
                        />

                        <TouchableOpacity 
                            onPress={handleUpdateRoom}
                            className="bg-coral w-full py-4 rounded-xl items-center shadow-lg shadow-coral/30"
                        >
                            <Text className="text-white font-rubik-bold text-lg">Save Changes</Text>
                        </TouchableOpacity>
                     </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
