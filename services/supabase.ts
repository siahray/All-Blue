import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Robust storage adapter for Expo/React Native/Web
const memoryStorage: Record<string, string> = {};

const ExpoStorageAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    }
    try {
      // Check if AsyncStorage native module exists
      if (!AsyncStorage) return memoryStorage[key] || null;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('AsyncStorage not available, using memory:', e);
      return memoryStorage[key] || null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return;
    }
    try {
      if (!AsyncStorage) {
        memoryStorage[key] = value;
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      memoryStorage[key] = value;
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return;
    }
    try {
      if (!AsyncStorage) {
        delete memoryStorage[key];
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      delete memoryStorage[key];
    }
  },
};

const supabaseUrl = process['env']['EXPO_PUBLIC_SUPABASE_URL'] as string;
const supabaseAnonKey = process['env']['EXPO_PUBLIC_SUPABASE_ANON_KEY'] as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "ERROR: Supabase credentials not found. Check your .env file and restart Expo with 'npx expo start -c'"
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: ExpoStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Memory cache for active session to completely avoid AsyncStorage thread locks on Android resumption
export let cachedSession: any = null;

// Initialize and keep updated
supabase.auth.getSession().then(({ data: { session } }) => {
  cachedSession = session;
});

supabase.auth.onAuthStateChange((_event, session) => {
  cachedSession = session;
});

// A robust Promise racing utility to guarantee database queries never hang indefinitely on Android
export async function withTimeout<T>(promise: PromiseLike<T> | Promise<T>, timeoutMs = 15000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Network request timed out. Please pull to refresh or reload the app.'));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- TypeScript Types for your App ---

export type Profile = {
  id: string;
  username: string;
  avatar_url?: string;
  chef_title: string;
  recipes_cooked: number;
  updated_at: string;
  is_private?: boolean;
  hide_likes?: boolean;
};

export type InventoryItem = {
  id: string;
  user_id?: string;
  name: string;
  category: 
    | 'Poultry' 
    | 'Vegetables' 
    | 'Fruits' 
    | 'Meat' 
    | 'Beef' 
    | 'Seafood' 
    | 'Dairy' 
    | 'Grains' 
    | 'Condiments' 
    | 'Other';
  quantity: string;
  image_url?: string;
  created_at: string;
};