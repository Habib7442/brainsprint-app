import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { PDFDocument } from 'pdf-lib';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateReasoningQuestions } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

// Manual Question Type
interface ManualQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    imageUrl?: string;
}

export default function CreateRoomScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  // Quiz Options
  const [generationType, setGenerationType] = useState<'ai' | 'manual' | 'pdf'>('ai');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState('20');
  
  // PDF State
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  // Manual Creation State
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentQ, setCurrentQ] = useState<Partial<ManualQuestion>>({ options: ['', '', '', ''] });
  const [qImage, setQImage] = useState<string | null>(null);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const uploadImage = async (uri: string) => {
      const ext = uri.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const contentType = `image/${ext}`;
      
      const arrayBuffer = await fetch(uri).then(res => res.arrayBuffer());
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('room_assets')
        .upload(fileName, arrayBuffer, {
            contentType: contentType,
            upsert: false
        });

      if (uploadError) throw uploadError;
      
      const { data: publicUrl } = supabase.storage.from('room_assets').getPublicUrl(fileName);
      return publicUrl.publicUrl;
  };

  const pickRoomImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.7,
      });

      if (!result.canceled) {
          setCoverImage(result.assets[0].uri);
      }
  };

  const pickQuestionImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
      });

      if (!result.canceled) {
          setQImage(result.assets[0].uri);
      }
  };

  const handlePickDocument = async () => {
      try {
          const result = await DocumentPicker.getDocumentAsync({
              type: 'application/pdf',
              copyToCacheDirectory: true
          });

          if (result.canceled) return;
          
          const file = result.assets[0];
          
          // Read content
          const base64 = await readAsStringAsync(file.uri, {
              encoding: 'base64'
          });

          // Check Page Count
          const pdfDoc = await PDFDocument.load(base64);
          const pages = pdfDoc.getPageCount();

          if (pages > 5) {
              Alert.alert('Limit Exceeded', `PDF has ${pages} pages. Maximum allowed is 5.`);
              return;
          }

          setPdfName(file.name);
          setPdfBase64(base64);

      } catch (err) {
          console.error(err);
          Alert.alert('Error', 'Failed to read document');
      }
  };

  const addManualQuestion = async () => {
      if (!currentQ.question || !currentQ.correctAnswer) {
          Alert.alert('Missing Fields', 'Question and Answer are required');
          return;
      }
      
      let imageUrl = undefined;
      if (qImage) {
          try {
             imageUrl = await uploadImage(qImage);
          } catch(e) {
              Alert.alert('Upload Failed', 'Could not upload question image');
              return;
          }
      }

      const newQ: ManualQuestion = {
          id: Date.now().toString(),
          question: currentQ.question,
          options: currentQ.options as string[],
          correctAnswer: currentQ.correctAnswer,
          explanation: currentQ.explanation,
          imageUrl: imageUrl
      };

      setManualQuestions([...manualQuestions, newQ]);
      setModalVisible(false);
      setCurrentQ({ options: ['', '', '', ''] });
      setQImage(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Room name is required');
    if (generationType === 'ai' && !topic.trim()) return Alert.alert('Error', 'Please enter a quiz topic');
    if (generationType === 'pdf' && !pdfBase64) return Alert.alert('Error', 'Please upload a PDF document');
    if (generationType === 'manual' && manualQuestions.length === 0) return Alert.alert('Error', 'Please add at least one question');

    setLoading(true);
    try {
        const code = isPublic ? null : generateRoomCode();
        
        let coverUrl = null;
        if (coverImage) {
            coverUrl = await uploadImage(coverImage);
        }

        // 1. Create Room
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .insert({
                creator_id: user?.id,
                name,
                subject,
                description,
                is_public: isPublic,
                code: code,
                status: 'waiting',
                cover_image_url: coverUrl
            })
            .select()
            .single();

        if (roomError) throw roomError;

        // 2. Generate Content
        let questions: any[] = [];
        if (generationType === 'manual') {
            questions = manualQuestions;
        } else {
             questions = await generateReasoningQuestions(
                generationType === 'pdf' ? (topic || 'Document Analysis') : topic, 
                parseInt(questionCount),
                generationType === 'pdf' ? pdfBase64! : undefined
             );
        }

        // 3. Save Quiz
        const { error: quizError } = await supabase
            .from('room_quizzes')
            .insert({
                room_id: room.id,
                questions: questions
            });

        if (quizError) throw quizError;

        // 4. Add Creator as Participant
        await supabase.from('room_participants').insert({
            room_id: room.id,
            user_id: user?.id,
            status: 'joined',
            score: 0
        });

        Alert.alert('Success', `Room created! ${!isPublic ? `Code: ${code}` : ''}`);
        router.replace({ pathname: '/rooms/[id]', params: { id: room.id } } as any);

    } catch (err: any) {
        console.error(err);
        Alert.alert('Creation Failed', err.message);
    } finally {
        setLoading(false);
    }
  };

  // ... (Render)
  return (
    <View className="flex-1 bg-gray-50 dark:bg-dark-bg">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-surface">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
                <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-rubik-bold text-gray-900 dark:text-white">Create Room</Text>
        </View>

        <KeyboardAvoidingView 
           behavior={Platform.OS === 'ios' ? 'padding' : undefined}
           className="flex-1"
        >
            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                {/* Room Details */}
                 <View className="mb-6 items-center">
                    <TouchableOpacity onPress={pickRoomImage} className="w-full h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                        {coverImage ? (
                            <Image source={{ uri: coverImage }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <View className="items-center p-4">
                                <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                                <Text className="text-gray-500 font-rubik mt-2 text-center">Add Background Image (16:9)</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View className="mb-6">
                    <Text className="label mb-2 font-rubik-medium text-gray-700 dark:text-gray-300">Room Name</Text>
                    <TextInput 
                        className="input bg-white dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700 font-rubik-medium text-gray-900 dark:text-white"
                        placeholder="Ex: Friday Night Science"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View className="mb-6">
                    <Text className="label mb-2 font-rubik-medium text-gray-700 dark:text-gray-300">Subject</Text>
                    <TextInput 
                        className="input bg-white dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700 font-rubik-medium text-gray-900 dark:text-white"
                        placeholder="Ex: Mathematics"
                        placeholderTextColor="#9CA3AF"
                        value={subject}
                        onChangeText={setSubject}
                    />
                </View>

                <View className="mb-6">
                    <Text className="label mb-2 font-rubik-medium text-gray-700 dark:text-gray-300">Description (Optional)</Text>
                    <TextInput 
                        className="input bg-white dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700 font-rubik text-gray-900 dark:text-white"
                        placeholder="What's this room about?"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View className="mb-8 flex-row items-center justify-between bg-white dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <View>
                        <Text className="text-lg font-rubik-medium text-gray-900 dark:text-white">Public Room</Text>
                        <Text className="text-gray-500 text-xs">Anyone can find and join</Text>
                    </View>
                    <Switch 
                         value={isPublic}
                         onValueChange={setIsPublic}
                         trackColor={{ false: '#767577', true: '#FF6B58' }}
                    />
                </View>

                 <Text className="text-lg font-rubik-bold text-gray-900 dark:text-white mb-4">Quiz Material</Text>
                 
                 <View className="flex-row gap-4 mb-6">
                     <TouchableOpacity 
                        onPress={() => setGenerationType('ai')}
                        className={`flex-1 p-4 rounded-xl border-2 items-center ${generationType === 'ai' ? 'border-coral bg-coral/10' : 'border-gray-200 dark:border-gray-700'}`}
                     >
                         <Ionicons name="sparkles" size={24} color={generationType === 'ai' ? '#FF6B58' : '#9CA3AF'} />
                         <Text className={`mt-2 font-rubik-medium ${generationType === 'ai' ? 'text-coral' : 'text-gray-500'}`}>AI Topic</Text>
                     </TouchableOpacity>

                     <TouchableOpacity 
                        onPress={() => setGenerationType('pdf')}
                        className={`flex-1 p-4 rounded-xl border-2 items-center ${generationType === 'pdf' ? 'border-coral bg-coral/10' : 'border-gray-200 dark:border-gray-700'}`}
                     >
                         <Ionicons name="document-text" size={24} color={generationType === 'pdf' ? '#FF6B58' : '#9CA3AF'} />
                         <Text className={`mt-2 font-rubik-medium ${generationType === 'pdf' ? 'text-coral' : 'text-gray-500'}`}>PDF</Text>
                     </TouchableOpacity>

                     <TouchableOpacity 
                        onPress={() => setGenerationType('manual')}
                        className={`flex-1 p-4 rounded-xl border-2 items-center ${generationType === 'manual' ? 'border-coral bg-coral/10' : 'border-gray-200 dark:border-gray-700'}`}
                     >
                         <Ionicons name="create" size={24} color={generationType === 'manual' ? '#FF6B58' : '#9CA3AF'} />
                         <Text className={`mt-2 font-rubik-medium ${generationType === 'manual' ? 'text-coral' : 'text-gray-500'}`}>Manual</Text>
                     </TouchableOpacity>
                 </View>

                 {generationType === 'ai' && (
                     <View className="gap-4">
                         <View>
                            <Text className="label mb-2 font-rubik-medium text-gray-700 dark:text-gray-300">Enter Topic</Text>
                            <TextInput 
                                className="input bg-white dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700 font-rubik-medium text-gray-900 dark:text-white"
                                placeholder="Ex: Organic Chemistry"
                                placeholderTextColor="#9CA3AF"
                                value={topic}
                                onChangeText={setTopic}
                            />
                         </View>
                     </View>
                 )}

                 {generationType === 'pdf' && (
                     <View className="gap-4">
                         <TouchableOpacity 
                            onPress={handlePickDocument}
                            className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 items-center justify-center"
                         >
                            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                                 <Ionicons name="cloud-upload" size={32} color="#EF4444" />
                            </View>
                            <Text className="text-lg font-rubik-medium text-gray-900 dark:text-white mb-1">
                                {pdfName || 'Tap to Select PDF'}
                            </Text>
                            <Text className="text-gray-500 text-xs font-rubik text-center">
                                Max 5 pages allowed.
                            </Text>
                         </TouchableOpacity>

                         <View>
                            <Text className="label mb-2 font-rubik-medium text-gray-700 dark:text-gray-300">Focus Topic (Optional)</Text>
                            <TextInput 
                                className="input bg-white dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700 font-rubik-medium text-gray-900 dark:text-white"
                                placeholder="Ex: Equations only"
                                placeholderTextColor="#9CA3AF"
                                value={topic}
                                onChangeText={setTopic}
                            />
                         </View>
                     </View>
                 )}

                 {generationType === 'manual' && (
                     <View>
                         <View className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
                             {manualQuestions.map((q, idx) => (
                                 <View key={q.id} className="p-4 border-b border-gray-100 dark:border-gray-800 flex-row items-center">
                                     <View className="w-8 h-8 bg-coral/10 rounded-full items-center justify-center mr-3">
                                         <Text className="text-coral font-rubik-bold">{idx + 1}</Text>
                                     </View>
                                     <Text className="flex-1 font-rubik text-gray-900 dark:text-white" numberOfLines={1}>{q.question}</Text>
                                     {q.imageUrl && <Ionicons name="image" size={16} color="#9CA3AF" />}
                                 </View>
                             ))}
                             {manualQuestions.length === 0 && (
                                 <View className="p-8 items-center">
                                     <Text className="text-gray-400 font-rubik italic">No questions added yet.</Text>
                                 </View>
                             )}
                         </View>
                         
                         <TouchableOpacity 
                            onPress={() => setModalVisible(true)}
                            className="bg-teal py-3 rounded-xl flex-row items-center justify-center"
                         >
                             <Ionicons name="add-circle" size={20} color="white" />
                             <Text className="text-white font-rubik-bold ml-2">Add Question</Text>
                         </TouchableOpacity>
                     </View>
                 )}

                <View className="py-8 mt-4 border-t border-gray-100 dark:border-gray-800">
                    <TouchableOpacity 
                        onPress={handleCreate}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl items-center flex-row justify-center ${loading ? 'bg-gray-400' : 'bg-coral'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-white font-rubik-bold text-lg mr-2">Create Room</Text>
                                <Ionicons name="arrow-forward" size={24} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>

        {/* Manual Generic Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-gray-50 dark:bg-dark-surface rounded-t-3xl h-[85%]">
                    <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700">
                        <Text className="text-lg font-rubik-bold text-gray-900 dark:text-white">New Question</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="p-6">
                        <TextInput 
                            className="bg-white dark:bg-dark-bg p-4 rounded-xl border border-gray-200 dark:border-gray-700 font-rubik-medium text-gray-900 dark:text-white mb-4"
                            placeholder="Enter Question"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            value={currentQ.question}
                            onChangeText={t => setCurrentQ({...currentQ, question: t})}
                        />
                        
                        <TouchableOpacity onPress={pickQuestionImage} className="mb-6 flex-row items-center">
                            <View className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-lg items-center justify-center border border-gray-300 dark:border-gray-600 mr-3">
                                {qImage ? (
                                     <Image source={{ uri: qImage }} className="w-full h-full rounded-lg" />
                                ) : (
                                     <Ionicons name="image" size={20} color="#9CA3AF" />
                                )}
                            </View>
                            <Text className="text-coral font-rubik-medium">{qImage ? 'Change Image' : 'Add Image (Optional)'}</Text>
                        </TouchableOpacity>

                        <Text className="label mb-2 font-rubik-medium text-gray-700 dark:text-gray-300">Options</Text>
                        {[0, 1, 2, 3].map(idx => (
                            <TextInput 
                                key={idx}
                                className="bg-white dark:bg-dark-bg p-3 rounded-xl border border-gray-200 dark:border-gray-700 font-rubik text-gray-900 dark:text-white mb-3"
                                placeholder={`Option ${idx + 1}`}
                                placeholderTextColor="#9CA3AF"
                                value={currentQ.options?.[idx]}
                                onChangeText={t => {
                                    const newOpts = [...(currentQ.options || [])];
                                    newOpts[idx] = t;
                                    setCurrentQ({...currentQ, options: newOpts});
                                }}
                            />
                        ))}

                        <Text className="label mb-2 font-rubik-medium text-gray-700 dark:text-gray-300 mt-2">Correct Answer</Text>
                        <View className="flex-row flex-wrap gap-2 mb-6">
                            {currentQ.options?.map((opt, idx) => (
                                opt ? (
                                    <TouchableOpacity 
                                        key={idx}
                                        onPress={() => setCurrentQ({...currentQ, correctAnswer: opt})}
                                        className={`px-4 py-2 rounded-full border ${currentQ.correctAnswer === opt ? 'bg-green-100 border-green-500' : 'bg-white border-gray-300'}`}
                                    >
                                        <Text className={currentQ.correctAnswer === opt ? 'text-green-700 font-rubik-medium' : 'text-gray-600'}>{opt}</Text>
                                    </TouchableOpacity>
                                ) : null
                            ))}
                        </View>
                    </ScrollView>
                    <View className="p-6 border-t border-gray-200 dark:border-gray-700">
                        <TouchableOpacity onPress={addManualQuestion} className="bg-coral py-4 rounded-xl items-center">
                            <Text className="text-white font-rubik-bold text-lg">Add to Quiz</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}
