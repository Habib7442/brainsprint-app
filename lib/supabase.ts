import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Helper to chunk large values
const CHUNK_SIZE = 2000;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') return null;
      
      // Try to get chunk count
      const count = await SecureStore.getItemAsync(`${key}_chunks`);
      
      if (count) {
        // It's a chunked value
        const numChunks = parseInt(count, 10);
        let jwt = '';
        for (let i = 0; i < numChunks; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
          if (chunk) jwt += chunk;
        }
        return jwt;
      } else {
        // Fallback for non-chunked legacy values
        return await SecureStore.getItemAsync(key);
      }
    } catch (e) {
      console.warn('SecureStore adapter error:', e);
      return null;
    }
  },

  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') return;

      // Clean up old chunks first just in case
      await SecureStore.deleteItemAsync(`${key}_chunks`);
      await SecureStore.deleteItemAsync(key); // Clear non-chunked version

      if (value.length > CHUNK_SIZE) {
        const numChunks = Math.ceil(value.length / CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunks`, `${numChunks}`);

        for (let i = 0; i < numChunks; i++) {
          const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}_${i}`, chunk);
        }
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      console.warn('SecureStore adapter error:', e);
    }
  },

  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') return;
      
      const count = await SecureStore.getItemAsync(`${key}_chunks`);
      if (count) {
        const numChunks = parseInt(count, 10);
        for (let i = 0; i < numChunks; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_chunks`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore adapter error:', e);
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? localStorage : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    debug: false, // Set to true only if debugging auth issues
  },
});
