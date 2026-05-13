import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Access variables using bracket notation to bypass some strict environment errors
const supabaseUrl = process['env']['EXPO_PUBLIC_SUPABASE_URL'] as string;
const supabaseAnonKey = process['env']['EXPO_PUBLIC_SUPABASE_ANON_KEY'] as string;

// Fallback check to help you debug during development
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "ERROR: Supabase credentials not found. Check your .env file and restart Expo with 'npx expo start -c'"
  );
}

// Initialize the Supabase Client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// --- TypeScript Types for your App ---

export type Profile = {
  id: string;
  username: string;
  avatar_url?: string;
  chef_title: string;
  recipes_cooked: number;
  updated_at: string;
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